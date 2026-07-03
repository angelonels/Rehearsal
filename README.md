# Rehearsal

Rehearsal is a voice-only AI mock interview platform. Candidates speak with an adaptive interviewer that evaluates each answer, follows weak or interesting threads, adjusts difficulty, and generates a transcript-grounded report.

## Stack

- React, TypeScript, Tailwind, shadcn-style primitives, TanStack Query, Axios, Motion, LiveKit Components
- Node.js, Express, Zod, Drizzle, PostgreSQL, JWT/Argon2 authentication
- LiveKit Agents, self-hosted `v1-mini` turn detector, Deepgram STT/TTS
- LangGraph adaptive interview graph and AWS Bedrock `gpt-oss`
- BullMQ/Redis for report generation

The backend is split into an HTTP API/report worker (`apps/api`) and realtime voice agent (`apps/voice`). The frontend is deployable to Vercel from `apps/web`; both backend processes include DigitalOcean-compatible Dockerfiles.

## Local setup (4 commands)

```bash
cp .env.example .env
docker compose up -d
pnpm install && pnpm db:migrate
pnpm dev
```

Add AWS Bedrock credentials and `DEEPGRAM` to `.env` before the final command. Open [http://localhost:5173](http://localhost:5173).

## Environment

Required in production:

- `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `WEB_ORIGIN`
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- `DEEPGRAM`
- `BEDROCK_AWS_REGION`, AWS credentials, `BEDROCK_CHAT_MODEL_ID`, `BEDROCK_REPORT_MODEL_ID`
- `VITE_API_URL` at frontend build time

Use `openai.gpt-oss-20b-1:0` for low-latency interview turns and `openai.gpt-oss-120b-1:0` for reports. Both are open-weight models served through Bedrock.

## Useful commands

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm --filter @rehearsal/api worker
```

## Architecture

The API owns accounts, JWT issuance, interview lifecycle, LiveKit room tokens, session history, and reports. The voice agent joins each room as a participant, transcribes speech, invokes the interview graph, speaks the graph output, and persists both sides of the conversation.

The graph runs answer evaluation, difficulty adjustment, branch selection, and response generation as separate nodes. Its route selects a contextual follow-up, a new topic, or a natural close. Full transcript history is supplied on every invocation and also stored in PostgreSQL.

Reports are idempotent BullMQ jobs. Ending a session marks the report pending and queues a Bedrock assessment; the dashboard polls only while work is pending.
