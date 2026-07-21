import type { IntentName, ParsedIntent } from "../telegramTypes.js";

const CONFIRM_RE = /^(yes|y|confirm|ok|okay|sure)$/i;
const CANCEL_RE = /^(no|n|cancel|abort|stop)$/i;

function emptyArgs(): Record<string, string | undefined> {
  return {};
}

function stripBotMention(text: string): string {
  // Only strip Telegram @username mentions, not email addresses (user@host).
  // Preserve newlines so multi-line bulk pastes still parse.
  return text
    .replace(/(^|[\s,])@\w+/gm, "$1")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

function parseKeyValueTail(tail: string): Record<string, string | undefined> {
  const args = emptyArgs();
  // "Name, email@x.com, College" or "name=X email=Y college=Z"
  if (/=/.test(tail)) {
    const parts = tail.split(/[\s,]+/).filter(Boolean);
    for (const part of parts) {
      const m = part.match(/^(\w+)=(.+)$/i);
      if (m) {
        const key = m[1].toLowerCase();
        if (key === "name" || key === "email" || key === "college" || key === "university" || key === "major") {
          args[key === "university" ? "college" : key] = m[2].trim();
        }
      }
    }
    return args;
  }

  const segments = tail
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length >= 1) args.name = segments[0];
  if (segments.length >= 2) {
    if (segments[1].includes("@")) args.email = segments[1];
    else args.college = segments[1];
  }
  if (segments.length >= 3) {
    if (args.email) args.college = segments[2];
    else if (segments[2].includes("@")) args.email = segments[2];
    else args.major = segments[2];
  }
  if (segments.length >= 4 && !args.major) args.major = segments[3];
  return args;
}

function commandIntent(text: string): ParsedIntent | null {
  const raw = stripBotMention(text);
  if (!raw.startsWith("/")) return null;

  const [cmdPart, ...restParts] = raw.slice(1).split(/\s+/);
  const cmd = (cmdPart.split("@")[0] ?? "").toLowerCase();
  const rest = restParts.join(" ").trim();
  const args = emptyArgs();

  const map: Record<string, IntentName> = {
    start: "help",
    help: "help",
    stats: "stats",
    health: "health",
    status: "health",
    find: "find_student",
    search: "find_student",
    list: "list_students",
    today: "list_today",
    inactive: "list_inactive",
    create: "create_student",
    add: "create_student",
    delete: "delete_student",
    remove: "delete_student",
    suspend: "suspend_student",
    reactivate: "reactivate_student",
    activate: "reactivate_student",
    college: "change_college",
    nfc: "generate_nfc",
    nfcgen: "generate_nfc",
    nfcregen: "regenerate_nfc",
    nfcdisable: "disable_nfc",
    nfcenable: "enable_nfc",
    nfcurl: "nfc_url",
    import: "bulk_import",
    yes: "confirm",
    confirm: "confirm",
    cancel: "cancel",
  };

  const intent = map[cmd];
  if (!intent) {
    return { intent: "unknown", confidence: 0.2, args, raw, source: "command" };
  }

  if (intent === "create_student" && rest) {
    Object.assign(args, parseKeyValueTail(rest));
  } else if (intent === "change_college" && rest) {
    const parts = rest.split(/\s+to\s+|\s*,\s*/i);
    if (parts.length >= 2) {
      args.query = parts[0].trim();
      args.college = parts.slice(1).join(" ").trim();
    } else {
      args.query = rest;
    }
  } else if (
    [
      "find_student",
      "delete_student",
      "suspend_student",
      "reactivate_student",
      "generate_nfc",
      "regenerate_nfc",
      "disable_nfc",
      "enable_nfc",
      "nfc_url",
    ].includes(intent)
  ) {
    args.query = rest || undefined;
  } else if (intent === "list_students" || intent === "list_by_college") {
    if (rest) {
      args.college = rest;
      return { intent: "list_by_college", confidence: 0.95, args, raw, source: "command" };
    }
  } else if (intent === "bulk_import") {
    args.payload = rest || undefined;
  }

  return { intent, confidence: 0.95, args, raw, source: "command" };
}

