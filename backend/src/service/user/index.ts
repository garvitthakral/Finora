import { Router } from "express";
import { otpSignin } from "./controller/otpSignin";
import { verifyOtp } from "./controller/verifyOtp";
import { createUser } from "./controller/createUser";
import { getUsers } from "./controller/getUsers";
import { allowRoles } from "../../middleware/allowedRolesMiddleware";

const router = Router();

router.post("/signup", otpSignin);
router.post("/verify-otp", verifyOtp);
router.post("/create-user", createUser);
router.get("/users", allowRoles(["ADMIN", "ANALYST"]), getUsers);

export default router;
