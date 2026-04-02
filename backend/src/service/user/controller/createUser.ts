import type { Request, Response } from "express";
import { CreateUserReqSchema } from "../../../types/userLogin.type.js";
import prisma from "../../../db/prisma.js";
import { sendWelcomeEmail } from "../../..//util/otp/sendWelcomeEmail.js";
import type { USER_ROLE } from "@prisma/client";
import jwt from "jsonwebtoken";

export const createUser = async (req: Request, res: Response) => {
  try {
    const parsed = CreateUserReqSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request schema",
      });
    }

    const { email, firstName, lastName, role } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "Email already exists",
      });
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: `${firstName} ${lastName}`,
        role: role as USER_ROLE,
      },
    });

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "7d",
        issuer: "finora-backend",
        audience: "finora-users",
        algorithm: "HS256",
      },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 29 * 24 * 60 * 60 * 1000,
    });

    const isEmailSent = await sendWelcomeEmail(
      email,
      `${firstName} ${lastName}`,
      role,
    );
    if (!isEmailSent) {
      return res.status(201).json({
        success: true,
        message: "User created but failed to send welcome email",
        data: user,
      });
    }

    return res.status(201).json({
      success: true,
      message: "User created",
      data: user,
    });
  } catch (error) {
    console.error("Error in createUser:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create user",
    });
  }
};
