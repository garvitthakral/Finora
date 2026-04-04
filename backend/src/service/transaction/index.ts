import { Router } from "express";
import { createTransaction } from "./controller/createRecord.js";
import { authenticateUser } from "../../middleware/JWTAuthMiddleware.js";
import { viewTransaction } from "./controller/viewRecord.js";
import { updateTransaction } from "./controller/updateRecord.js";
import { deleteTransaction } from "./controller/deleteRecord.js";
import { getTransactions } from "./controller/getTransaction.js";
import { allowRoles } from "../../middleware/allowedRolesMiddleware.js";

const router = Router();

router.post(
  "/create-record",
  authenticateUser,
  allowRoles(["ADMIN"]),
  createTransaction,
);
router.get(
  "/view-records/:id",
  authenticateUser,
  allowRoles(["ADMIN", "ANALYST"]),
  viewTransaction,
);
router.patch(
  "/update-record/:id",
  authenticateUser,
  allowRoles(["ADMIN"]),
  updateTransaction,
);
router.delete(
  "/delete-record/:id",
  authenticateUser,
  allowRoles(["ADMIN"]),
  deleteTransaction,
);
router.get(
  "/get-transactions",
  authenticateUser,
  allowRoles(["ADMIN", "ANALYST"]),
  getTransactions,
);

export default router;
