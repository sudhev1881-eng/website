import { getEnv } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import type { IntentName, ParsedIntent } from "../telegramTypes.js";
import { parseIntent } from "./intentParser.js";

const VALID_INTENTS: ReadonlySet<string> = new Set([
  "help",
  "create_student",
  "delete_student",
  "suspend_student",
  "reactivate_student",
  "change_college",
  "find_student",
  "list_students",
  "list_by_college",
  "list_inactive",
  "list_today",
  "bulk_import",
  "generate_nfc",
  "regenerate_nfc",
  "disable_nfc",
  "enable_nfc",
  "nfc_url",
  "stats",
  "health",
  "confirm",
  "cancel",
  "unknown",
]);

/**
 * Resolve intent using pattern parser first; optionally refine with OpenAI when configured.
 * Never requires an external AI API for core commands.
 */
export async function resolveIntent(text: string): Promise<ParsedIntent> {
  const base = parseIntent(text);
  if (base.intent !== "unknown" || base.confidence >= 0.7) {
    return base;
  }

  const apiKey = getEnv().OPENAI_API_KEY;
  if (!apiKey) return base;

  try {
    const ai = await parseWithOpenAI(text, apiKey);
    if (ai && ai.intent !== "unknown") return ai;
  } catch (err) {
    logger.warn("OpenAI intent parse failed; using pattern result", {
      message: (err as Error).message,
    });
  }
  return base;
}

async function parseWithOpenAI(text: string, apiKey: string): Promise<ParsedIntent | null> {
  const model = getEnv().OPENAI_MODEL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You parse StudentLink admin Telegram messages into JSON:
{"intent":"<one of: ${[...VALID_INTENTS].join(", ")}>",
 "args":{"name":"","email":"","college":"","major":"","query":"","payload":""},
 "confidence":0.0}
Only use known intents. Prefer unknown if unsure.`,
          },
          { role: "user", content: text },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as {
      intent?: string;
      args?: Record<string, string | undefined>;
      confidence?: number;
    };

    const intent = (parsed.intent ?? "unknown") as IntentName;
    if (!VALID_INTENTS.has(intent)) return null;

    return {
      intent,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.75,
      args: parsed.args ?? {},
      raw: text,
      source: "ai",
    };
  } finally {
    clearTimeout(timer);
  }
}
