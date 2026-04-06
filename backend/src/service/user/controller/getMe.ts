import type { Response } from "express";
import type { AuthenticatedRequest } from "../../../middleware/JWTAuthMiddleware";

export const getMe = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      id: req.user.id,
      role: req.user.role,
    },
  });
};

