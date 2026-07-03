import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { z } from "zod";
import { authExpiredEvent } from "../../lib/api";

type User = { id: string; name: string; email: string; jobRole: string; experienceLevel: string };
const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  jobRole: z.string(),
  experienceLevel: z.string()
});
type AuthValue = { user: User | null; setAuth: (token: string, user: User) => void; signOut: () => void };
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);
  useEffect(() => {
    const clearExpiredAuth = () => setUser(null);
    window.addEventListener(authExpiredEvent, clearExpiredAuth);
    return () => window.removeEventListener(authExpiredEvent, clearExpiredAuth);
  }, []);
  const value = useMemo(() => ({
    user,
    setAuth(token: string, next: User) {
      localStorage.setItem("rehearsal.token", token);
      localStorage.setItem("rehearsal.user", JSON.stringify(next));
      setUser(next);
    },
    signOut() {
      localStorage.removeItem("rehearsal.token");
      localStorage.removeItem("rehearsal.user");
      setUser(null);
    }
  }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be inside AuthProvider");
  return context;
}

function readStoredUser(): User | null {
  const saved = localStorage.getItem("rehearsal.user");
  const token = localStorage.getItem("rehearsal.token");
  if (!saved || !token) return null;
  try {
    return userSchema.parse(JSON.parse(saved));
  } catch {
    localStorage.removeItem("rehearsal.token");
    localStorage.removeItem("rehearsal.user");
    return null;
  }
}
