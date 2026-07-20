import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type User } from "./api";
import { getToken, setToken, clearToken } from "./token";

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const { user } = await api.me();
          setUser(user);
        }
      } catch {
        await clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function signIn(email: string, password: string) {
    const { token, user } = await api.login(email, password);
    await setToken(token);
    setUser(user);
  }

  async function signOut() {
    await clearToken();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
