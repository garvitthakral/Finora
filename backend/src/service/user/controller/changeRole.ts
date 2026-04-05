import type { Request, Response } from "express";
import prisma from "../../../db/prisma";
import { Prisma, USER_ROLE } from "@prisma/client";
import { ChangeUserRoleReqSchema } from "../../../types/user/chnageRole.type";

export const changeRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id?: string };
    const { role } = req.user!;

    if (role === "VIEWER" || role === "ANALYST") {
      return res.status(403).json({
        success: false,
        error: "You do not have permission to Change user role",
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

    const parsed = ChangeUserRoleReqSchema.safeParse(req.body);

    if (!parsed.success) {
      console.error("Validation error:", parsed.error);
      return res.status(400).json({
        success: false,
        error: "Invalid data",
        details: parsed.error.issues,
      });
    }

    const { newRole } = parsed.data;

    const updatedUser = await prisma.user.update({
      where: {
        id,
      },
      data: {
        role: newRole as USER_ROLE,
      },
    });

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error changing user role:", error);

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
      error: "An error occurred while changing the user role",
    });
  }
};
