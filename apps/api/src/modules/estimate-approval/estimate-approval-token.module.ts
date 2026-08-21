import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EstimateApprovalTokenService } from './estimate-approval-token.service';

// A second, independently-configured JwtModule registration — AuthModule's
// own JwtModule isn't exported (only AuthService is, see auth.module.ts),
// and even if it were, reusing JWT_ACCESS_SECRET for a completely
// different token purpose is exactly the mistake this is avoiding. Nest
// supports any number of separately-configured JwtService instances
// app-wide; this is the intended way to get a second one.
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('estimateApproval.secret'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [EstimateApprovalTokenService],
  exports: [EstimateApprovalTokenService],
})
export class EstimateApprovalTokenModule {}
