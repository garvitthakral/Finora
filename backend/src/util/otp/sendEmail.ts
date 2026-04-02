import "dotenv/config";
import transporter from "../../config/mailer.js";

export const sendOtpEmail = async (
  email: string,
  otp: string,
): Promise<boolean> => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is: ${otp}. This code will expire in 5 minutes.`,
    });

    if (!info.accepted.includes(email)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("OTP email service request failed");
    return false;
  }
};
