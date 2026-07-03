import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, CircleAlert } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import type { Session } from "./types";

export function ReportPage() {
  const { id } = useParams();
  const query = useQuery({ queryKey: ["interview", id], queryFn: async () => (await api.get<{ data: Session }>(`/interviews/${id}`)).data.data, refetchInterval: (q) => q.state.data?.status === "report_pending" ? 3500 : false });
  const report = query.data?.report;
  if (query.isLoading) return <main className="mx-auto max-w-5xl p-8"><div className="h-80 animate-pulse rounded-xl bg-[#111311]" /></main>;
  if (query.isError) return <main className="mx-auto max-w-3xl px-5 py-16 text-center"><CircleAlert className="mx-auto size-6 text-red-300" /><h1 className="mt-4 text-2xl font-semibold">Could not load this interview</h1><p className="mt-3 text-sm text-[#90968e]">Check your connection and try again.</p><button className="mt-6 text-sm font-medium text-[#caff3d]" onClick={() => query.refetch()}>Retry</button></main>;
  if (query.data?.status === "failed") return <main className="mx-auto max-w-3xl px-5 py-16 text-center"><CircleAlert className="mx-auto size-6 text-red-300" /><h1 className="mt-4 text-2xl font-semibold">Report generation failed</h1><p className="mt-3 text-sm text-[#90968e]">The interview is saved, but its report could not be generated after several attempts.</p><Link className="mt-8 inline-block text-sm text-[#caff3d]" to="/app/new">Start another interview</Link></main>;
  if (!report) return <main className="mx-auto max-w-3xl px-5 py-16 text-center"><h1 className="text-2xl font-semibold">Your report is being prepared</h1><p className="mt-3 text-sm text-[#90968e]">The full conversation is being assessed. This page updates automatically.</p><Link className="mt-8 inline-block text-sm text-[#caff3d]" to="/app">Back to interviews</Link></main>;
  return <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14"><Link to="/app" className="inline-flex items-center gap-2 text-sm text-[#90968e] hover:text-white"><ArrowLeft className="size-4" />All interviews</Link>
    <header className="mt-8 grid gap-6 border-b border-[#292d29] pb-10 md:grid-cols-[1fr_auto]"><div><h1 className="text-3xl font-semibold tracking-tight">Interview report</h1><p className="mt-4 max-w-2xl leading-7 text-[#a0a69d]">{report.summary}</p></div><div className="grid size-32 place-items-center rounded-full border border-[#caff3d]/50 bg-[#caff3d]/5"><div className="text-center"><strong className="text-4xl text-[#caff3d]">{report.overallScore}</strong><span className="block text-xs text-[#90968e]">out of 100</span></div></div></header>
    <section className="grid gap-8 py-10 md:grid-cols-2"><Feedback title="What worked" items={report.strengths} good /><Feedback title="What to improve" items={report.improvements} /></section>
    <section className="border-y border-[#292d29] py-10"><h2 className="text-xl font-semibold">Competencies</h2><div className="mt-6 space-y-5">{Object.entries(report.competencies).map(([name, score]) => <div key={name}><div className="mb-2 flex justify-between text-sm"><span className="capitalize">{name.replaceAll("_", " ")}</span><span className="text-[#90968e]">{score}/100</span></div><div className="h-1.5 rounded-full bg-[#20231f]"><div className="h-full rounded-full bg-[#caff3d]" style={{ width: `${score}%` }} /></div></div>)}</div></section>
    <section className="py-10"><h2 className="text-xl font-semibold">Detailed notes</h2><div className="mt-6 divide-y divide-[#292d29] border-y border-[#292d29]">{report.detailedFeedback.map((item) => <article key={item.topic} className="grid gap-3 py-6 md:grid-cols-[190px_1fr]"><h3 className="font-medium">{item.topic}</h3><p className="text-sm leading-6 text-[#a0a69d]">{item.feedback}</p></article>)}</div></section>
  </main>;
}
function Feedback({ title, items, good = false }: { title: string; items: string[]; good?: boolean }) {
  const Icon = good ? CheckCircle2 : CircleAlert;
  return <div><h2 className="text-lg font-semibold">{title}</h2><ul className="mt-5 space-y-4">{items.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-[#b5bab2]"><Icon className={`mt-1 size-4 shrink-0 ${good ? "text-[#caff3d]" : "text-amber-300"}`} />{item}</li>)}</ul></div>;
}
