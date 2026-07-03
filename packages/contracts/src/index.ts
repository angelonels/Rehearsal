import { z } from "zod";

export const interviewTypes = ["BEHAVIORAL", "TECHNICAL", "SYSTEM_DESIGN", "CULTURE_FIT"] as const;
export const interviewTypeSchema = z.enum(interviewTypes);
export type InterviewType = z.infer<typeof interviewTypeSchema>;

export const experienceLevels = ["ENTRY", "MID", "SENIOR", "LEAD"] as const;
export const experienceLevelSchema = z.enum(experienceLevels);
export type ExperienceLevel = z.infer<typeof experienceLevelSchema>;

export const sessionStatuses = ["CREATED", "ACTIVE", "PROCESSING", "COMPLETED", "FAILED"] as const;
export const sessionStatusSchema = z.enum(sessionStatuses);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export const transcriptTurnSchema = z.object({
  id: z.string(),
  speaker: z.enum(["candidate", "interviewer"]),
  text: z.string(),
  timestamp: z.string(),
});
export type TranscriptTurn = z.infer<typeof transcriptTurnSchema>;

export const reportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  categoryScores: z.array(z.object({
    category: z.string(),
    score: z.number().min(0).max(100),
    feedback: z.string(),
  })),
  moments: z.array(z.object({
    quote: z.string(),
    feedback: z.string(),
    kind: z.enum(["strength", "improvement"]),
  })),
  nextSteps: z.array(z.string()),
});
export type InterviewReport = z.infer<typeof reportSchema>;

export type ApiEnvelope<T> = { data: T; meta?: Record<string, unknown> };
export type ApiErrorEnvelope = {
  error: { code: string; message: string; requestId?: string; details?: unknown };
};