function patternIntent(text: string): ParsedIntent {
  const raw = stripBotMention(text);
  const lower = raw.toLowerCase();
  const args = emptyArgs();

  if (CONFIRM_RE.test(raw)) {
    return { intent: "confirm", confidence: 0.99, args, raw, source: "pattern" };
  }
  if (CANCEL_RE.test(raw)) {
    return { intent: "cancel", confidence: 0.99, args, raw, source: "pattern" };
  }

  // Multi-line bulk paste detection (run early — before single-line patterns)
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) {
    const looksLikeRows = lines.filter(
      (l) => /,/.test(l) || /@/.test(l) || /\t/.test(l),
    ).length;
    if (looksLikeRows >= 2) {
      args.payload = raw;
      return { intent: "bulk_import", confidence: 0.85, args, raw, source: "pattern" };
    }
  }

  const patterns: Array<{ re: RegExp; intent: IntentName; extract?: (m: RegExpMatchArray) => void }> = [
    {
      re: /^(?:help|\?|commands|what can you do)/i,
      intent: "help",
    },
    {
      re: /(?:show|get|system)?\s*stats|statistics|dashboard numbers/i,
      intent: "stats",
    },
    {
      re: /(?:health|server status|api status|db status)/i,
      intent: "health",
    },
    {
      re: /(?:registered|registrations?)\s+today|today'?s\s+registrations?/i,
      intent: "list_today",
    },
    {
      re: /(?:list|show)\s+inactive|inactive\s+students/i,
      intent: "list_inactive",
    },
    {
      re: /(?:list|show)\s+students?\s+(?:at|in|from|for)\s+(.+)/i,
      intent: "list_by_college",
      extract: (m) => {
        args.college = m[1].trim();
      },
    },
    {
      re: /(?:list|show)\s+all\s+students|list\s+students/i,
      intent: "list_students",
    },
    {
      re: /(?:find|search|look up|who is)\s+(.+)/i,
      intent: "find_student",
      extract: (m) => {
        args.query = m[1].trim();
      },
    },
    {
      re: /(?:add|create|register)\s+student\s+(.+)/i,
      intent: "create_student",
      extract: (m) => Object.assign(args, parseKeyValueTail(m[1])),
    },
    {
      re: /(?:delete|remove)\s+student\s+(.+)/i,
      intent: "delete_student",
      extract: (m) => {
        args.query = m[1].trim();
      },
    },
    {
      re: /(?:suspend|deactivate)\s+(?:student\s+)?(.+)/i,
      intent: "suspend_student",
      extract: (m) => {
        args.query = m[1].trim();
      },
    },
    {
      re: /(?:reactivate|unsuspend|activate)\s+(?:student\s+)?(.+)/i,
      intent: "reactivate_student",
      extract: (m) => {
        args.query = m[1].trim();
      },
    },
    {
      re: /(?:change|move)\s+(?:college|university)\s+(?:for\s+)?(.+?)\s+to\s+(.+)/i,
      intent: "change_college",
      extract: (m) => {
        args.query = m[1].trim();
        args.college = m[2].trim();
      },
    },
    {
      re: /(?:regenerate|reset)\s+nfc(?:\s+(?:for|of))?\s+(.+)/i,
      intent: "regenerate_nfc",
      extract: (m) => {
        args.query = m[1].trim();
      },
    },
    {
      re: /(?:disable|deactivate)\s+nfc(?:\s+(?:for|of))?\s+(.+)/i,
      intent: "disable_nfc",
      extract: (m) => {
        args.query = m[1].trim();
      },
    },
    {
      re: /(?:enable|activate)\s+nfc(?:\s+(?:for|of))?\s+(.+)/i,
      intent: "enable_nfc",
      extract: (m) => {
        args.query = m[1].trim();
      },
    },
    {
      re: /(?:nfc\s+url|profile\s+url|qr)(?:\s+(?:for|of))?\s+(.+)/i,
      intent: "nfc_url",
      extract: (m) => {
        args.query = m[1].trim();
      },
    },
    {
      re: /(?:generate|create|issue)\s+nfc(?:\s+(?:for|of|profile))?\s+(.+)/i,
      intent: "generate_nfc",
      extract: (m) => {
        args.query = m[1].trim();
      },
    },
    {
      re: /(?:import|bulk)\s+(?:students?)?/i,
      intent: "bulk_import",
      extract: () => {
        args.payload = raw;
      },
    },
  ];

  for (const p of patterns) {
    const m = raw.match(p.re) ?? lower.match(p.re);
    if (m) {
      p.extract?.(m);
      return { intent: p.intent, confidence: 0.8, args, raw, source: "pattern" };
    }
  }

  // Heuristic: single email → find
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    args.query = raw;
    return { intent: "find_student", confidence: 0.7, args, raw, source: "pattern" };
  }

  return { intent: "unknown", confidence: 0.1, args, raw, source: "pattern" };
}

/**
 * Offline-capable intent parser (commands + keyword/pattern matching).
 * Optional AI enrichment is layered in aiParser.ts when OPENAI_API_KEY is set.
 */
export function parseIntent(text: string): ParsedIntent {
  const trimmed = text.trim();
  if (!trimmed) {
    return { intent: "unknown", confidence: 0, args: {}, raw: text, source: "pattern" };
  }

  const fromCommand = commandIntent(trimmed);
  if (fromCommand && fromCommand.intent !== "unknown") return fromCommand;

  const fromPattern = patternIntent(trimmed);
  if (fromPattern.intent !== "unknown") return fromPattern;

  return fromCommand ?? fromPattern;
}

export function isConfirmText(text: string): boolean {
  return CONFIRM_RE.test(text.trim());
}

export function isCancelText(text: string): boolean {
  return CANCEL_RE.test(text.trim());
}
