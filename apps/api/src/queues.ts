import { Queue } from "bullmq";

export function createQueues(redisUrl: string) {
  const connection = redisConnection(redisUrl);
  return { reportsQueue: new Queue("reports", { connection }) };
}

export function redisConnection(redisUrl: string) {
  const url = new URL(redisUrl);
  return { host: url.hostname, port: Number(url.port || 6379), ...(url.password ? { password: decodeURIComponent(url.password) } : {}) };
}
