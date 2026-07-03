import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  useConnectionState,
  useLocalParticipant,
  useVoiceAssistant
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { motion } from "motion/react";
import { CircleAlert, LoaderCircle, Mic, MicOff, PhoneOff, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { api } from "../../lib/api";

type Connection = { url: string; token: string };
export function InterviewPage() {
  const location = useLocation();
  const connection = location.state as Connection | null;
  if (!connection?.token) return <Navigate to="/app/new" replace />;
  return <LiveKitRoom
    token={connection.token}
    serverUrl={connection.url}
    connect
    audio
    video={false}
    className="min-h-screen bg-[#080908]"
    data-lk-theme="default"
  >
    <InterviewRoom />
    <RoomAudioRenderer />
    <StartAudio label="Enable interview audio" />
  </LiveKitRoom>;
}
export function InterviewRoom() {
  const { state, agent } = useVoiceAssistant();
  const connectionState = useConnectionState();
  const {
    localParticipant,
    isMicrophoneEnabled,
    microphoneTrack,
    lastMicrophoneError
  } = useLocalParticipant();
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const { id } = useParams();
  const navigate = useNavigate();
  const enableMicrophone = useCallback(async () => {
    setMicrophoneError(null);
    try {
      await localParticipant.setMicrophoneEnabled(true);
    } catch (error) {
      setMicrophoneError(error instanceof Error ? error.message : "Microphone access was denied.");
    }
  }, [localParticipant]);
  useEffect(() => {
    if (connectionState === ConnectionState.Connected && !microphoneTrack) {
      void enableMicrophone();
    }
  }, [connectionState, enableMicrophone, microphoneTrack]);
  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return;
    const timer = window.setInterval(() => setSeconds((x) => x + 1), 1000);
    return () => clearInterval(timer);
  }, [connectionState]);
  const end = async () => {
    if (!id || isEnding) return;
    setIsEnding(true);
    setEndError(null);
    try {
      await api.post(`/interviews/${id}/complete`);
      navigate("/app", { replace: true });
    } catch {
      setEndError("The interview could not be ended. Check your connection and try again.");
      setIsEnding(false);
    }
  };
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const micReady = Boolean(isMicrophoneEnabled && microphoneTrack && !microphoneTrack.isMuted);
  const visibleMicrophoneError = microphoneError ?? lastMicrophoneError?.message ?? null;
  const status = getInterviewStatus({
    agentReady: Boolean(agent),
    connectionState,
    microphoneError: visibleMicrophoneError,
    microphoneReady: micReady,
    voiceState: state
  });
  return <main className="relative flex min-h-screen flex-col overflow-hidden p-5 sm:p-8">
    <header className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full border border-[#393e38] text-sm">M</div><div><h1 className="text-sm font-semibold">Mara</h1><p className="text-xs text-[#90968e]">AI interviewer</p></div></div><div className="font-mono text-sm text-[#cbd0c8]"><span className={`mr-2 inline-block size-1.5 rounded-full ${micReady && agent ? "bg-[#caff3d]" : "bg-amber-300"}`} />{mins}:{secs}</div><Button variant="destructive" disabled={isEnding} onClick={end}>{isEnding ? <LoaderCircle className="size-4 animate-spin" /> : <PhoneOff className="size-4" />}<span className="hidden sm:inline">{isEnding ? "Ending…" : "End interview"}</span></Button></header>
    <section className="flex flex-1 flex-col items-center justify-center">
      <motion.div className="orb relative aspect-square w-[min(62vw,420px)] rounded-full" animate={state === "speaking" ? { scale: [1, 1.04, .98, 1], rotate: [0, 4, -3, 0] } : { scale: [1, 1.012, 1] }} transition={{ repeat: Infinity, duration: state === "speaking" ? 2.4 : 5, ease: "easeInOut" }} aria-label={`Interviewer is ${state}`} />
      <p role="status" className={`mt-9 text-sm font-medium ${status.tone === "error" ? "text-red-300" : "text-[#cbd0c8]"}`}>{status.label}</p>
      {visibleMicrophoneError && <button onClick={enableMicrophone} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#3a3f39] px-4 py-2 text-xs text-[#cbd0c8] hover:border-[#caff3d]/60"><RotateCcw className="size-3.5" />Retry microphone</button>}
      {endError && <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-red-300"><CircleAlert className="size-4" />{endError}</p>}
    </section>
    <footer className="flex justify-center"><button
      aria-label={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
      disabled={connectionState !== ConnectionState.Connected || isEnding}
      onClick={async () => {
        try {
          setMicrophoneError(null);
          await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
        } catch (error) {
          setMicrophoneError(error instanceof Error ? error.message : "Could not change microphone state.");
        }
      }}
      className={`grid size-14 place-items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-40 ${isMicrophoneEnabled ? "border-[#caff3d] bg-[#caff3d]/10 text-[#caff3d]" : "border-red-800 bg-red-950/40 text-red-300"}`}
    >{isMicrophoneEnabled ? <Mic /> : <MicOff />}</button></footer>
  </main>;
}

function getInterviewStatus(input: {
  agentReady: boolean;
  connectionState: ConnectionState;
  microphoneError: string | null;
  microphoneReady: boolean;
  voiceState: string;
}) {
  if (input.connectionState === ConnectionState.Disconnected) return { label: "Connection lost", tone: "error" as const };
  if (input.connectionState !== ConnectionState.Connected) return { label: "Connecting securely…", tone: "neutral" as const };
  if (input.microphoneError) return { label: "Microphone access failed", tone: "error" as const };
  if (!input.microphoneReady) return { label: "Microphone not ready", tone: "neutral" as const };
  if (!input.agentReady) return { label: "Waiting for Mara…", tone: "neutral" as const };
  if (input.voiceState === "thinking") return { label: "Considering your answer…", tone: "neutral" as const };
  if (input.voiceState === "speaking") return { label: "Mara is speaking", tone: "neutral" as const };
  return { label: "Listening", tone: "neutral" as const };
}
