import { Queue } from "bullmq";
import { Redis } from "ioredis";

export function createQueues(redisUrl: string) {
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  return { reportsQueue: new Queue("reports", { connection }), connection };
}
