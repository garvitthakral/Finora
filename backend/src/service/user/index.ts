import { Router } from "express";
import { otpSignin } from "./controller/otpSignin";
import { verifyOtp } from "./controller/verifyOtp";
import { createUser } from "./controller/createUser";

const router = Router();

router.post("/signup", otpSignin);
router.post("/verify-otp", verifyOtp);
router.post("/create-user", createUser);

export default router;
