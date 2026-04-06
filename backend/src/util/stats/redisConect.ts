import { redisConnection } from "../../db/redis.config";

export async function getCache(key: string) {
  try {
    const data: string | null = await redisConnection.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("Redis GET failed:", err);
    return null;
  }
}

export async function setCache(
  key: string,
  value: unknown,
  ttlSeconds: number,
) {
  try {
    await redisConnection.set(key, JSON.stringify(value),{ex: ttlSeconds});
  } catch (err) {
    console.error("Redis SET failed:", err);
  }
}
