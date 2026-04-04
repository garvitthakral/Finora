import { z } from "zod";

export const monthlyTrendSchema = z.object({
  month: z.string().datetime(),
  income: z.coerce.number(),
  expense: z.coerce.number(),
});

export type MonthlyTrendData = z.infer<typeof monthlyTrendSchema>;
