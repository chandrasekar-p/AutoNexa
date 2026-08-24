import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomUUID, createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

// Shape of a User loaded with `roles -> role -> permissions -> permission`.
// Kept as a hand-written interface (rather than relying on Prisma's
// generated payload types) so this file type-checks even before `prisma
// generate` has run against the full schema in a given environment.
interface UserWithRolePermissions {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  passwordHash: string;
  roles: Array<{
    role: {
      name: string;
      isSystem: boolean;
      permissions: Array<{ permission: { resource: string; action: string } }>;
    };
  }>;
}

function isSuperAdminUser(user: UserWithRolePermissions): boolean {
  return user.roles.some((ur) => ur.role.name === 'Super Admin' && ur.role.isSystem);
}

function flattenPermissions(user: UserWithRolePermissions): string[] {
  return Array.from(
    new Set(
      user.roles.flatMap((ur) =>
        ur.role.permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`),
      ),
    ),
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto, meta: { ip?: string; userAgent?: string }) {
    // Login happens before any tenant context exists, so it deliberately
    // uses the unscoped `platform` client — this is the one legitimate
    // place tenant resolution happens by hand, from the slug the user typed.
    const tenant = await this.prisma.platform.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });
    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException('Invalid workshop, email, or password');
    }

    const user = await this.prisma.platform.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: dto.email } },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Invalid workshop, email, or password');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid workshop, email, or password');
    }

    const isSuperAdmin = isSuperAdminUser(user);
    const permissions = flattenPermissions(user);

    const tokens = await this.issueTokens(
      { userId: user.id, tenantId: tenant.id, email: user.email, permissions, isSuperAdmin },
      meta,
    );

    await this.prisma.platform.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: tenant.id,
        roles: user.roles.map((ur: UserWithRolePermissions['roles'][number]) => ur.role.name),
      },
    };
  }

  /**
   * Rotating refresh: the presented token must be an unrevoked, unexpired
   * member of its family. On success we revoke it and issue a new one in
   * the same family. If a caller ever presents an already-revoked token,
   * that's a signal of token theft/reuse — we revoke the ENTIRE family,
   * forcing re-login everywhere that family's tokens were valid.
   */
  async refresh(rawRefreshToken: string, meta: { ip?: string; userAgent?: string }) {
    if (!rawRefreshToken) throw new UnauthorizedException('Missing refresh token');

    const tokenHash = hashToken(rawRefreshToken);
    const stored = await this.prisma.platform.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: { include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } } },
    });

    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    if (stored.revokedAt) {
      // Reuse of a revoked token — kill the whole family.
      await this.prisma.platform.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected — please log in again');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = stored.user;

    // A deactivated/deleted account must not be able to mint a fresh access
    // token just because its refresh token hasn't expired yet — mirrors the
    // same check login() already does. Also revoke the whole token family
    // here (not just this one token) so a deactivated user can't keep
    // refreshing from a different already-issued token in the same family.
    if (!user.isActive || user.deletedAt) {
      await this.prisma.platform.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Account is no longer active — please contact your workshop admin');
    }

    const isSuperAdmin = isSuperAdminUser(user);
    const permissions = flattenPermissions(user);

    const tokens = await this.issueTokens(
      { userId: user.id, tenantId: user.tenantId, email: user.email, permissions, isSuperAdmin },
      meta,
      stored.familyId,
    );

    await this.prisma.platform.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedBy: tokens.refreshToken.slice(0, 12) },
    });

    return tokens;
  }

  async logout(rawRefreshToken: string) {
    if (!rawRefreshToken) return;
    const tokenHash = hashToken(rawRefreshToken);
    await this.prisma.platform.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(
    claims: {
      userId: string;
      tenantId: string;
      email: string;
      permissions: string[];
      isSuperAdmin: boolean;
    },
    meta: { ip?: string; userAgent?: string },
    familyId: string = randomUUID(),
  ): Promise<IssuedTokens> {
    const accessExpiresIn = this.config.get<string>('jwt.accessExpiresIn')!;
    const refreshExpiresIn = this.config.get<string>('jwt.refreshExpiresIn')!;

    const accessToken = await this.jwt.signAsync(
      {
        sub: claims.userId,
        tenantId: claims.tenantId,
        email: claims.email,
        permissions: claims.permissions,
        isSuperAdmin: claims.isSuperAdmin,
      },
      { secret: this.config.get<string>('jwt.accessSecret'), expiresIn: accessExpiresIn },
    );

    const rawRefreshToken = randomUUID() + randomUUID();
    const tokenHash = hashToken(rawRefreshToken);

    await this.prisma.platform.refreshToken.create({
      data: {
        userId: claims.userId,
        tokenHash,
        familyId,
        expiresAt: addDuration(new Date(), refreshExpiresIn),
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken, expiresIn: accessExpiresIn };
  }
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

// Minimal "15m" / "30d" duration parser — swap for a library (e.g. ms) in
// production if more formats are needed.
function addDuration(base: Date, spec: string): Date {
  const match = spec.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Unsupported duration format: ${spec}`);
  const [, amountStr, unit] = match;
  const amount = parseInt(amountStr, 10);
  const multiplier = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
  return new Date(base.getTime() + amount * multiplier);
}
