import crypto from "crypto";

export const generateOTP = (digits = 6): string => {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;

  return crypto.randomInt(min, max).toString();
};

export const hashOTP = (otp: string): string => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};
