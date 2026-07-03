import { fileURLToPath } from "node:url";
import { asc, eq } from "drizzle-orm";
import {
  WorkerOptions, cli, defineAgent, inference, llm, voice,
  type JobContext
} from "@livekit/agents";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import { createDatabase, sessions, transcriptTurns } from "@rehearsal/database";
import type { InterviewType } from "@rehearsal/contracts";
import { config } from "./config.js";
import { BedrockChat } from "./bedrock.js";
import { createInterviewGraph, InterviewEngine, type Turn } from "./interview-graph.js";

const credentials = config.BEDROCK_AWS_ACCESS_KEY_ID && config.BEDROCK_AWS_SECRET_ACCESS_KEY
  ? { accessKeyId: config.BEDROCK_AWS_ACCESS_KEY_ID, secretAccessKey: config.BEDROCK_AWS_SECRET_ACCESS_KEY } : undefined;
const model = new BedrockChat(config.BEDROCK_CHAT_MODEL_ID, config.BEDROCK_AWS_REGION, credentials);
const engine = new InterviewEngine(createInterviewGraph(model));
const { db } = createDatabase(config.DATABASE_URL);

type SessionContext = {
  sessionId: string;
  type: InterviewType;
  role: string;
  level: string;
  durationMinutes: number;
  startedAt: number;
  history: Turn[];
};

class InterviewerAgent extends voice.Agent<SessionContext> {
  constructor(data: SessionContext) {
    super({ instructions: "Conduct the adaptive interview.", stt: new deepgram.STT({
      apiKey: config.DEEPGRAM, model: "nova-3", language: "en", smartFormat: true
    }), tts: new deepgram.TTS({ apiKey: config.DEEPGRAM, model: "aura-2-andromeda-en" }) });
    this.data = data;
  }
  private data: SessionContext;

  override async llmNode(chatCtx: llm.ChatContext, _toolCtx: llm.ToolContext, _settings: voice.ModelSettings): Promise<Awaited<ReturnType<voice.Agent["llmNode"]>>> {
    const last = [...chatCtx.items].reverse().find((item): item is llm.ChatMessage => item.type === "message" && item.role === "user");
    const answer = last?.textContent?.trim();
    if (!answer) return null;
    const response = await engine.next({ ...this.data, answer });
    this.data.history.push({ role: "candidate", content: answer }, { role: "interviewer", content: response });
    return new ReadableStream<string>({ start(controller) { controller.enqueue(response); controller.close(); } }) as Awaited<ReturnType<voice.Agent["llmNode"]>>;
  }
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();
    const participant = await ctx.waitForParticipant();
    const metadata = JSON.parse(participant.metadata || "{}") as { sessionId?: string };
    if (!metadata.sessionId) throw new Error("Missing session metadata");
    const sessionRecord = await db.query.sessions.findFirst({
      where: eq(sessions.id, metadata.sessionId),
      with: { user: true, transcriptTurns: { orderBy: [asc(transcriptTurns.sequence)] } }
    });
    if (!sessionRecord?.user) throw new Error("Interview session not found");
    const history = sessionRecord.transcriptTurns.map((turn) => ({
      role: turn.speaker === "candidate" ? "candidate" as const : "interviewer" as const,
      content: turn.content
    }));
    const data: SessionContext = {
      sessionId: sessionRecord.id, type: sessionRecord.type, role: sessionRecord.targetRole,
      level: sessionRecord.user.experienceLevel, durationMinutes: sessionRecord.durationMinutes,
      startedAt: Date.now(), history
    };
    await db.update(sessions).set({ status: "active", startedAt: new Date() }).where(eq(sessions.id, sessionRecord.id));
    let sequence = sessionRecord.transcriptTurns.length;
    const session = new voice.AgentSession<SessionContext>({
      userData: data,
      turnHandling: { turnDetection: new inference.TurnDetector({ version: "v1-mini" }) }
    });
    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, async (event) => {
      const item = event.item;
      if (item.type !== "message" || !["user", "assistant"].includes(item.role) || !item.textContent) return;
      await db.insert(transcriptTurns).values({
        sessionId: data.sessionId, speaker: item.role === "user" ? "candidate" : "interviewer",
        content: item.textContent, sequence: sequence++
      });
    });
    await session.start({ agent: new InterviewerAgent(data), room: ctx.room });
    if (history.length === 0) {
      const opening = await engine.opening(data);
      data.history.push({ role: "interviewer", content: opening });
      await session.say(opening, { allowInterruptions: true });
    }
  }
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
