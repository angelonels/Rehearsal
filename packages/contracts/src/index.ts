import { z } from "zod";

export const interviewTypes = ["behavioral", "technical", "system_design", "culture_fit"] as const;
export const interviewTypeSchema = z.enum(interviewTypes);
export type InterviewType = z.infer<typeof interviewTypeSchema>;

export const experienceLevels = ["entry", "mid", "senior", "lead"] as const;
export const experienceLevelSchema = z.enum(experienceLevels);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
  jobRole: z.string().trim().min(2).max(100),
  experienceLevel: experienceLevelSchema
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128)
});

export const createSessionSchema = z.object({
  type: interviewTypeSchema,
  targetRole: z.string().trim().min(2).max(100).optional(),
  durationMinutes: z.number().int().min(10).max(60).default(30)
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export type ApiEnvelope<T> = { data: T };
export type ApiError = { error: { code: string; message: string; requestId?: string; details?: unknown } };
