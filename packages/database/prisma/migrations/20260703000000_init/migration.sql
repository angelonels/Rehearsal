CREATE TYPE "ExperienceLevel" AS ENUM ('ENTRY', 'MID', 'SENIOR', 'LEAD');
CREATE TYPE "InterviewType" AS ENUM ('BEHAVIORAL', 'TECHNICAL', 'SYSTEM_DESIGN', 'CULTURE_FIT');
CREATE TYPE "SessionStatus" AS ENUM ('CREATED', 'ACTIVE', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "Speaker" AS ENUM ('CANDIDATE', 'INTERVIEWER');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "jobRole" TEXT NOT NULL,
  "experience" "ExperienceLevel" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "InterviewSession" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" "InterviewType" NOT NULL,
  "targetRole" TEXT NOT NULL,
  "jobDescription" TEXT,
  "durationMinutes" INTEGER NOT NULL DEFAULT 20,
  "status" "SessionStatus" NOT NULL DEFAULT 'CREATED',
  "roomName" TEXT NOT NULL UNIQUE,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "TranscriptTurn" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL REFERENCES "InterviewSession"("id") ON DELETE CASCADE,
  "speaker" "Speaker" NOT NULL,
  "text" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("sessionId", "sequence")
);

CREATE TABLE "AnswerEvaluation" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL REFERENCES "InterviewSession"("id") ON DELETE CASCADE,
  "score" INTEGER NOT NULL,
  "depth" INTEGER NOT NULL,
  "clarity" INTEGER NOT NULL,
  "relevance" INTEGER NOT NULL,
  "route" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "InterviewReport" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL UNIQUE REFERENCES "InterviewSession"("id") ON DELETE CASCADE,
  "content" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "InterviewSession_userId_createdAt_idx" ON "InterviewSession"("userId", "createdAt");
