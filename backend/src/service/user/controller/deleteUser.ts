import type { Request, Response } from "express";
import prisma from "../../../db/prisma";
import { Prisma } from "@prisma/client";

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id?: string };
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const { role } = currentUser;

    if (role === "VIEWER" || role === "ANALYST") {
      return res.status(403).json({
        success: false,
        error: "You do not have permission to delete users",
      });
    }

    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (user.deletedAt) {
      return res.status(409).json({
        success: false,
        error: "User already deleted",
      });
    }

    const deletedUser = await prisma.user.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
        status: "SUSPENDED",
      },
    });

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: deletedUser,
    });
  } catch (error) {
    console.error("Error deleting user:", error);

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
      error: "An error occurred while deleting the user",
    });
  }
};
