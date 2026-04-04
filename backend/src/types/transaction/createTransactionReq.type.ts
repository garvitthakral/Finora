import { z } from "zod";

export const CreateTransactionReqSchema = z.object({
  userId: z.string(),
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().min(1),
  notes: z.string().optional(),
  date: z.string(),
});

export type CreateTransactionReqData = z.infer<
  typeof CreateTransactionReqSchema
>;

export const UpdateTransactionReqSchema = z.object({
  amount: z.number().positive().optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  category: z.string().min(1).optional(),
  date: z.string().optional(),
});

export type UpdateTransactionReqData = z.infer<
  typeof UpdateTransactionReqSchema
>;
