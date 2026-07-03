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

export class BedrockService {
  private client: BedrockRuntimeClient;
  constructor(private modelId: string, region: string, credentials?: { accessKeyId: string; secretAccessKey: string }) {
    this.client = new BedrockRuntimeClient({ region, ...(credentials ? { credentials } : {}) });
  }

  async generateReport(context: string) {
    const response = await this.client.send(new ConverseCommand({
      modelId: this.modelId,
      system: [{ text: "You are a rigorous interview assessor. Return only valid JSON matching the requested schema. Ground every observation in the transcript." }],
      messages: [{ role: "user", content: [{ text: `Assess this interview. Schema: ${JSON.stringify(reportSchema.shape)}\n\n${context}` }] }],
      inferenceConfig: { maxTokens: 3000, temperature: 0.2 }
    }));
    const text = response.output?.message?.content?.find((block) => "text" in block)?.text;
    if (!text) throw new Error("Bedrock returned no report");
    return reportSchema.parse(JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")));
  }
}
