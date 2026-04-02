import type { Request, Response } from "express";
import { otpSigninReqSchema } from "../../../types/userLogin.type.js";
import { generateOTP, hashOTP } from "../../../util/otp/otp.js";
import { setOtpKey } from "../../../util/otp/setOtpKey.js";
import prisma from "../../../db/prisma.js";
import { sendOtpEmail } from "../../../util/otp/sendEmail.js";

export const otpSignin = async (req: Request, res: Response) => {
  try {
    const parsed = otpSigninReqSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request schema",
      });
    }

    const { email } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User already exists",
      });
    }

    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    if (otp.length !== 6 || !hashedOtp) {
      return res.status(400).json({
        success: false,
        error: "Invalid OTP",
      });
    }

    const isKeySet = await setOtpKey(email, hashedOtp);
    if (!isKeySet) {
      return res.status(500).json({
        success: false,
        error: "Failed to set OTP key",
      });
    }

    const isEmailSent = await sendOtpEmail(email, otp);
    if (!isEmailSent) {
      return res.status(500).json({
        success: false,
        error: "Failed to send OTP email",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent",
      data: {
        otp,
      },
    });
  } catch (error) {
    console.error("OTP signin error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to send OTP",
    });
  }
};
