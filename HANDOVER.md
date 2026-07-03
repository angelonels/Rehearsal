# Handover

## Current Objective
- Make the Rehearsal full-stack AI mock interview platform actually work end to end, with emphasis on the backend voice path: browser microphone -> LiveKit -> STT -> LangGraph/Bedrock -> TTS -> browser audio.
- Improve LangGraph state handling, prompt reliability, latency, LiveKit configuration, STT/TTS behavior, observability, and backend architecture according to the supplied engineering guides.
- Status: partially complete and actively failing in the real voice flow. The HTTP API and frontend load, but the user reported no interviewer response. The failure was reproduced far enough to identify several concrete voice-pipeline defects; fixes have not yet been implemented.

## Current State
- Workspace root: `/Users/angelonelson/CodexProjects/Rehearsal`.
- Branch: `main`, eight commits ahead of `origin/main`.
- Working tree was clean before adding this handover.
- API is currently reachable at `http://localhost:4000/health` and returns `{"status":"ok","service":"api"}`.
- Frontend is currently reachable at `http://localhost:5173` and returns HTML.
- A prior integrated startup had PostgreSQL, Redis, and LiveKit running through Docker Compose, plus API, report worker, voice worker, and Vite through `pnpm dev`.
- Current app processes are still running as of handover, but Docker service health was not rechecked in the final handover command.
- `.env` exists at the repo root and contains AWS and Deepgram credentials. Do not print or commit it.
- The project uses self-hosted LiveKit and explicitly pins local `v1-mini` turn detection.

## Completed Work
- Created a pnpm monorepo with:
  - `apps/web`: React/TypeScript/Tailwind frontend.
  - `apps/api`: Express API and BullMQ report worker.
  - `apps/voice`: LiveKit Agents voice worker and LangGraph interview engine.
  - `packages/contracts`: shared Zod contracts.
  - `packages/database`: Drizzle schema and migration.
- Implemented custom email/password authentication with Argon2id and JWT.
- Implemented candidate profile fields, interview creation/list/detail/completion, LiveKit room token issuance, transcript persistence, and report persistence.
- Implemented BullMQ/Redis report generation using AWS Bedrock.
- Implemented the first LangGraph version with separate evaluation, difficulty adjustment, route decision, and response generation nodes.
- Implemented Deepgram Nova-3 STT and Deepgram Aura-2 TTS.
- Implemented a voice-only React interview screen with LiveKit Components, room audio rendering, mute control, interviewer state, and animated orb.
- Implemented landing, signup/signin, dashboard, interview selection, live interview, and report pages.
- Added Dockerfiles for API and voice services, Compose for PostgreSQL/Redis/LiveKit, and Vercel routing for the frontend.
- Added a four-command local setup README.
- Added unit/UI tests:
  - API health and auth rejection.
  - LangGraph weak-answer follow-up and timed close.
  - Landing page content.
- Full build and test suite passed before the latest diagnosis:
  - `pnpm build`: passed.
  - `pnpm test`: five tests passed.
  - TypeScript checks passed.
- Browser QA previously verified:
  - Desktop and mobile landing page render.
  - Landing -> signup navigation.
  - No browser console warnings/errors in those screens.
  - Reference concept: `docs/design/rehearsal-ui-concept.png`.
- Added root `.env` loading for both backend services.
- Removed deprecated explicit Silero plugin usage; current LiveKit Agents bundles VAD.
- Added control-token cleanup and JSON-object extraction for Bedrock `gpt-oss` responses.
- Added graceful-shutdown guards after discovering duplicate signal handling.

## Important Files
- `apps/voice/src/agent.ts`: Current LiveKit worker, participant/session setup, Deepgram STT/TTS, transcript persistence, opening speech, and custom `llmNode`. This is the primary failing area.
- `apps/voice/src/interview-graph.ts`: LangGraph state, nodes, MemorySaver, routing, prompts, and `InterviewEngine`.
- `apps/voice/src/bedrock.ts`: AWS Bedrock Converse wrapper. It sanitizes control tokens and extracts JSON, but still needs retries, timeouts, schema-aware structured generation, and failure fallback.
- `apps/voice/src/prompts.ts`: Interview strategies and interviewer prompt. Needs deeper prompt engineering and concise voice-specific constraints.
- `apps/voice/src/config.ts`: Loads root `.env`, validates voice configuration, and populates LiveKit CLI environment variables.
- `apps/web/src/features/interviews/interview-page.tsx`: LiveKit browser room and microphone UI. It does not currently expose microphone publication, permission failure, room connection failure, agent availability, or retry controls.
- `apps/api/src/modules/interviews/service.ts`: Creates interview sessions and LiveKit access tokens.
- `apps/api/src/lib/bedrock.ts`: Report-generation Bedrock adapter.
- `apps/api/src/worker.ts`: BullMQ report worker.
- `packages/database/src/schema.ts`: Users, sessions, transcript turns, and reports.
- `packages/database/drizzle/0000_closed_speed_demon.sql`: Initial Drizzle migration.
- `compose.yaml`: Local PostgreSQL, Redis, and self-hosted LiveKit.
- `docker/livekit.yaml`: LiveKit server configuration.
- `README.md`: Local setup and architecture notes.
- `frontend_react_tailwind_engineering_guidelines(2).docx` in `/Users/angelonelson/Downloads`: frontend guide supplied by the user.
- `monolith_backend_codebase_design_guidelines_clean(3).docx` in `/Users/angelonelson/Downloads`: backend modular-monolith guide supplied by the user.

