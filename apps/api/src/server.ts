import { createDatabase } from "@rehearsal/database";
import { env } from "./config/env.js";
import { createQueues } from "./queues.js";
import { createApp } from "./app.js";

const { db, pool } = createDatabase(env.DATABASE_URL);
const { reportsQueue } = createQueues(env.REDIS_URL);
const app = createApp({ db, reportsQueue, config: {
  webOrigin: env.WEB_ORIGIN, jwtSecret: env.JWT_SECRET, jwtExpiresIn: env.JWT_EXPIRES_IN,
  livekitUrl: env.LIVEKIT_URL, livekitApiKey: env.LIVEKIT_API_KEY, livekitApiSecret: env.LIVEKIT_API_SECRET
} });
const server = app.listen(env.API_PORT, () => console.log(`API listening on :${env.API_PORT}`));

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close();
  await reportsQueue.close();
  await pool.end();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
