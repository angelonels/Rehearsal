import { ArrowRight, AudioLines, BrainCircuit, MessageCircleQuestion } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Brand } from "../../components/brand";

export function LandingPage() {
  return <main className="studio-grid min-h-screen overflow-hidden">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8"><Brand /><div className="flex items-center gap-3"><Link className="hidden text-sm text-[#a6aca3] hover:text-white sm:block" to="/auth/signin">Sign in</Link><Link className="rounded-lg bg-[#caff3d] px-4 py-2.5 text-sm font-semibold text-black" to="/auth/signup">Start practicing</Link></div></header>
    <section className="relative mx-auto grid min-h-[74vh] max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_.86fr]">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }}>
        <h1 className="max-w-3xl text-5xl font-semibold leading-[.98] tracking-[-.055em] sm:text-7xl">Practice the interview, <span className="text-[#caff3d]">not</span> the script.</h1>
        <p className="mt-7 max-w-lg text-base leading-7 text-[#a0a69d] sm:text-lg">A voice interviewer that listens, challenges vague answers, follows interesting threads, and gives evidence-based feedback.</p>
        <Link to="/auth/signup" className="mt-9 inline-flex h-12 items-center gap-2 rounded-lg bg-[#caff3d] px-5 text-sm font-semibold text-black">Start practicing <ArrowRight className="size-4" /></Link>
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .7 }} className="relative mx-auto aspect-square w-full max-w-[500px]">
        {[0,1,2,3].map((ring) => <motion.div key={ring} className="absolute rounded-full border border-[#caff3d]/15" style={{ inset: `${ring * 11}%` }} animate={{ rotate: ring % 2 ? -360 : 360 }} transition={{ repeat: Infinity, duration: 28 + ring * 8, ease: "linear" }} />)}
        <div className="orb absolute inset-[24%] rounded-full" />
      </motion.div>
    </section>
    <section className="mx-auto grid max-w-7xl gap-px border-y border-[#292d29] bg-[#292d29] sm:grid-cols-3">
      {[{ Icon: AudioLines, title: "Voice, not chat", body: "Speak naturally. Interrupt, pause, and think aloud." }, { Icon: MessageCircleQuestion, title: "Adaptive follow-ups", body: "Every question responds to the evidence in your answer." }, { Icon: BrainCircuit, title: "Specific feedback", body: "See strengths, gaps, and concrete ways to improve." }].map(({ Icon, title, body }) => <div key={title} className="bg-[#0b0c0b] p-8"><Icon className="size-5 text-[#caff3d]" /><h2 className="mt-5 font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-[#90968e]">{body}</p></div>)}
    </section>
  </main>;
}
