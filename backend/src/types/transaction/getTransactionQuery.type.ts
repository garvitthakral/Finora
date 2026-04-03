import { z } from "zod";

export const transactionQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  category: z.string().optional(),
  minAmount: z.string().optional(),
  maxAmount: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z
    .enum(["amount", "transactionDate", "category"])
    .default("transactionDate"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type GetTransactionQuery = z.infer<typeof transactionQuerySchema>;
