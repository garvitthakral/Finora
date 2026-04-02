import type { USER_ROLE } from "@prisma/client";
import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: USER_ROLE;
      };
    }
  }
}

export {};
