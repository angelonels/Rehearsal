import { Blocks, Code2, HeartHandshake, Users } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { InterviewType } from "@rehearsal/contracts";
import { api } from "../../lib/api";
import type { SessionConnection } from "./types";

const types = [
  { id: "behavioral", label: "Behavioral", body: "Communication, STAR structure, ownership, and self-awareness.", icon: Users },
  { id: "technical", label: "Technical", body: "Depth of knowledge, reasoning, edge cases, and problem solving.", icon: Code2 },
  { id: "system_design", label: "System design", body: "Architecture, scale, failure modes, and explicit tradeoffs.", icon: Blocks },
  { id: "culture_fit", label: "Culture fit", body: "Motivation, values, judgment, and collaboration.", icon: HeartHandshake }
] as const;

export function NewInterviewPage() {
  const [selected, setSelected] = useState<InterviewType | null>(null);
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: async (type: InterviewType) => (await api.post<{ data: SessionConnection }>("/interviews", { type, durationMinutes: 30 })).data.data,
    onSuccess: (data) => navigate(`/app/interviews/${data.session.id}/live`, { state: data.connection })
  });
  return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14"><header className="text-center"><h1 className="text-3xl font-semibold tracking-tight">Choose an interview type</h1><p className="mt-2 text-sm text-[#90968e]">Mara will adapt her strategy to what you want to practice.</p></header>
    <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{types.map((type, i) => <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .06 }} key={type.id} onClick={() => setSelected(type.id)} onDoubleClick={() => mutation.mutate(type.id)} className={`min-h-64 rounded-xl border p-6 text-left transition ${selected === type.id ? "border-[#caff3d] bg-[#151914] shadow-[0_0_0_1px_rgba(202,255,61,.2)]" : "border-[#292d29] bg-[#0d0f0d] hover:border-[#4a5047]"}`}><type.icon className={`size-7 ${selected === type.id ? "text-[#caff3d]" : "text-[#8d948a]"}`} /><h2 className="mt-8 text-lg font-semibold">{type.label}</h2><p className="mt-3 text-sm leading-6 text-[#90968e]">{type.body}</p></motion.button>)}</div>
    <div className="mt-8 flex justify-center"><button disabled={!selected || mutation.isPending} onClick={() => selected && mutation.mutate(selected)} className="h-12 rounded-lg bg-[#caff3d] px-7 text-sm font-semibold text-black disabled:opacity-40">{mutation.isPending ? "Preparing room…" : "Continue"}</button></div>
    {mutation.isError && <p className="mt-4 text-center text-sm text-red-300">Could not prepare the interview room. Check the backend and try again.</p>}
  </main>;
}
