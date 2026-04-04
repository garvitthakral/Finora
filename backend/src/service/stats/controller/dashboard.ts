import type { Request, Response } from "express";
import prisma from "../../../db/prisma";
import type { MonthlyTrendData } from "../../../types/stats/stats.type";
import { formatDashboardData } from "../../../util/stats/formatStats";
import { Prisma } from "@prisma/client";
import { redisConnection } from "../../../db/redis.config";
import { getCache, setCache } from "../../../util/stats/redisConect";

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const { id: userId, role } = req.user!;

    const { from, to } = req.query;

    const fromDate = typeof from === "string" ? new Date(from) : undefined;
    const toDate = typeof to === "string" ? new Date(to) : undefined;

    const dateFilter: any = {};

    if (fromDate || toDate) {
      dateFilter.transactionDate = {};

      if (fromDate) dateFilter.transactionDate.gte = fromDate;
      if (toDate) dateFilter.transactionDate.lte = toDate;
    }

    const cacheKey = `dashboard:${userId}:${fromDate ?? "all"}:${toDate ?? "all"}`;

    const cached = await getCache(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        message: "Dashboard retrieved from cache",
        data: cached,
      });
    }

    const whereClause = {
      userId,
      ...dateFilter,
    };

    const currMonth = new Date();
    const firstDayOfMonth = new Date(
      currMonth.getFullYear(),
      currMonth.getMonth(),
      1,
    );
    const nextMonth = new Date(
      currMonth.getFullYear(),
      currMonth.getMonth() + 1,
      1,
    );

    const instance = await prisma.$transaction(async (tx) => {
      const summaryData = await tx.transaction.groupBy({
        by: ["type"],
        _sum: { amount: true },
        where: whereClause,
      });

      const currMonthData = await tx.transaction.groupBy({
        by: ["type"],
        _sum: { amount: true },
        where: {
          ...whereClause,
          transactionDate: {
            gte: firstDayOfMonth,
            lt: nextMonth,
          },
        },
      });

      const categoryBreakdown = await tx.transaction.groupBy({
        by: ["category"],
        _sum: { amount: true },
        where: {
          ...whereClause,
          type: "EXPENSE",
        },
        orderBy: {
          _sum: { amount: "desc" },
        },
      });

      const recentTransactions = await tx.transaction.findMany({
        where: whereClause,
        orderBy: {
          transactionDate: "desc",
        },
        take: 5,
        select: {
          id: true,
          amount: true,
          category: true,
          type: true,
          transactionDate: true,
        },
      });

      const monthlyTrend: MonthlyTrendData[] = await tx.$queryRaw`
      SELECT
        DATE_TRUNC('month', "transactionDate") as month,
        SUM(CASE WHEN type='INCOME' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='EXPENSE' THEN amount ELSE 0 END) as expense
      FROM "Transaction"
      WHERE "userId" = ${userId}
      GROUP BY month
      ORDER BY month;
    `;

      return {
        summaryData,
        categoryBreakdown,
        recentTransactions,
        monthlyTrend,
        currMonthData,
      };
    });

    const {
      summaryData,
      categoryBreakdown,
      recentTransactions,
      monthlyTrend,
      currMonthData,
    } = instance;

    const formattedData = formatDashboardData({
      summaryData,
      categoryBreakdown,
      monthlyTrend,
      currMonthData,
      recentTransactions,
    });

    const responseData = {
      categoryBreakdown: formattedData.formattedCategoryBreakdown,
      recentTransactions: formattedData.formattedRecentTransactions,
      monthlyTrend: formattedData.formattedMonthlyTrend,
      netBalance: formattedData.netBalance,
      currMonthBalance: formattedData.currMonthBalance,
    };

    await setCache(cacheKey, responseData);

    return res.json({
      success: true,
      message: "Dashboard data retrieved successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Dashboard error:", error);

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
      error: "Failed to load dashboard",
    });
  }
};
