import { Router } from "express";
import { otpSignin } from "./controller/otpSignin";
import { verifyOtp } from "./controller/verifyOtp";
import { createUser } from "./controller/createUser";
import { getUsers } from "./controller/getUsers";
import { allowRoles } from "../../middleware/allowedRolesMiddleware";
import { authenticateUser } from "../../middleware/JWTAuthMiddleware";
import { changeRole } from "./controller/changeRole";

const router = Router();

router.post("/signup", otpSignin);
router.post("/verify-otp", verifyOtp);
router.post("/create-user", createUser);
router.get(
  "/get-users",
  authenticateUser,
  allowRoles(["ADMIN", "ANALYST"]),
  getUsers,
);
router.patch(
  "/change-role/:id",
  authenticateUser,
  allowRoles(["ADMIN"]),
  changeRole,
);

export default router;
