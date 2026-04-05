import type { Request, Response } from "express";
import prisma from "../../../db/prisma";
import { Prisma } from "@prisma/client";
import { getCache, setCache } from "../../../util/stats/redisConect";

export const getUsers = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 10;

    if (page < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be greater than 0",
      });
    }

    const skip = (page - 1) * limit;

    const cacheKey = `users:page:${page}`;

    const cachedData = await getCache(cacheKey);

    if (cachedData) {
      return res.status(200).json({
        success: true,
        message: "Users fetched from cache",
        data: cachedData,
      });
    }

    const instance = await prisma.$transaction(async (tx) => {
      const users = await tx.user.findMany({
        skip,
        take: limit,
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const totalUsers = await tx.user.count({
        where: {
          deletedAt: null,
        },
      });
      return { users, totalUsers };
    });

    const totalPages = Math.ceil(instance.totalUsers / limit);

    const responseData = {
      users: instance.users,
      page,
      limit,
      totalUsers: instance.totalUsers,
      totalPages,
    };

    await setCache(cacheKey, responseData, 90);

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Error fetching users:", error);

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
      message: "Internal server error",
    });
  }
};
