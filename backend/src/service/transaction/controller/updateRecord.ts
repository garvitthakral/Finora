import type { Request, Response } from "express";
import prisma from "../../../db/prisma";
import { Prisma } from "@prisma/client";
import { UpdateTransactionReqSchema } from "../../../types/transaction/createTransactionReq.type";

export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id?: string };
    const currentUser = req.user;

    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Transaction ID is required",
      });
    }

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const { id: userId, role } = currentUser;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    if (role === "VIEWER" || role === "ANALYST") {
      return res.status(403).json({
        success: false,
        error: "You do not have permission to update this transaction",
      });
    }

    const parsedBody = UpdateTransactionReqSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid transaction data",
        details: parsedBody.error.issues,
      });
    }

    const { amount, category, type, date } = parsedBody.data;

    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found or already deleted",
      });
    }

    const updateData: Record<string, unknown> = {};

    if (amount !== undefined) updateData.amount = amount;
    if (category !== undefined) updateData.category = category;
    if (type !== undefined) updateData.type = type;

    if (date !== undefined) {
      const parsedDate = new Date(date);

      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: "Invalid date format",
        });
      }

      updateData.transactionDate = parsedDate;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No fields provided for update",
      });
    }

    const updatedTransaction = await prisma.transaction.update({
      where: {
        id,
      },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      data: updatedTransaction,
    });
  } catch (error) {
    console.error("Error updating transaction:", error);

    if (error instanceof Prisma.PrismaClientValidationError) {
      return res.status(400).json({
        success: false,
        error: "Database validation error",
      });
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return res.status(503).json({
        success: false,
        error: "Database connection error",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
