import type { Request, Response } from "express";
import prisma from "../../../db/prisma";
import { Prisma } from "@prisma/client";

export const viewTransaction = async (req: Request, res: Response) => {
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
        error: "You do not have permission to view this transaction",
      });
    }

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
        error: "Transaction not found or has been deleted",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction retrieved successfully",
      data: transaction,
    });
  } catch (error) {
    console.error("Error viewing transaction:", error);

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
