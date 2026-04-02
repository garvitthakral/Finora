import { z} from "zod";

export const CreateTransactionReqSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().min(1),
  notes: z.string().optional(),
  date: z.string(),
});

export type CreateTransactionReqData = z.infer<typeof CreateTransactionReqSchema>;