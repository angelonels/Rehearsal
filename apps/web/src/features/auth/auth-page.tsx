import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { motion } from "motion/react";
import { useForm, type Resolver } from "react-hook-form";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@rehearsal/contracts";
import { Brand } from "../../components/brand";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { api } from "../../lib/api";
import { useAuth } from "./auth-context";

export function AuthPage() {
  const { mode } = useParams();
  const isRegister = mode === "signup";
  const schema = isRegister ? registerSchema : loginSchema;
  const { user, setAuth } = useAuth();
  const navigate = useNavigate();
  type AuthForm = LoginInput & Partial<Omit<RegisterInput, keyof LoginInput>>;
  const form = useForm<AuthForm>({ resolver: zodResolver(schema) as Resolver<AuthForm>, defaultValues: isRegister ? { experienceLevel: "mid" } : {} });
  if (user) return <Navigate to="/app" replace />;
  const submit = form.handleSubmit(async (values) => {
    try {
      const response = await api.post(`/auth/${isRegister ? "register" : "login"}`, values);
      setAuth(response.data.data.token, response.data.data.user);
      navigate("/app");
    } catch (error: unknown) {
      const message = axios.isAxiosError<{ error?: { message?: string } }>(error)
        ? error.response?.data?.error?.message
        : undefined;
      form.setError("root", { message: message ?? "Unable to continue. Try again." });
    }
  });
  return <main className="studio-grid min-h-screen px-4 py-6">
    <header className="mx-auto flex max-w-6xl items-center justify-between"><Brand /><Link to="/" className="text-sm text-[#a6aca3] hover:text-white">Back home</Link></header>
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-16 max-w-md rounded-2xl border border-[#292d29] bg-[#0d0f0d] p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{isRegister ? "Create your profile" : "Welcome back"}</h1>
      <p className="mt-2 text-sm text-[#90968e]">{isRegister ? "A few details help Mara calibrate your interviews." : "Continue your interview practice."}</p>
      <form className="mt-8 space-y-4" onSubmit={submit}>
        {isRegister && <><Field label="Name" error={form.formState.errors.name?.message}><Input autoComplete="name" {...form.register("name" as const)} /></Field>
          <Field label="Target role" error={form.formState.errors.jobRole?.message}><Input placeholder="Frontend engineer" {...form.register("jobRole" as const)} /></Field>
          <Field label="Experience level" error={undefined}><select className="h-11 w-full rounded-lg border border-[#30342f] bg-[#111311] px-3 text-sm" {...form.register("experienceLevel" as const)}><option value="entry">Entry</option><option value="mid">Mid-level</option><option value="senior">Senior</option><option value="lead">Lead</option></select></Field></>}
        <Field label="Email" error={form.formState.errors.email?.message}><Input type="email" autoComplete="email" {...form.register("email")} /></Field>
        <Field label="Password" error={form.formState.errors.password?.message}><Input type="password" autoComplete={isRegister ? "new-password" : "current-password"} {...form.register("password")} /></Field>
        {form.formState.errors.root && <p role="alert" className="text-sm text-red-300">{form.formState.errors.root.message}</p>}
        <Button className="mt-2 w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Please wait…" : isRegister ? "Create account" : "Sign in"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-[#90968e]">{isRegister ? "Already have an account?" : "New to Rehearsal?"} <Link className="font-medium text-[#caff3d]" to={`/auth/${isRegister ? "signin" : "signup"}`}>{isRegister ? "Sign in" : "Create account"}</Link></p>
    </motion.section>
  </main>;
}
function Field({ label, error, children }: { label: string; error: string | undefined; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-medium">{label}</span>{children}{error && <span className="block text-xs text-red-300">{error}</span>}</label>;
}
