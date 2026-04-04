import { Router } from "express";
import { authenticateUser } from "../../middleware/JWTAuthMiddleware";
import { getDashboardData } from "./controller/dashboard";

const router = Router();

router.get("/dashboard", authenticateUser, getDashboardData);

export default router;
