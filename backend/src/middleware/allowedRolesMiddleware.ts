import type { USER_ROLE } from "@prisma/client";
import type { Request, Response, NextFunction } from "express";

export const allowRoles = (roles: USER_ROLE[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role as USER_ROLE;

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    next();
  };
};
