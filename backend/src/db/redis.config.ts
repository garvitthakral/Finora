// import "dotenv/config";
import { Redis } from "ioredis";

const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = process.env.REDIS_PORT || "6379";

if (!redisHost || !redisPort) {
  throw new Error("Missing Redis environment variables");
}

export const redisConnection = new Redis({
  host: redisHost,
  port: Number(redisPort),
  maxRetriesPerRequest: null,
});

redisConnection.on("connect", () => {
  console.log("Redis connected");
});

redisConnection.on("error", (err) => {
  console.error("Redis error:", err);
});
