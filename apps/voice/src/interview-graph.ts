import { Annotation, END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import type { InterviewType } from "@rehearsal/contracts";
import { z } from "zod";
import type { BedrockChat } from "./bedrock.js";
import { interviewerSystem, strategies } from "./prompts.js";

export type Turn = { role: "candidate" | "interviewer"; content: string };
const evaluationSchema = z.object({
  score: z.number().min(0).max(100),
  completeness: z.enum(["weak", "adequate", "strong"]),
  missing: z.array(z.string()).default([]),
  interesting: z.array(z.string()).default([]),
  shouldFollowUp: z.boolean(),
  rationale: z.string()
});

const InterviewState = Annotation.Root({
  type: Annotation<InterviewType>(),
  role: Annotation<string>(),
  level: Annotation<string>(),
  history: Annotation<Turn[]>({ reducer: (current, next) => current.concat(next), default: () => [] }),
  latestAnswer: Annotation<string>(),
  evaluation: Annotation<z.infer<typeof evaluationSchema>>(),
  difficulty: Annotation<number>({ reducer: (_current, next) => next, default: () => 1 }),
  stage: Annotation<"opening" | "core" | "closing">({ reducer: (_current, next) => next, default: () => "opening" }),
  route: Annotation<"follow_up" | "advance" | "close">(),
  response: Annotation<string>(),
  startedAt: Annotation<number>(),
  durationMinutes: Annotation<number>()
});
type State = typeof InterviewState.State;

export function createInterviewGraph(model: BedrockChat) {
  const evaluate = async (state: State) => {
    let evaluation: z.infer<typeof evaluationSchema>;
    try {
      evaluation = evaluationSchema.parse(await model.json(
        `You evaluate only the candidate's latest interview answer. Be evidence-based. ${strategies[state.type]}`,
        `Interview: ${state.type}; role: ${state.role}; level: ${state.level}
Conversation:
${formatHistory(state.history)}
Latest answer: ${state.latestAnswer}
Return {score, completeness, missing, interesting, shouldFollowUp, rationale}. A follow-up is required when the answer lacks concrete evidence, contains a contradiction, or exposes an important unresolved thread.`,
        evaluationSchema
      ));
    } catch {
      evaluation = fallbackEvaluation(state.latestAnswer);
    }
    return { evaluation };
  };

  const adjustDifficulty = (state: State) => ({
    difficulty: Math.max(1, Math.min(5, state.difficulty + (state.evaluation.score >= 80 ? 1 : state.evaluation.score < 45 ? -1 : 0)))
  });

  const decide = (state: State) => {
    const elapsed = (Date.now() - state.startedAt) / 60_000;
    const candidateTurns = state.history.filter((turn) => turn.role === "candidate").length;
    const route = elapsed >= state.durationMinutes || candidateTurns >= 10
      ? "close" as const
      : state.evaluation.shouldFollowUp
        ? "follow_up" as const
        : "advance" as const;
    return { route, stage: route === "close" ? "closing" as const : "core" as const };
  };

  const generateFor = (route: State["route"]) => async (state: State) => {
    const intent = route === "follow_up"
      ? `Probe this answer. Missing evidence: ${state.evaluation.missing.join(", ")}. Interesting threads: ${state.evaluation.interesting.join(", ")}. Quote or paraphrase one concrete detail from the candidate before asking the follow-up.`
      : route === "close"
        ? "Close the interview naturally. Thank the candidate and explain that their report will be prepared. Do not ask another question."
        : `Move to a distinct competency at difficulty ${state.difficulty}/5 while connecting naturally to one detail in the candidate's answer.`;
    let response: string;
    try {
      response = await model.text(
        interviewerSystem(state.type, state.role, state.level),
        `${intent}\nFull conversation:\n${formatHistory(state.history)}`
      );
    } catch {
      response = fallbackResponse(route, state);
    }
    return { response, history: [{ role: "interviewer" as const, content: response }] };
  };

  return new StateGraph(InterviewState)
    .addNode("evaluate", evaluate)
    .addNode("adjust_difficulty", adjustDifficulty)
    .addNode("decide", decide)
    .addNode("follow_up", generateFor("follow_up"))
    .addNode("advance", generateFor("advance"))
    .addNode("close", generateFor("close"))
    .addEdge(START, "evaluate")
    .addEdge("evaluate", "adjust_difficulty")
    .addEdge("adjust_difficulty", "decide")
    .addConditionalEdges("decide", (state) => state.route, {
      follow_up: "follow_up",
      advance: "advance",
      close: "close"
    })
    .addEdge("follow_up", END)
    .addEdge("advance", END)
    .addEdge("close", END)
    .compile({ checkpointer: new MemorySaver() });
}

export class InterviewEngine {
  private initialized = false;

  constructor(private graph: ReturnType<typeof createInterviewGraph>) {}

  async opening(input: { sessionId: string; type: InterviewType; role: string; level: string; durationMinutes: number }) {
    return `Hi, I'm Mara. For about ${input.durationMinutes} minutes, we'll focus on ${input.type.replace("_", " ")} skills for the ${input.role} role. What recent experience best shows how you approach this work?`;
  }

  async next(input: { sessionId: string; type: InterviewType; role: string; level: string; durationMinutes: number; startedAt: number; history: Turn[]; answer: string }) {
    const result = await this.graph.invoke({
      type: input.type, role: input.role, level: input.level, durationMinutes: input.durationMinutes,
      startedAt: input.startedAt,
      history: this.initialized
        ? [{ role: "candidate", content: input.answer }]
        : [...input.history, { role: "candidate", content: input.answer }],
      latestAnswer: input.answer
    }, { configurable: { thread_id: input.sessionId } });
    this.initialized = true;
    return result.response;
  }
}

function formatHistory(history: Turn[]) {
  return history.slice(-20).map((turn) => `${turn.role}: ${turn.content}`).join("\n");
}

function fallbackEvaluation(answer: string): z.infer<typeof evaluationSchema> {
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  const hasEvidence = /\b\d+(?:\.\d+)?%?\b|\b(because|result|impact|measured|learned|changed)\b/i.test(answer);
  const weak = wordCount < 18 || !hasEvidence;
  return {
    score: weak ? 35 : 65,
    completeness: weak ? "weak" : "adequate",
    missing: weak ? ["a specific action you personally took", "a concrete result or lesson"] : [],
    interesting: [],
    shouldFollowUp: weak,
    rationale: weak ? "The answer lacks enough concrete evidence to evaluate." : "The answer contains usable evidence."
  };
}

function fallbackResponse(route: State["route"], state: State) {
  if (route === "close") {
    return "Thank you for your time. Your feedback report will be prepared from our conversation.";
  }
  const detail = state.latestAnswer.replace(/\s+/g, " ").trim().slice(0, 90);
  if (route === "follow_up") {
    return `You said, "${detail}" What specific action did you personally take?`;
  }
  const focus = state.type === "technical"
    ? "the most important edge case"
    : state.type === "system_design"
      ? "the tradeoff that most influenced your design"
      : state.type === "culture_fit"
        ? "a decision that tested those values"
        : "a different example that shows your impact";
  return `Building on "${detail}," what is ${focus}?`;
}
