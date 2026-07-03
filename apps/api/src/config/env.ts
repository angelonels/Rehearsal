import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().default("postgresql://rehearsal:rehearsal@localhost:5432/rehearsal"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32).default("development-only-secret-change-me-now"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  LIVEKIT_URL: z.string().default("ws://localhost:7880"),
  LIVEKIT_API_KEY: z.string().default("devkey"),
  LIVEKIT_API_SECRET: z.string().default("secret"),
  BEDROCK_AWS_REGION: z.string().default("us-east-1"),
  BEDROCK_AWS_ACCESS_KEY_ID: z.string().optional(),
  BEDROCK_AWS_SECRET_ACCESS_KEY: z.string().optional(),
  BEDROCK_CHAT_MODEL_ID: z.string().default("openai.gpt-oss-20b-1:0"),
  BEDROCK_REPORT_MODEL_ID: z.string().default("openai.gpt-oss-120b-1:0")
});

const parsed = schema.parse(process.env);
if (parsed.NODE_ENV === "production" && parsed.JWT_SECRET.startsWith("development-")) {
  throw new Error("JWT_SECRET must be configured in production");
}
export const env = parsed;