## Commands, Checks, and Outcomes
- `pnpm build`: passed for contracts, database, API, voice, and web before diagnosis.
- `pnpm test`: passed all five current tests before diagnosis.
- `curl http://localhost:4000/health`: currently passes.
- `curl -I http://localhost:5173`: currently returns HTTP 200.
- Real user/browser session:
  - Registration succeeded.
  - Interview creation returned HTTP 201.
  - LiveKit dispatched a voice-worker job.
  - Voice worker joined the correct room.
  - The candidate participant was linked.
- Critical LiveKit trace evidence:
  - At participant binding, `trackPublications: []`; no microphone track was present when the agent linked the participant.
  - No user transcription event was observed in the captured logs.
  - Deepgram opening TTS inference took roughly 9 seconds.
  - Opening audio forwarding did not finish for roughly 27 seconds, making the system feel unresponsive.
  - LiveKit adaptive interruption attempted `https://agent-gateway.livekit.cloud/v1` with self-hosted credentials and received HTTP 401, then fell back to VAD.
  - The local job executor later emitted unresponsive warnings.
  - The session eventually closed without a demonstrated candidate STT -> graph -> TTS turn.
- Bedrock checks:
  - Direct `gpt-oss` Converse connectivity succeeded.
  - Some responses included internal control delimiter tokens; sanitation was added.
  - JSON-only behavior is nondeterministic: one evaluation attempt returned conversational prose and failed JSON parsing, while a repeat returned valid JSON. Current extraction helps only when a JSON object is present.
- Database inspection was attempted after reproduction but hung while Docker/Desktop was under load. Transcript/report row state for the failed session remains unverified.
- Browser automation for the deeper audio flow timed out after the system became sluggish. A microphone-permission audio E2E has not yet passed.

## Decisions and Rationale
- Keep LangGraph rather than replacing it with a single prompt. The product requires explicit follow-up/advance/close branching, difficulty adjustment, and persistent session state.
- Keep AWS Bedrock open-weight models. Current low-latency model is `openai.gpt-oss-20b-1:0`; report model defaults to `openai.gpt-oss-120b-1:0`.
- Keep Deepgram for STT/TTS initially because credentials are configured and the plugins are supported by LiveKit Agents.
- Keep self-hosted LiveKit `v1-mini` turn detection as explicitly required by the user.
- Disable cloud-only adaptive interruption and use VAD interruption mode for self-hosted operation. Official LiveKit docs state adaptive interruption is a LiveKit Cloud feature.
- Treat PostgreSQL transcripts as the durable source of conversation history. LangGraph checkpoint usage must be corrected so history is not duplicated.
- Optimize for short spoken responses and fast first audio. The current opening is too long for a realtime product.
- Add deterministic boundary observability before further prompt tuning: microphone publication, STT final transcript, graph start/end and latency, Bedrock attempts, TTS first byte, and session errors.

## Bugs, Blockers, and Gotchas
- Primary reproduced bug: the agent linked a participant with no published microphone track and never demonstrated STT input.
- Frontend silently assumes the microphone is active. `LiveKitRoom audio` may request publication, but the UI does not verify or display publication state or permission errors.
- The mute state starts as `false` regardless of the actual LiveKit microphone publication/mute state.
- The frontend can show “Listening” even when no microphone track exists or the agent is absent.
- Opening speech is too long and the TTS path is slow enough to look dead.
- Adaptive interruption is incorrectly enabled by default in `dev` mode and hits LiveKit Cloud with self-hosted credentials, generating 401 errors.
- `InterviewEngine` currently combines `MemorySaver` with passing the entire accumulated history into a reducer on every invocation. This can duplicate history across turns and bloat prompts.
- `BedrockChat.json()` has no retry/repair strategy and model JSON compliance is nondeterministic.
- A graph or model exception can cause the custom `llmNode` to return no usable response; there is no spoken recovery fallback.
- There are no timeouts around Bedrock calls.
- There is no latency instrumentation for STT end-of-turn, graph nodes, LLM calls, or TTS first byte.
- Current tests do not exercise the real audio pipeline. They pass while the product is unusable.
- Report generation may run with an empty transcript; behavior and error state were not verified.
- The API module structure is only partially aligned with the supplied backend guide. Persistence and orchestration remain too concentrated in services/entry files.
- LiveKit documentation MCP was not available. Official `docs.livekit.io` web documentation was used instead.
- Docker/Desktop became sluggish during diagnosis; `docker compose exec` and later browser automation timed out. Check host CPU/memory and stale LiveKit job processes first.
- Do not expose JWTs, AWS credentials, Deepgram keys, or the contents of `.env` in logs or chat.

