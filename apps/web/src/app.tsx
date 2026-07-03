import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/app-shell";
import { useAuth } from "./features/auth/auth-context";
import { AuthPage } from "./features/auth/auth-page";
import { DashboardPage } from "./features/interviews/dashboard-page";
import { NewInterviewPage } from "./features/interviews/new-interview-page";
import { ReportPage } from "./features/interviews/report-page";
import { LandingPage } from "./features/landing/landing-page";

const InterviewPage = lazy(() => import("./features/interviews/interview-page").then((module) => ({ default: module.InterviewPage })));
function Protected() { return useAuth().user ? <Outlet /> : <Navigate to="/auth/signin" replace />; }
export function App() {
  return <Suspense fallback={<div className="min-h-screen bg-[#090a09]" />}><Routes><Route path="/" element={<LandingPage />} /><Route path="/auth/:mode" element={<AuthPage />} /><Route element={<Protected />}><Route path="/app" element={<AppShell />}><Route index element={<DashboardPage />} /><Route path="new" element={<NewInterviewPage />} /><Route path="interviews/:id" element={<ReportPage />} /></Route><Route path="/app/interviews/:id/live" element={<InterviewPage />} /></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></Suspense>;
}
