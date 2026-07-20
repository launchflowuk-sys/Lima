import OpenAI from "openai";
import { env } from "@/env";
import { ClassificationSchema } from "./schemas";
import { buildClassificationSystemPrompt, buildClassificationUserPrompt, CLASSIFICATION_PROMPT_VERSION } from "./prompt";
import type { AiProvider, ClassifyInput, ClassifyResult } from "./provider";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  if (!client) client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}

/** OpenAI-backed classifier. Requests JSON, then validates it against ClassificationSchema before
 *  returning — a malformed or hallucinated shape throws rather than silently propagating. */
export class OpenAiProvider implements AiProvider {
  async classify(input: ClassifyInput): Promise<ClassifyResult> {
    const model = env.OPENAI_MODEL_CLASSIFICATION;
    const res = await getClient().chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildClassificationSystemPrompt() },
        { role: "user", content: buildClassificationUserPrompt(input) },
      ],
    });

    const content = res.choices[0]?.message?.content ?? "{}";
    const classification = ClassificationSchema.parse(JSON.parse(content));

    return {
      classification,
      usage: {
        model,
        promptTokens: res.usage?.prompt_tokens,
        completionTokens: res.usage?.completion_tokens,
      },
      promptVersion: CLASSIFICATION_PROMPT_VERSION,
    };
  }
}
