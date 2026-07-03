import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type User = { id: string; name: string; email: string; jobRole: string; experienceLevel: string };
type AuthValue = { user: User | null; setAuth: (token: string, user: User) => void; signOut: () => void };
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("rehearsal.user");
    return saved ? JSON.parse(saved) as User : null;
  });
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
