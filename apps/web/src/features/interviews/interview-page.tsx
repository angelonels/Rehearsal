import { LiveKitRoom, RoomAudioRenderer, StartAudio, useLocalParticipant, useVoiceAssistant } from "@livekit/components-react";
import { motion } from "motion/react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { api } from "../../lib/api";

type Connection = { url: string; token: string };
export function InterviewPage() {
  const location = useLocation();
  const connection = location.state as Connection | null;
  if (!connection?.token) return <Navigate to="/app/new" replace />;
  return <LiveKitRoom token={connection.token} serverUrl={connection.url} connect audio video={false} className="min-h-screen bg-[#080908]" data-lk-theme="default"><InterviewRoom /><RoomAudioRenderer /><StartAudio label="Enable interview audio" /></LiveKitRoom>;
}
function InterviewRoom() {
  const { state } = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const { id } = useParams();
  const navigate = useNavigate();
  useEffect(() => { const timer = window.setInterval(() => setSeconds((x) => x + 1), 1000); return () => clearInterval(timer); }, []);
  const end = async () => { if (id) await api.post(`/interviews/${id}/complete`); navigate("/app", { replace: true }); };
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return <main className="relative flex min-h-screen flex-col overflow-hidden p-5 sm:p-8">
    <header className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full border border-[#393e38] text-sm">M</div><div><h1 className="text-sm font-semibold">Mara</h1><p className="text-xs text-[#90968e]">AI interviewer</p></div></div><div className="font-mono text-sm text-[#cbd0c8]"><span className="mr-2 inline-block size-1.5 rounded-full bg-[#caff3d]" />{mins}:{secs}</div><Button variant="destructive" onClick={end}><PhoneOff className="size-4" /><span className="hidden sm:inline">End interview</span></Button></header>
    <section className="flex flex-1 flex-col items-center justify-center">
      <motion.div className="orb relative aspect-square w-[min(62vw,420px)] rounded-full" animate={state === "speaking" ? { scale: [1, 1.04, .98, 1], rotate: [0, 4, -3, 0] } : { scale: [1, 1.012, 1] }} transition={{ repeat: Infinity, duration: state === "speaking" ? 2.4 : 5, ease: "easeInOut" }} aria-label={`Interviewer is ${state}`} />
      <p className="mt-9 text-sm font-medium capitalize text-[#cbd0c8]">{state === "thinking" ? "Considering your answer…" : state === "speaking" ? "Mara is speaking" : "Listening"}</p>
    </section>
    <footer className="flex justify-center"><button aria-label={muted ? "Unmute microphone" : "Mute microphone"} onClick={async () => { await localParticipant.setMicrophoneEnabled(muted); setMuted((x) => !x); }} className={`grid size-14 place-items-center rounded-full border transition ${muted ? "border-red-800 bg-red-950/40 text-red-300" : "border-[#caff3d] bg-[#caff3d]/10 text-[#caff3d]"}`}>{muted ? <MicOff /> : <Mic />}</button></footer>
  </main>;
}
