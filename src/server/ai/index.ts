import type { AiProvider } from "./provider";
import { OpenAiProvider } from "./openai";

let provider: AiProvider | null = null;

/** The active AI provider. Swap here to add another backend; callers depend only on AiProvider. */
export function getAiProvider(): AiProvider {
  if (!provider) provider = new OpenAiProvider();
  return provider;
}

export type { AiProvider };
