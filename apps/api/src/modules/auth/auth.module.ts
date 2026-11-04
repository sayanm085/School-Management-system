import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";

import { requireEnvValue, type Env } from "../../config/env";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { MfaService } from "./mfa.service";
import { PasswordService } from "./password.service";
import { SessionService } from "./session.service";
import { TokenService } from "./token.service";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: requireEnvValue(config, "JWT_ACCESS_SECRET"),
        signOptions: {
          expiresIn: requireEnvValue(config, "ACCESS_TOKEN_TTL_SECONDS"),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    MfaService,
    PasswordService,
    SessionService,
    TokenService,
  ],
  exports: [AuthService, PasswordService, SessionService, TokenService],
})
export class AuthModule {}
