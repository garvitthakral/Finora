import {z} from "zod";

export const ChangeUserRoleReqSchema = z.object({
  newRole: z.enum(["VIEWER", "ANALYST", "ADMIN"]),
});

export type ChangeUserRoleReqData = z.infer<typeof ChangeUserRoleReqSchema>;