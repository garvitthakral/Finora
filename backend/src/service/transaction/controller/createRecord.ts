import type { Request, Response } from "express";
import { CreateTransactionReqSchema } from "../../../types/transaction/createTransactionReq.type";
import prisma from "../../../db/prisma";
import { Prisma } from "@prisma/client";

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const parsed = CreateTransactionReqSchema.safeParse(req.body);

    if (!parsed.success) {
      console.error("Validation error:", parsed.error);
      return res.status(400).json({
        success: false,
        error: "Invalid transaction data",
        details: parsed.error.issues,
      });
    }

    const { amount, type, notes, date, category } = parsed.data;
    const { id: userId, role } = req.user!;

    if (role === "VIEWER" || role === "ANALYST") {
      return res.status(403).json({
        success: false,
        error: "You do not have permission to create transactions",
      });
    }

    const transactionDate = new Date(date);
    if (isNaN(transactionDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format",
      });
    }

    if (type === "EXPENSE" && amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Expense amount must be positive",
      });
    }

    const monthStart = new Date(
      transactionDate.getFullYear(),
      transactionDate.getMonth(),
      1,
    );

    const instance = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          amount: amount,
          type: type,
          notes: notes,
          transactionDate: transactionDate,
          category: category,
          userId: userId,
        },
      });

      const monthlySummary = await tx.userMonthlySummary.upsert({
        where: {
          userId_month: {
            userId,
            month: monthStart,
          },
        },
        create: {
          userId,
          month: monthStart,
          totalIncome: type === "INCOME" ? amount : 0,
          totalExpense: type === "EXPENSE" ? amount : 0,
          netBalance: type === "INCOME" ? amount : -amount,
          transactionCount: 1,
        },
        update: {
          totalIncome: type === "INCOME" ? { increment: amount } : undefined,
          totalExpense: type === "EXPENSE" ? { increment: amount } : undefined,
          netBalance:
            type === "INCOME" ? { increment: amount } : { decrement: amount },
          transactionCount: { increment: 1 },
        },
      });

      const categorySummary = await tx.userCategorySummary.upsert({
        where: {
          userId_category: {
            userId,
            category,
          },
        },
        create: {
          userId,
          category,
          totalIncome: type === "INCOME" ? amount : 0,
          totalExpense: type === "EXPENSE" ? amount : 0,
          transactionCount: 1,
        },
        update: {
          totalIncome: type === "INCOME" ? { increment: amount } : undefined,
          totalExpense: type === "EXPENSE" ? { increment: amount } : undefined,
          transactionCount: { increment: 1 },
        },
      });

      return { transaction, monthlySummary, categorySummary };
    });

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: instance,
    });
  } catch (error) {
    console.error("Error creating transaction:", error);

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

    // Generic error
    res.status(500).json({
      success: false,
      error: "Failed to create transaction",
    });
  }
};
