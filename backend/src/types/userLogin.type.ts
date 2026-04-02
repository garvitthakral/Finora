import { z } from "zod";

export const otpSigninReqSchema = z.object({
  email: z.string(),
});

export type OtpSigninReqData = z.infer<typeof otpSigninReqSchema>;

export const VerifyOtpReqSchema = z.object({
  email: z.string(),
  otp: z.string().min(6).max(6),
});

export type VerifyOtpReqData = z.infer<typeof VerifyOtpReqSchema>;

export const CreateUserReqSchema = z.object({
  email: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["VIEWER", "ANALYST", "ADMIN"]).default("VIEWER"),
});

export type CreateUserReqData = z.infer<typeof CreateUserReqSchema>;
