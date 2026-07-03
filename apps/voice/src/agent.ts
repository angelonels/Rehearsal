import { fileURLToPath } from "node:url";
import { asc, eq } from "drizzle-orm";
import {
  WorkerOptions, cli, defineAgent, inference, llm, log, voice, waitForTrackPublication,
  type JobContext
} from "@livekit/agents";
import { TrackKind } from "@livekit/rtc-node";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import { createDatabase, sessions, transcriptTurns } from "@rehearsal/database";
import type { InterviewType } from "@rehearsal/contracts";
import { z } from "zod";
import { config } from "./config.js";
import { BedrockChat } from "./bedrock.js";
import { createInterviewGraph, InterviewEngine, type Turn } from "./interview-graph.js";

const credentials = config.BEDROCK_AWS_ACCESS_KEY_ID && config.BEDROCK_AWS_SECRET_ACCESS_KEY
  ? { accessKeyId: config.BEDROCK_AWS_ACCESS_KEY_ID, secretAccessKey: config.BEDROCK_AWS_SECRET_ACCESS_KEY } : undefined;
const model = new BedrockChat(config.BEDROCK_CHAT_MODEL_ID, config.BEDROCK_AWS_REGION, credentials);
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
const participantMetadataSchema = z.object({ sessionId: z.string().uuid() });

class InterviewerAgent extends voice.Agent<SessionContext> {
  constructor(data: SessionContext, private engine: InterviewEngine) {
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
    const startedAt = performance.now();
    let response: string;
    try {
      response = await this.engine.next({ ...this.data, answer });
    } catch (error) {
      log().error({ err: error, sessionId: this.data.sessionId }, "interview graph failed");
      response = "I lost part of that answer. What was the most important action you personally took?";
    }
    log().info({
      durationMs: Math.round(performance.now() - startedAt),
      sessionId: this.data.sessionId
    }, "interview graph completed");
    this.data.history.push({ role: "candidate", content: answer }, { role: "interviewer", content: response });
    return new ReadableStream<string>({ start(controller) { controller.enqueue(response); controller.close(); } }) as Awaited<ReturnType<voice.Agent["llmNode"]>>;
  }
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();
    const participant = await ctx.waitForParticipant();
    const metadata = participantMetadataSchema.parse(JSON.parse(participant.metadata || "{}"));
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
      startedAt: sessionRecord.startedAt?.getTime() ?? Date.now(), history
    };
    const engine = new InterviewEngine(createInterviewGraph(model));
    await db.update(sessions).set({
      status: "active",
      startedAt: sessionRecord.startedAt ?? new Date()
    }).where(eq(sessions.id, sessionRecord.id));
    let sequence = sessionRecord.transcriptTurns.length;
    let persistence = Promise.resolve();
    const session = new voice.AgentSession<SessionContext>({
      userData: data,
      turnHandling: {
        turnDetection: new inference.TurnDetector({ version: "v1-mini" }),
        interruption: { mode: "vad" },
        endpointing: { minDelay: 300, maxDelay: 2_000 }
      },
      ttsReadIdleTimeout: 12_000,
      forwardAudioIdleTimeout: 12_000
    });
    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (event) => {
      if (!event.isFinal) return;
      log().info({
        characterCount: event.transcript.length,
        sessionId: data.sessionId
      }, "candidate input transcribed");
    });
    session.on(voice.AgentSessionEventTypes.AgentStateChanged, (event) => {
      log().debug({ sessionId: data.sessionId, state: event.newState }, "agent state changed");
    });
    session.on(voice.AgentSessionEventTypes.Error, (event) => {
      log().error({ err: event.error, sessionId: data.sessionId }, "voice session error");
    });
    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, (event) => {
      const item = event.item;
      if (item.type !== "message" || !["user", "assistant"].includes(item.role) || !item.textContent) return;
      const nextSequence = sequence++;
      const content = item.textContent;
      persistence = persistence
        .then(() => db.insert(transcriptTurns).values({
          sessionId: data.sessionId,
          speaker: item.role === "user" ? "candidate" : "interviewer",
          content,
          sequence: nextSequence
        }).then(() => undefined))
        .catch((error) => {
          log().error({ err: error, sequence: nextSequence, sessionId: data.sessionId }, "transcript persistence failed");
        });
    });
    await session.start({
      agent: new InterviewerAgent(data, engine),
      room: ctx.room,
      inputOptions: {
        audioEnabled: true,
        textEnabled: false,
        videoEnabled: false,
        participantIdentity: participant.identity
      }
    });
    try {
      await waitForTrackPublication({
        room: ctx.room,
        identity: participant.identity,
        kind: TrackKind.KIND_AUDIO,
        waitForSubscription: true,
        signal: AbortSignal.timeout(15_000)
      });
      log().info({ participantId: participant.identity, sessionId: data.sessionId }, "candidate microphone subscribed");
    } catch (error) {
      log().warn({ err: error, participantId: participant.identity, sessionId: data.sessionId }, "candidate microphone was not ready before opening");
    }
    if (history.length === 0) {
      const opening = await engine.opening(data);
      data.history.push({ role: "interviewer", content: opening });
      await session.say(opening, { allowInterruptions: true });
    }
  }
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
