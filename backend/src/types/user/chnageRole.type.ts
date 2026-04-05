import {z} from "zod";

export const ChangeUserRoleReqSchema = z.object({
  userId: z.string(),
  newRole: z.enum(["VIEWER", "ANALYST", "ADMIN"]),
});

export type ChangeUserRoleReqData = z.infer<typeof ChangeUserRoleReqSchema>;