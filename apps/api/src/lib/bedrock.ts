import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";

const reportSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  summary: z.string(),
  strengths: z.array(z.string()).min(2).max(6),
  improvements: z.array(z.string()).min(2).max(6),
  competencies: z.record(z.number().int().min(0).max(100)),
  detailedFeedback: z.array(z.object({ topic: z.string(), feedback: z.string() })).min(2).max(8)
});

type BedrockClient = { send: BedrockRuntimeClient["send"] };
type BedrockOptions = { client?: BedrockClient; timeoutMs?: number; maxAttempts?: number };

export class BedrockService {
  private client: BedrockClient;
  private timeoutMs: number;
  private maxAttempts: number;

  constructor(
    private modelId: string,
    region: string,
    credentials?: { accessKeyId: string; secretAccessKey: string },
    options: BedrockOptions = {}
  ) {
    this.client = options.client ?? new BedrockRuntimeClient({ region, ...(credentials ? { credentials } : {}) });
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxAttempts = options.maxAttempts ?? 2;
  }

  async generateReport(context: string) {
    const system = "You are a rigorous interview assessor. Ground every observation in the transcript. Never invent evidence. Return only one valid JSON object with no markdown.";
    const prompt = `Assess this interview. Return this exact contract:
{
  "overallScore": integer 0-100,
  "summary": string,
  "strengths": 2-6 evidence-based strings,
  "improvements": 2-6 actionable strings,
  "competencies": object mapping competency names to integer scores 0-100,
  "detailedFeedback": 2-8 objects with string "topic" and string "feedback"
}

${context}`;
    const first = await this.request(system, prompt, 0.2);
    try {
      return parseReport(first);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "invalid report";
      const repaired = await this.request(
        system,
        `Repair the invalid report below to match the exact contract. Preserve only claims supported by the transcript.\nValidation error: ${reason}\nInvalid report:\n${first.slice(0, 8_000)}\nOriginal request:\n${prompt}`,
        0
      );
      return parseReport(repaired);
    }
  }

  private async request(system: string, prompt: string, temperature: number) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const response = await this.client.send(new ConverseCommand({
          modelId: this.modelId,
          system: [{ text: system }],
          messages: [{ role: "user", content: [{ text: prompt }] }],
          inferenceConfig: { maxTokens: 3000, temperature }
        }), { abortSignal: AbortSignal.timeout(this.timeoutMs) });
        const text = response.output?.message?.content?.find((block) => "text" in block)?.text;
        if (!text) throw new Error("Bedrock returned no report");
        const cleaned = sanitize(text);
        if (!cleaned) throw new Error("Bedrock returned only control tokens");
        return cleaned;
      } catch (error) {
        lastError = error;
        if (attempt < this.maxAttempts) await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Bedrock report request failed");
  }
}

function sanitize(value: string) {
  return value.replace(/<\|[^|>]+\|>/g, "").replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
}

function parseReport(value: string) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Bedrock returned no report JSON");
  return reportSchema.parse(JSON.parse(value.slice(start, end + 1)));
}
