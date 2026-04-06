import { redisConnection } from "../../db/redis.config";

export async function deleteDashboardKeys(userId: string): Promise<boolean> {
  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    console.error("Invalid userId provided for cache invalidation");
    return false;
  }

  try {
    const keys = await redisConnection.keys(`dashboard:${userId}:*`);

    if (keys.length > 0) {
      for (const key of keys) {
        console.log(`Deleting cache key: ${key}`);
        const deletedCount = await redisConnection.del(key);
        console.log(
          `Invalidated ${deletedCount} dashboard cache keys for user ${userId}`,
        );
      }
    } else {
      console.log(`No dashboard cache keys found for user ${userId}`);
    }

    return true;
  } catch (error) {
    console.error(
      `Failed to invalidate dashboard cache for user ${userId}:`,
      error,
    );
    return false;
  }
}
