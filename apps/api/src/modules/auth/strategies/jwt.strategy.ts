import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

export interface AccessTokenPayload {
  sub: string; // userId
  tenantId: string;
  email: string;
  permissions: string[];
  isSuperAdmin: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret'),
    });
  }

  // Whatever this returns becomes `request.user`. Permissions are already
  // flattened into the token at issuance (see AuthService.issueTokens) so
  // this validate step is a pure signature/expiry check — no DB round trip
  // on every authenticated request.
  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
      permissions: payload.permissions,
      isSuperAdmin: payload.isSuperAdmin,
    };
  }
}
