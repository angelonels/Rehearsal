import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const experienceLevel = pgEnum("experience_level", ["entry", "mid", "senior", "lead"]);
export const interviewType = pgEnum("interview_type", ["behavioral", "technical", "system_design", "culture_fit"]);
export const sessionStatus = pgEnum("session_status", ["created", "active", "completed", "report_pending", "report_ready", "failed"]);
export const speaker = pgEnum("speaker", ["candidate", "interviewer"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 80 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  jobRole: varchar("job_role", { length: 100 }).notNull(),
  experienceLevel: experienceLevel("experience_level").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: interviewType("type").notNull(),
  targetRole: varchar("target_role", { length: 100 }).notNull(),
  status: sessionStatus("status").default("created").notNull(),
  roomName: varchar("room_name", { length: 160 }).notNull().unique(),
  durationMinutes: integer("duration_minutes").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [index("sessions_user_created_idx").on(table.userId, table.createdAt)]);

export const transcriptTurns = pgTable("transcript_turns", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  speaker: speaker("speaker").notNull(),
  content: text("content").notNull(),
  sequence: integer("sequence").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [index("turns_session_sequence_idx").on(table.sessionId, table.sequence)]);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }).unique(),
  overallScore: integer("overall_score").notNull(),
  summary: text("summary").notNull(),
  strengths: jsonb("strengths").$type<string[]>().notNull(),
  improvements: jsonb("improvements").$type<string[]>().notNull(),
  competencies: jsonb("competencies").$type<Record<string, number>>().notNull(),
  detailedFeedback: jsonb("detailed_feedback").$type<Array<{ topic: string; feedback: string }>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
