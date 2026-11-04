import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";

import { AuditModule } from "./common/audit/audit.module";
import { AuthGuard } from "./common/authz/auth.guard";
import { AuthzModule } from "./common/authz/authz.module";
import { PermissionsGuard } from "./common/authz/permissions.guard";
import { IdempotencyInterceptor } from "./common/idempotency/idempotency.interceptor";
import { IdempotencyModule } from "./common/idempotency/idempotency.module";
import { validateEnv } from "./config/env";
import { DatabaseModule } from "./db/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AuditLogModule } from "./modules/audit/audit.module";
import { HealthModule } from "./modules/health/health.module";
import { OpenApiModule } from "./modules/openapi/openapi.module";
import { SchoolModule } from "./modules/school/school.module";
import { StaffModule } from "./modules/staff/staff.module";
import { StudentsModule } from "./modules/students/students.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      envFilePath: [".env.local", ".env"],
    }),
    DatabaseModule,
    AuditModule,
    AuthzModule,
    IdempotencyModule,
    AuthModule,
    HealthModule,
    AuditLogModule,
    StaffModule,
    SchoolModule,
    StudentsModule,
    OpenApiModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule {}
