import { Router } from "express";
import { createTransaction } from "./controller/createRecord.js";
import { authenticateUser } from "../../middleware/JWTAuthMiddleware.js";
import { viewTransaction } from "./controller/viewRecord.js";
import { updateTransaction } from "./controller/updateRecord.js";
import { deleteTransaction } from "./controller/deleteRecord.js";
import { getTransactions } from "./controller/getTransaction.js";

const router = Router();

router.post("/create-record", authenticateUser, createTransaction);
router.get("/view-records/:id", authenticateUser, viewTransaction);
router.patch("/update-record/:id", authenticateUser, updateTransaction);
router.delete("/delete-record/:id", authenticateUser, deleteTransaction);
router.get("/get-transactions", authenticateUser, getTransactions);

export default router;
