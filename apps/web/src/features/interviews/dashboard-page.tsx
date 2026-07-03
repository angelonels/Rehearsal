import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { api } from "../../lib/api";
import type { Session } from "./types";

const labels = { behavioral: "Behavioral", technical: "Technical", system_design: "System design", culture_fit: "Culture fit" };
export function DashboardPage() {
  const query = useQuery({ queryKey: ["interviews"], queryFn: async () => (await api.get<{ data: Session[] }>("/interviews")).data.data, refetchInterval: (q) => q.state.data?.some((x) => x.status === "report_pending") ? 4000 : false });
  return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
    <header className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center"><div><h1 className="text-3xl font-semibold tracking-tight">Your interviews</h1><p className="mt-2 text-sm text-[#90968e]">Review recent practice sessions and feedback.</p></div><Link to="/app/new"><Button><Plus className="size-4" />Start new interview</Button></Link></header>
    <section className="mt-10 overflow-hidden rounded-xl border border-[#292d29]">
      {query.isLoading && <div className="space-y-px">{[1,2,3].map((x) => <div key={x} className="h-20 animate-pulse bg-[#111311]" />)}</div>}
      {query.isError && <div className="p-8 text-sm text-red-300">Could not load interviews. <button className="underline" onClick={() => query.refetch()}>Try again</button></div>}
      {query.data?.length === 0 && <div className="p-10 text-center"><CalendarDays className="mx-auto size-6 text-[#caff3d]" /><h2 className="mt-4 font-semibold">No interviews yet</h2><p className="mt-2 text-sm text-[#90968e]">Start a session and your report will appear here.</p></div>}
      {query.data?.map((session) => <Link key={session.id} to={`/app/interviews/${session.id}`} className="group flex items-center justify-between border-b border-[#292d29] bg-[#0d0f0d] p-5 last:border-0 hover:bg-[#121512]"><div><h2 className="font-medium">{labels[session.type]} interview</h2><p className="mt-1 text-xs text-[#90968e]">{session.targetRole} · {new Date(session.createdAt).toLocaleDateString()}</p></div><div className="flex items-center gap-4"><span className={`text-xs ${session.status === "report_ready" ? "text-[#caff3d]" : "text-[#90968e]"}`}>{session.status === "report_ready" ? `${session.report?.overallScore ?? "—"}/100` : session.status.replace("_", " ")}</span><ArrowRight className="size-4 text-[#666c64] transition-transform group-hover:translate-x-1" /></div></Link>)}
    </section>
  </main>;
}
