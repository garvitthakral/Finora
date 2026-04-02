import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { USER_ROLE } from "@prisma/client";

interface CustomJwtPayload extends JwtPayload {
  sub: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: USER_ROLE;
  };
}

export const authenticateUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Response | void => {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_AUTH: JWT_SECRET is not set");
      return res.status(500).json({
        success: false,
        message: "Server authentication misconfigured",
      });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      issuer: "finora-backend",
      audience: "finora-users",
    }) as CustomJwtPayload;

    req.user = {
      id: decoded.sub,
      role: decoded.role,
    };

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    console.error("JWT AUTH ERROR:", error);

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};
