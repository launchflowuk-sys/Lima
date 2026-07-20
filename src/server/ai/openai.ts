import OpenAI from "openai";
import { env } from "@/env";
import { ClassificationSchema } from "./schemas";
import {
  buildClassificationSystemPrompt,
  buildClassificationUserPrompt,
  CLASSIFICATION_PROMPT_VERSION,
  buildReplySystemPrompt,
  buildReplyUserPrompt,
  REPLY_PROMPT_VERSION,
} from "./prompt";
import type { AiProvider, ClassifyInput, ClassifyResult, GenerateReplyInput, GenerateReplyResult } from "./provider";

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

  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
    const model = env.OPENAI_MODEL_REPLY;
    const res = await getClient().chat.completions.create({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: buildReplySystemPrompt() },
        { role: "user", content: buildReplyUserPrompt(input) },
      ],
    });
    const bodyText = res.choices[0]?.message?.content?.trim() ?? "";
    return {
      bodyText,
      usage: { model, promptTokens: res.usage?.prompt_tokens, completionTokens: res.usage?.completion_tokens },
      promptVersion: REPLY_PROMPT_VERSION,
    };
  }

  /** Embed texts for knowledge retrieval. Empty input short-circuits (no API call). */
  async embedText(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await getClient().embeddings.create({
      model: env.OPENAI_MODEL_EMBEDDING,
      input: texts,
    });
    // The API returns items with an `index`; sort so output order matches input order.
    return [...res.data].sort((a, b) => a.index - b.index).map((d) => d.embedding as number[]);
  }
}
