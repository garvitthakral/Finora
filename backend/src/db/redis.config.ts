import "dotenv/config";
import { Redis } from "@upstash/redis";

const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = process.env.REDIS_PORT || "6379";

if (!redisHost || !redisPort) {
  throw new Error("Missing Redis environment variables");
}

export const redisConnection = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});