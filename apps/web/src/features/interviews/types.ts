export type Report = { overallScore: number; summary: string; strengths: string[]; improvements: string[]; competencies: Record<string, number>; detailedFeedback: Array<{ topic: string; feedback: string }> };
export type Session = { id: string; type: "behavioral" | "technical" | "system_design" | "culture_fit"; targetRole: string; status: string; durationMinutes: number; createdAt: string; report?: Report | null };
export type SessionConnection = { session: Session; connection: { url: string; token: string } };
