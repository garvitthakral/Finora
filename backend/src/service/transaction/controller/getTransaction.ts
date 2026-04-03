import type { Request, Response } from "express";
import prisma from "../../../db/prisma";
import { transactionQuerySchema } from "../../../types/transaction/getTransactionQuery.type";
import { Prisma } from "@prisma/client";

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const { id: userId, role } = req.user!;

    if (role === "VIEWER" || role === "ANALYST") {
      return res.status(403).json({
        success: false,
        error: "You do not have permission to get transactions",
      });
    }

    const parsedQuery = transactionQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid query parameters",
        details: parsedQuery.error.issues,
      });
    }

    const {
      page = "1",
      limit = "10",
      type,
      category,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      sortBy = "transactionDate",
      order = "desc",
    } = parsedQuery.data;

    const pageNumber = Number(page ?? 1);
    const pageSize = Number(limit ?? 10);

    if (!Number.isFinite(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        success: false,
        error: "page must be a positive integer",
      });
    }

    if (!Number.isFinite(pageSize) || pageSize < 1 || pageSize > 100) {
      return res.status(400).json({
        success: false,
        error: "limit must be a positive integer between 1 and 100",
      });
    }

    const filters: any = {
      userId,
      deletedAt: null,
    };

    if (type) {
      filters.type = type;
    }

    if (category) {
      filters.category = category;
    }

    if (minAmount || maxAmount) {
      const amountFilter: any = {};

      if (minAmount) {
        const numberMin = Number(minAmount);
        if (!Number.isFinite(numberMin) || numberMin < 0) {
          return res.status(400).json({
            success: false,
            error: "minAmount must be a non-negative number",
          });
        }
        amountFilter.gte = numberMin;
      }

      if (maxAmount) {
        const numberMax = Number(maxAmount);
        if (!Number.isFinite(numberMax) || numberMax < 0) {
          return res.status(400).json({
            success: false,
            error: "maxAmount must be a non-negative number",
          });
        }
        amountFilter.lte = numberMax;
      }

      if (
        amountFilter.gte !== undefined &&
        amountFilter.lte !== undefined &&
        amountFilter.gte > amountFilter.lte
      ) {
        return res.status(400).json({
          success: false,
          error: "minAmount cannot be greater than maxAmount",
        });
      }

      filters.amount = amountFilter;
    }

    if (startDate || endDate) {
      const dateFilter: any = {};

      if (startDate) {
        const parsedStart = new Date(startDate as string);
        if (isNaN(parsedStart.getTime())) {
          return res.status(400).json({
            success: false,
            error: "Invalid startDate format",
          });
        }
        dateFilter.gte = parsedStart;
      }

      if (endDate) {
        const parsedEnd = new Date(endDate as string);
        if (isNaN(parsedEnd.getTime())) {
          return res.status(400).json({
            success: false,
            error: "Invalid endDate format",
          });
        }
        dateFilter.lte = parsedEnd;
      }

      if (dateFilter.gte && dateFilter.lte && dateFilter.gte > dateFilter.lte) {
        return res.status(400).json({
          success: false,
          error: "startDate must be before or equal to endDate",
        });
      }

      filters.transactionDate = dateFilter;
    }

    const instance = await prisma.$transaction(async (tx) => {
      const transactions = await tx.transaction.findMany({
        where: filters,
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        orderBy: {
          [sortBy as string]: order === "asc" ? "asc" : "desc",
        },
      });

      const total = await tx.transaction.count({
        where: filters,
      });

      return { transactions, total };
    });

    const resData = {
      transactions: instance.transactions,
      total: instance.total,
      page: pageNumber,
      totalPages: Math.ceil(instance.total / pageSize),
    };

    return res.status(200).json({
      success: true,
      message: "Transactions fetched successfully",
      data: resData,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);

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
