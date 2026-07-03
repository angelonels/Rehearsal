import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv({ path: new URL("../../../.env", import.meta.url) });
const schema = z.object({
  DATABASE_URL: z.string().default("postgresql://rehearsal:rehearsal@localhost:5432/rehearsal"),
  LIVEKIT_URL: z.string().default("ws://localhost:7880"),
  LIVEKIT_API_KEY: z.string().default("devkey"),
  LIVEKIT_API_SECRET: z.string().default("secret"),
  DEEPGRAM: z.string().min(1),
  BEDROCK_AWS_REGION: z.string().default("us-east-1"),
  BEDROCK_AWS_ACCESS_KEY_ID: z.string().optional(),
  BEDROCK_AWS_SECRET_ACCESS_KEY: z.string().optional(),
  BEDROCK_CHAT_MODEL_ID: z.string().default("openai.gpt-oss-20b-1:0")
});
export const config = schema.parse(process.env);
process.env.LIVEKIT_URL ??= config.LIVEKIT_URL;
process.env.LIVEKIT_API_KEY ??= config.LIVEKIT_API_KEY;
process.env.LIVEKIT_API_SECRET ??= config.LIVEKIT_API_SECRET;
