import { redisConnection } from "../../db/redis.config";

const OTP_TTL_SECONDS = 300;

const isSha256Hex = (value: string): boolean => /^[a-f0-9]{64}$/i.test(value);

export const normalizeEmailForOtpKey = (email: string): string => {
  const normalized = email.trim().toLowerCase();

  return encodeURIComponent(normalized);
};

export const setOtpKey = async (
  email: string,
  hashedOTP: string,
): Promise<boolean> => {
  if (typeof email !== "string" || email.trim().length === 0) {
    return false;
  }
  if (typeof hashedOTP !== "string" || !isSha256Hex(hashedOTP)) {
    return false;
  }

  const key = `otp:${normalizeEmailForOtpKey(email)}`;

  const existingKey = await redisConnection.get(key);
  if (existingKey) {
    await redisConnection.del(key);
  }

  try {
    const result = await redisConnection.set(
      key,
      hashedOTP,
      "EX",
      OTP_TTL_SECONDS,
    );

    if (result !== "OK") {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error setting OTP in Redis:", error);
    return false;
  }
};
