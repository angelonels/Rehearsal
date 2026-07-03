import { and, asc, desc, eq } from "drizzle-orm";
import { AccessToken } from "livekit-server-sdk";
import type { CreateSessionInput } from "@rehearsal/contracts";
import type { Database } from "@rehearsal/database";
import { reports, sessions, transcriptTurns, users } from "@rehearsal/database";
import { AppError } from "../../lib/errors.js";

export class InterviewService {
  constructor(private db: Database, private livekit: { apiKey: string; apiSecret: string; url: string }) {}

  async list(userId: string) {
    return this.db.query.sessions.findMany({
      where: eq(sessions.userId, userId),
      orderBy: [desc(sessions.createdAt)],
      with: { report: true }
    });
  }

  async get(userId: string, id: string) {
    const session = await this.db.query.sessions.findFirst({
      where: and(eq(sessions.id, id), eq(sessions.userId, userId)),
      with: { report: true, transcriptTurns: { orderBy: [asc(transcriptTurns.sequence)] } }
    });
    if (!session) throw new AppError(404, "SESSION_NOT_FOUND", "Interview session not found.");
    return session;
  }

  async create(userId: string, input: CreateSessionInput) {
    const user = await this.db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "Account not found.");
    const id = crypto.randomUUID();
    const roomName = `interview-${id}`;
    const [session] = await this.db.insert(sessions).values({
      id, userId, roomName, type: input.type, targetRole: input.targetRole ?? user.jobRole, durationMinutes: input.durationMinutes
    }).returning();
    if (!session) throw new Error("Session insert failed");
    return { session, connection: await this.issueConnection(user, session) };
  }

  async connect(userId: string, id: string) {
    const session = await this.db.query.sessions.findFirst({
      where: and(eq(sessions.id, id), eq(sessions.userId, userId)),
      with: { user: true }
    });
    if (!session?.user) throw new AppError(404, "SESSION_NOT_FOUND", "Interview session not found.");
    if (!["created", "active"].includes(session.status)) {
      throw new AppError(409, "SESSION_ENDED", "This interview has ended. Start a new interview to continue practicing.");
    }
    return this.issueConnection(session.user, session);
  }

  private async issueConnection(
    user: typeof users.$inferSelect,
    session: typeof sessions.$inferSelect
  ) {
    const token = new AccessToken(this.livekit.apiKey, this.livekit.apiSecret, {
      identity: user.id,
      name: user.name,
      metadata: JSON.stringify({ sessionId: session.id, role: user.jobRole, experienceLevel: user.experienceLevel })
    });
    token.addGrant({ room: session.roomName, roomJoin: true, canPublish: true, canSubscribe: true });
    return { url: this.livekit.url, token: await token.toJwt() };
  }

  async complete(userId: string, id: string) {
    const existing = await this.db.query.sessions.findFirst({
      where: and(eq(sessions.id, id), eq(sessions.userId, userId))
    });
    if (!existing) throw new AppError(404, "SESSION_NOT_FOUND", "Interview session not found.");
    if (["report_pending", "report_ready", "failed"].includes(existing.status)) {
      return { session: existing, enqueueReport: false };
    }
    const [session] = await this.db.update(sessions).set({ status: "report_pending", endedAt: new Date() })
      .where(and(eq(sessions.id, id), eq(sessions.userId, userId))).returning();
    if (!session) throw new Error("Session update failed");
    return { session, enqueueReport: true };
  }
}
