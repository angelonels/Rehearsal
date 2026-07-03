import { AudioLines, LogOut, Plus, Rows3 } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/auth-context";
import { Brand } from "./brand";

export function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return <div className="min-h-screen bg-[#090a09] text-white lg:grid lg:grid-cols-[240px_1fr]">
    <aside className="hidden min-h-screen border-r border-[#292d29] p-5 lg:flex lg:flex-col">
      <Brand /><nav className="mt-10 space-y-1"><Item to="/app" icon={Rows3}>Your interviews</Item><Item to="/app/new" icon={Plus}>New interview</Item></nav>
      <button onClick={() => { signOut(); navigate("/"); }} className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#90968e] hover:bg-[#151715] hover:text-white"><LogOut className="size-4" />Sign out</button>
    </aside>
    <div><header className="flex items-center justify-between border-b border-[#292d29] px-5 py-4 lg:hidden"><Brand /><button aria-label="Sign out" onClick={() => { signOut(); navigate("/"); }}><LogOut className="size-5 text-[#90968e]" /></button></header><Outlet /></div>
  </div>;
}
function Item({ to, icon: Icon, children }: { to: string; icon: typeof AudioLines; children: React.ReactNode }) {
  return <NavLink end={to === "/app"} to={to} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isActive ? "bg-[#1a1d19] text-[#caff3d]" : "text-[#90968e] hover:text-white"}`}><Icon className="size-4" />{children}</NavLink>;
}
