export type User = {
  id: string;
  role: "ADMIN" | "ANALYST" | "VIEWER";
};

export type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  authLogout: () => void;
  setToken: (token: string | null) => void;
};