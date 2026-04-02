import type { Request, Response } from "express";
import { VerifyOtpReqSchema } from "../../../types/userLogin.type.js";
import { hashOTP } from "../../../util/otp/otp.js";
import { redisConnection } from "../../../db/redis.config.js";
import { normalizeEmailForOtpKey } from "../../../util/otp/setOtpKey.js";

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const parsed = VerifyOtpReqSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request schema",
      });
    }

    const { email, otp } = parsed.data;

    const hashedOTP = hashOTP(otp);
    if (!hashedOTP) {
      return res.status(400).json({
        success: false,
        error: "Invalid OTP",
      });
    }

    const key = `otp:${normalizeEmailForOtpKey(email)}`;

    const storedHash = await redisConnection.get(key);

    if (!storedHash) {
      return res.status(400).json({
        success: false,
        error: "OTP not found",
      });
    }

    if (storedHash !== hashedOTP) {
      return res.status(400).json({
        success: false,
        error: "Invalid OTP",
      });
    }

    await redisConnection.del(key);

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to verify OTP",
    });
  }
};
