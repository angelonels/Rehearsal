import type { InterviewType } from "@rehearsal/contracts";

type TranscriptTurn = {
  speaker: "candidate" | "interviewer";
  content: string;
};

type ReportModel = {
  generateReport(context: string): Promise<InterviewReport>;
};

export type InterviewReport = {
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  competencies: Record<string, number>;
  detailedFeedback: Array<{ topic: string; feedback: string }>;
};

export async function generateSessionReport(
  session: { type: InterviewType; targetRole: string; transcriptTurns: TranscriptTurn[] },
  model: ReportModel
): Promise<InterviewReport> {
  const candidateTurns = session.transcriptTurns.filter((turn) => turn.speaker === "candidate" && turn.content.trim());
  if (candidateTurns.length === 0) return insufficientEvidenceReport();
  const transcript = session.transcriptTurns
    .map((turn) => `${turn.speaker}: ${turn.content.trim()}`)
    .join("\n");
  return model.generateReport(
    `Interview type: ${session.type}\nTarget role: ${session.targetRole}\nTranscript:\n${transcript}`
  );
}

function insufficientEvidenceReport(): InterviewReport {
  return {
    overallScore: 0,
    summary: "There was not enough candidate speech to assess this interview fairly. No strengths or competency scores have been inferred.",
    strengths: [],
    improvements: [
      "Complete at least one full answer so the interviewer has evidence to evaluate.",
      "Confirm that the microphone status says Listening before you begin speaking."
    ],
    competencies: { evidence_available: 0 },
    detailedFeedback: [{
      topic: "Insufficient evidence",
      feedback: "The transcript contains no candidate answer. Start another session, confirm microphone access, and answer at least one question before ending."
    }]
  };
}