## Next Steps
1. Establish a deterministic audio feedback loop:
   - Inspect host CPU/process state.
   - Restart the dev stack cleanly.
   - Create a fresh interview.
   - Verify candidate microphone publication through browser LiveKit state and server logs.
   - Use browser microphone permission plus local macOS `say` output if necessary to feed real audio back into the microphone.
2. Add a failing integration-level assertion around “participant joined without microphone publication” and a frontend test for the disconnected/no-mic state.
3. Fix frontend audio readiness:
   - Explicitly call `localParticipant.setMicrophoneEnabled(true)` after room connection.
   - Catch permission/device errors.
   - Display connection, microphone publication, agent presence, and retry states.
   - Do not show “Listening” until a microphone track is published and the agent is connected.
4. Fix LiveKit session configuration:
   - Set `turnHandling.interruption.mode` to `"vad"` to avoid the cloud-only adaptive detector.
   - Keep `turnDetection: new inference.TurnDetector({ version: "v1-mini" })`.
   - Pass explicit `inputOptions` with `audioEnabled: true` and `participantIdentity`.
   - Consider waiting for a subscribed microphone publication with `waitForTrackPublication` before announcing readiness, with a bounded timeout and clear user-visible state.
5. Shorten opening speech to one sentence and one question, ideally under 20 words.
6. Add structured voice telemetry:
   - User input transcribed events.
   - Agent/user state changes.
   - LiveKit session error events.
   - Conversation item persistence errors.
   - Per-node and total graph latency.
   - Bedrock request attempts and durations.
   - TTS/STT metrics without logging secrets.
7. Harden Bedrock:
   - Add request timeout and bounded retries.
   - Pass the JSON schema explicitly with exact numeric ranges.
   - Add one JSON-repair retry using the model’s invalid output.
   - Add deterministic fallback evaluation and a spoken recovery question when inference fails.
8. Correct LangGraph state:
   - Do not append full history to a checkpointed reducer every turn.
   - Hydrate persisted history once per session, then append only the new candidate/interviewer turns.
   - Add tests proving history is not duplicated across at least three turns.
   - Add conditional graph edges so follow-up, advance, and close are explicit branch nodes rather than only an intent string inside one generation node.
9. Improve prompts:
   - Separate evaluation rubric by interview type.
   - Require evidence citations as short transcript snippets in internal evaluation.
   - Limit spoken output to 1-2 sentences and exactly one question.
   - Add anti-generic constraints and explicit criteria for follow-up versus move-on.
10. Run real E2E:
    - Hear the short opening.
    - Speak a vague answer.
    - Confirm final STT transcript.
    - Confirm follow-up route.
    - Hear a specific follow-up.
    - End session.
    - Confirm persisted transcript and report job.
11. Run full build/tests, remove temporary diagnostic logs, commit small verified fixes, and leave all services running.

## Suggested First Commands
```bash
cd /Users/angelonelson/CodexProjects/Rehearsal
git status --short --branch
ps -Ao pid,pcpu,pmem,command | sort -k2 -nr | head -20
docker compose ps
curl -fsS http://localhost:4000/health
curl -fsSI http://localhost:5173 | sed -n '1,4p'
pnpm test
```

## Open Questions
- Was the user’s browser microphone permission denied, missing, or granted but unpublished? This must be determined from actual LiveKit/browser state.
- Did the user hear any part of the delayed opening, or was browser audio autoplay also blocked?
- Did the failed session persist any interviewer transcript turn or generate a report from an empty transcript?
- Is `gpt-oss-20b` latency and JSON reliability acceptable after retries, or should the turn evaluator use another open-weight Bedrock model available in the configured region?
- Does the deployment target have enough CPU for the local `v1-mini` inference runner under concurrent LiveKit/Docker load?
