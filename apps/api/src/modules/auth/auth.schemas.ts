import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const platform = z.enum(["web", "android", "ios"]);

export const deviceSchema = z.object({
  id: z.uuid().optional(),
  platform: platform.default("web"),
  name: z.string().min(1).max(120).default("Browser"),
  appVersion: z.string().min(1).max(40).optional(),
});

export const loginSchema = z.object({
  schoolCode: z.string().min(3).max(32).optional(),
  employeeId: z.string().min(2).max(32),
  password: z.string().min(1).max(512),
  device: deviceSchema.optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(16).max(512).optional(),
});

export const mfaVerifySchema = z.object({
  challenge: z.string().min(16).max(4096),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
  device: deviceSchema.optional(),
});

export const mfaRecoverySchema = z.object({
  challenge: z.string().min(16).max(4096),
  recoveryCode: z.string().min(6).max(32),
  device: deviceSchema.optional(),
});

export const mfaActivateSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const mfaDisableSchema = z.object({
  code: z.string().min(6).max(10),
});

export const deviceIdSchema = z.object({
  deviceId: z.uuid(),
});

export const publicUserSchema = z.object({
  userId: z.uuid(),
  staffId: z.uuid(),
  employeeId: z.string(),
  nameEn: z.string(),
  nameBn: z.string(),
  designation: z.string(),
  role: z.enum(["headmaster", "teacher", "clerk", "management"]),
  isAssistantHeadmaster: z.boolean(),
  mfaEnabled: z.boolean(),
  permissions: z.array(z.string()),
  sectionIds: z.array(z.uuid()),
});

export const sessionSchema = z.object({
  mfaRequired: z.literal(false),
  accessToken: z.string(),
  accessExpiresInSeconds: z.number().int().positive(),
  refreshToken: z.string(),
  deviceId: z.uuid(),
  user: publicUserSchema,
});

export const mfaChallengeSchema = z.object({
  mfaRequired: z.literal(true),
  challenge: z.string(),
  expiresInSeconds: z.number().int(),
});

export const loginResponseSchema = z.union([
  sessionSchema,
  mfaChallengeSchema,
]);

export const mfaEnrollmentSchema = z.object({
  secret: z.string(),
  otpauthUrl: z.string(),
  recoveryCodes: z.array(z.string()),
});

export const deviceSchemaView = z.object({
  id: z.uuid(),
  platform: z.string(),
  name: z.string(),
  appVersion: z.string().nullable(),
  lastSeenAt: z.string(),
  current: z.boolean(),
});

export const deviceListSchema = z.object({
  data: z.array(deviceSchemaView),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type DeviceInput = z.infer<typeof deviceSchema>;

export class LoginDto extends createZodDto(loginSchema) {}
export class RefreshDto extends createZodDto(refreshSchema) {}
export class MfaVerifyDto extends createZodDto(mfaVerifySchema) {}
export class MfaRecoveryDto extends createZodDto(mfaRecoverySchema) {}
export class MfaActivateDto extends createZodDto(mfaActivateSchema) {}
export class PublicUserDto extends createZodDto(publicUserSchema) {}
export class SessionDto extends createZodDto(sessionSchema) {}
export class MfaChallengeDto extends createZodDto(mfaChallengeSchema) {}
export class MfaEnrollmentDto extends createZodDto(mfaEnrollmentSchema) {}
export class DeviceListDto extends createZodDto(deviceListSchema) {}
