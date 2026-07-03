import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { asc, eq } from "drizzle-orm";
import { createDatabase, reports, sessions, transcriptTurns } from "@rehearsal/database";
import { env } from "./config/env.js";
import { BedrockService } from "./lib/bedrock.js";

const { db, pool } = createDatabase(env.DATABASE_URL);
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const credentials = env.BEDROCK_AWS_ACCESS_KEY_ID && env.BEDROCK_AWS_SECRET_ACCESS_KEY
  ? { accessKeyId: env.BEDROCK_AWS_ACCESS_KEY_ID, secretAccessKey: env.BEDROCK_AWS_SECRET_ACCESS_KEY } : undefined;
const bedrock = new BedrockService(env.BEDROCK_REPORT_MODEL_ID, env.BEDROCK_AWS_REGION, credentials);

const worker = new Worker("reports", async (job) => {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, job.data.sessionId),
    with: { transcriptTurns: { orderBy: [asc(transcriptTurns.sequence)] } }
  });
  if (!session) throw new Error("Session not found");
  const transcript = session.transcriptTurns.map((turn) => `${turn.speaker}: ${turn.content}`).join("\n");
  const report = await bedrock.generateReport(`Type: ${session.type}\nRole: ${session.targetRole}\nTranscript:\n${transcript}`);
  await db.transaction(async (tx) => {
    await tx.insert(reports).values({ sessionId: session.id, ...report }).onConflictDoUpdate({ target: reports.sessionId, set: report });
    await tx.update(sessions).set({ status: "report_ready" }).where(eq(sessions.id, session.id));
  });
}, { connection, concurrency: 2 });

async function shutdown() {
  await worker.close();
  await connection.quit();
  await pool.end();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
