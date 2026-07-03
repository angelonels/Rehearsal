import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import type { z } from "zod";

type BedrockClient = { send: BedrockRuntimeClient["send"] };
type BedrockChatOptions = {
  client?: BedrockClient;
  timeoutMs?: number;
  maxAttempts?: number;
};

export class BedrockChat {
  private client: BedrockClient;
  private timeoutMs: number;
  private maxAttempts: number;

  constructor(
    private modelId: string,
    region: string,
    credentials?: { accessKeyId: string; secretAccessKey: string },
    options: BedrockChatOptions = {}
  ) {
    this.client = options.client ?? new BedrockRuntimeClient({ region, ...(credentials ? { credentials } : {}) });
    this.timeoutMs = options.timeoutMs ?? 12_000;
    this.maxAttempts = options.maxAttempts ?? 2;
  }

  async text(system: string, prompt: string, temperature = 0.4) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const response = await this.client.send(new ConverseCommand({
          modelId: this.modelId,
          system: [{ text: system }],
          messages: [{ role: "user", content: [{ text: prompt }] }],
          inferenceConfig: { maxTokens: 900, temperature }
        }), { abortSignal: AbortSignal.timeout(this.timeoutMs) });
        const text = response.output?.message?.content?.find((block) => "text" in block)?.text;
        if (!text) throw new Error("Bedrock returned no text");
        const cleaned = sanitize(text);
        if (!cleaned) throw new Error("Bedrock returned only control tokens");
        return cleaned;
      } catch (error) {
        lastError = error;
        if (attempt < this.maxAttempts) await delay(100 * attempt);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Bedrock request failed");
  }

  async json<T>(system: string, prompt: string, schema?: z.ZodType<T>): Promise<T> {
    const jsonSystem = `${system}\nReturn only one valid JSON object with no markdown fence or commentary.`;
    const first = await this.text(jsonSystem, prompt, 0.1);
    try {
      return parseJson(first, schema);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "invalid JSON";
      const repaired = await this.text(
        jsonSystem,
        `Repair the invalid response below so it satisfies the requested contract. Preserve supported facts and correct invalid types or ranges.\nValidation error: ${reason}\nInvalid response:\n${first.slice(0, 4_000)}\nOriginal request:\n${prompt}`,
        0
      );
      return parseJson(repaired, schema);
    }
  }
}

function sanitize(value: string) {
  return value.replace(/<\|[^|>]+\|>/g, "").replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
}

function parseJson<T>(value: string, schema?: z.ZodType<T>): T {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Bedrock returned no JSON object");
  const parsed: unknown = JSON.parse(value.slice(start, end + 1));
  return schema ? schema.parse(parsed) : parsed as T;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
