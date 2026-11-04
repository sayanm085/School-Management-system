import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { createZodDto, ZodValidationPipe } from "nestjs-zod";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { Public } from "../../common/authz/current-user";
import { ApiException } from "../../common/errors/api-error";
import { DatabaseService } from "../../db/database.service";

export const healthLiveSchema = z.object({
  status: z.literal("ok"),
  uptimeSeconds: z.number().int().min(0),
  timestamp: z.string().datetime(),
});

export const healthReadySchema = z.object({
  status: z.literal("ok"),
  checks: z.object({ database: z.literal("up") }),
  timestamp: z.string().datetime(),
});

export class HealthLiveDto extends createZodDto(healthLiveSchema) {}
export class HealthReadyDto extends createZodDto(healthReadySchema) {}

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Public()
  @Get("live")
  @ApiOperation({ summary: "Process liveness probe" })
  @ApiOkResponse({ type: HealthLiveDto })
  live() {
    return {
      status: "ok" as const,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get("ready")
  @ApiOperation({ summary: "Dependency readiness probe" })
  @ApiOkResponse({ type: HealthReadyDto })
  async ready() {
    try {
      await this.database.db.execute(sql`select 1`);
    } catch {
      throw new ApiException(
        503,
        "SERVICE_UNAVAILABLE",
        "The database is not reachable.",
      );
    }
    return {
      status: "ok" as const,
      checks: { database: "up" as const },
      timestamp: new Date().toISOString(),
    };
  }
}
