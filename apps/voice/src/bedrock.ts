import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

export class BedrockChat {
  private client: BedrockRuntimeClient;
  constructor(private modelId: string, region: string, credentials?: { accessKeyId: string; secretAccessKey: string }) {
    this.client = new BedrockRuntimeClient({ region, ...(credentials ? { credentials } : {}) });
  }

  async text(system: string, prompt: string, temperature = 0.4) {
    const response = await this.client.send(new ConverseCommand({
      modelId: this.modelId,
      system: [{ text: system }],
      messages: [{ role: "user", content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens: 900, temperature }
    }));
    const text = response.output?.message?.content?.find((block) => "text" in block)?.text;
    if (!text) throw new Error("Bedrock returned no text");
    return text.trim();
  }

  async json<T>(system: string, prompt: string): Promise<T> {
    const text = await this.text(`${system}\nReturn only valid JSON with no markdown fence.`, prompt, 0.1);
    return JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as T;
  }
}
