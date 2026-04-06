import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import type { AuthContextType, User } from "../type/contextType/authType";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );
  const [loading, setLoading] = useState(true);

  const authLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
  };

  const fetchUser = async () => {
    try {
      setLoading(true);
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const meUrl =
        import.meta.env.VITE_ME_URL ||
        `${import.meta.env.VITE_API_BASE_URL}/api/user/me`;

      const res = await axios.get(meUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser({
        id: res.data.data?.id ?? res.data.id,
        role: res.data.data?.role ?? res.data.role,
      });
    } catch {
      authLogout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    // We intentionally refetch only when the token changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const value: AuthContextType = useMemo(
    () => ({ user, token, setToken, loading, authLogout }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

