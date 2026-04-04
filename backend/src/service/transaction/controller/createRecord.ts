import type { Request, Response } from "express";
import { CreateTransactionReqSchema } from "../../../types/transaction/createTransactionReq.type";
import prisma from "../../../db/prisma";
import { Prisma } from "@prisma/client";
import { deleteDashboardKeys } from "../../../util/transaction/deleteCacheKey";

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

    const { amount, type, notes, date, category, userId } = parsed.data;
    const { role } = req.user!;

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

    const nextMonthStart = new Date(
      transactionDate.getFullYear(),
      transactionDate.getMonth() + 1,
      1,
    );

    const dayStart = new Date(transactionDate);
    dayStart.setHours(0, 0, 0, 0);

    const nextDay = new Date(dayStart);
    nextDay.setDate(dayStart.getDate() + 1);

    const instance = await prisma.$transaction(async (tx) => {
      const existingTransaction = await tx.transaction.findFirst({
        where: {
          userId,
          transactionDate: {
            gte: dayStart,
            lt: nextDay,
          },
        },
        select: { id: true },
      });

      const isFirstTransactionOfDay = !existingTransaction;

      const transaction = await tx.transaction.create({
        data: {
          amount: amount,
          type: type,
          notes: notes,
          transactionDate: transactionDate,
          category: category,
          userId: userId,
          isFirstTransactionOfDay,
        },
      });

      // monthly summary calculations
      const existingMonthly = await tx.userMonthlySummary.findUnique({
        where: {
          userId_month: {
            userId,
            month: monthStart,
          },
        },
      });

      const newHighestExpense =
        type === "EXPENSE"
          ? Math.max(Number(existingMonthly?.highestExpense ?? 0), amount)
          : (existingMonthly?.highestExpense ?? 0);

      const categoryTotals = await tx.transaction.groupBy({
        by: ["category"],
        where: {
          userId,
          type: "EXPENSE",
          transactionDate: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
        _sum: {
          amount: true,
        },
        orderBy: {
          _sum: {
            amount: "desc",
          },
        },
        take: 1,
      });

      const largestCategory = categoryTotals[0]?.category ?? null;

      const newTotalExpense =
        Number(existingMonthly?.totalExpense ?? 0) +
        (type === "EXPENSE" ? amount : 0);

      const newActiveExpenseDays =
        (existingMonthly?.activeExpenseDays ?? 0) +
        (type === "EXPENSE" && isFirstTransactionOfDay ? 1 : 0);

      const newDailyAvgSpend =
        newActiveExpenseDays > 0 ? newTotalExpense / newActiveExpenseDays : 0;

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
          largestCategory,
          avgDailySpend: newDailyAvgSpend,
          highestExpense: newHighestExpense,
          activeExpenseDays: type === "EXPENSE" ? 1 : 0,
        },
        update: {
          totalIncome: type === "INCOME" ? { increment: amount } : undefined,
          totalExpense: type === "EXPENSE" ? { increment: amount } : undefined,
          netBalance:
            type === "INCOME" ? { increment: amount } : { decrement: amount },
          transactionCount: { increment: 1 },
          highestExpense: newHighestExpense,
          largestCategory,
          avgDailySpend: newDailyAvgSpend,
        },
      });

      // category summary calculations

      const existingCategory = await tx.userCategorySummary.findUnique({
        where: {
          userId_category: {
            userId,
            category,
          },
        },
      });

      const newHighestTransaction = Math.max(
        Number(existingCategory?.highestTransaction ?? 0),
        amount,
      );

      const newTransactionCount = (existingCategory?.transactionCount ?? 0) + 1;

      const newCategoryTotalExpense =
        Number(existingCategory?.totalExpense ?? 0) +
        (type === "EXPENSE" ? amount : 0);

      const averageTransaction =
        newTransactionCount > 0
          ? newCategoryTotalExpense / newTransactionCount
          : 0;

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
          averageTransaction: amount,
          highestTransaction: amount,
        },
        update: {
          totalIncome: type === "INCOME" ? { increment: amount } : undefined,
          totalExpense: type === "EXPENSE" ? { increment: amount } : undefined,
          transactionCount: { increment: 1 },
          averageTransaction,
          highestTransaction: newHighestTransaction,
        },
      });

      return { transaction, monthlySummary, categorySummary };
    });

    const isKeyRemoved = await deleteDashboardKeys(userId);

    if (!isKeyRemoved) {
      console.warn(`Failed to delete dashboard cache keys for user ${userId}`);
    }

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

    res.status(500).json({
      success: false,
      error: "Failed to create transaction",
    });
  }
};
