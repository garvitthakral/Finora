import { createContext } from "react";
import type { AuthContextType } from "../type/contextType/authType";

export const AuthContext = createContext<AuthContextType | null>(null);

