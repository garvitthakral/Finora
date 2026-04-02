import { Router } from "express";
import { createTransaction } from "./controller/createRecord.js";
import { authenticateUser } from "../../middleware/JWTAuthMiddleware.js";

const router = Router();

router.post("/create-record", authenticateUser, createTransaction);
router.post("/view-records", authenticateUser, (_req, res) =>
  res.status(501).json({ success: false, error: "Not implemented" }),
);
router.post("/update-record", authenticateUser, (_req, res) =>
  res.status(501).json({ success: false, error: "Not implemented" }),
);
router.post("/delete-record", authenticateUser, (_req, res) =>
  res.status(501).json({ success: false, error: "Not implemented" }),
);
router.get("/transactions", authenticateUser, (_req, res) =>
  res.status(501).json({ success: false, error: "Not implemented" }),
);

export default router;
