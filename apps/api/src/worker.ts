import { Worker } from "bullmq";
import { asc, eq } from "drizzle-orm";
import pino from "pino";
import { createDatabase, reports, sessions, transcriptTurns } from "@rehearsal/database";
import { env } from "./config/env.js";
import { BedrockService } from "./lib/bedrock.js";
import { generateSessionReport } from "./modules/reports/service.js";
import { redisConnection } from "./queues.js";

const { db, pool } = createDatabase(env.DATABASE_URL);
const logger = pino();
const connection = redisConnection(env.REDIS_URL);
const credentials = env.BEDROCK_AWS_ACCESS_KEY_ID && env.BEDROCK_AWS_SECRET_ACCESS_KEY
  ? { accessKeyId: env.BEDROCK_AWS_ACCESS_KEY_ID, secretAccessKey: env.BEDROCK_AWS_SECRET_ACCESS_KEY } : undefined;
const bedrock = new BedrockService(env.BEDROCK_REPORT_MODEL_ID, env.BEDROCK_AWS_REGION, credentials);

const worker = new Worker("reports", async (job) => {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, job.data.sessionId),
    with: { transcriptTurns: { orderBy: [asc(transcriptTurns.sequence)] } }
  });
  if (!session) throw new Error("Session not found");
  const report = await generateSessionReport(session, bedrock);
  await db.transaction(async (tx) => {
    await tx.insert(reports).values({ sessionId: session.id, ...report }).onConflictDoUpdate({ target: reports.sessionId, set: report });
    await tx.update(sessions).set({ status: "report_ready" }).where(eq(sessions.id, session.id));
  });
}, { connection, concurrency: 2 });

worker.on("failed", async (job, error) => {
  if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;
  logger.error({ err: error, sessionId: job.data.sessionId }, "report generation failed after retries");
  await db.update(sessions).set({ status: "failed" }).where(eq(sessions.id, job.data.sessionId));
});

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  await worker.close();
  await pool.end();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
