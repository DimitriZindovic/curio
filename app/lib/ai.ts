import Anthropic from "@anthropic-ai/sdk";
import { logWarn, errorMessage } from "@/app/lib/logger";

const MODEL = "claude-sonnet-4-6";
// Plafond grossier de caractères envoyés au modèle (~ quelques milliers de tokens).
const MAX_INPUT_CHARS = 24000;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY n'est pas configuré.");
  }
  client ??= new Anthropic();
  return client;
}

function truncate(text: string): string {
  return text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text;
}

/** Concatène le texte des blocs `text` d'une réponse Claude. */
function textOf(content: { type: string; text?: string }[]): string {
  return content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
}

const TAGS_SCHEMA = {
  type: "object",
  properties: { tags: { type: "array", items: { type: "string" } } },
  required: ["tags"],
  additionalProperties: false,
};

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as { tags?: unknown };
    if (!Array.isArray(parsed.tags)) return [];
    return parsed.tags
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 6);
  } catch (err) {
    // Sortie LLM non-JSON : repli sur « aucun tag », mais tracé.
    logWarn("ai", "réponse tags illisible (JSON invalide)", {
      cause: errorMessage(err),
    });
    return [];
  }
}

/** Résume un article en 3-4 phrases, en français. */
export async function summarize(content: string): Promise<string> {
  const text = truncate(content.trim());
  if (!text) return "";

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    system:
      "Tu es un assistant de veille technologique. Résume l'article fourni en 3 à 4 phrases claires, en français, ton neutre et factuel. Ne commence pas par « Voici » ou « Cet article ». Va droit au contenu.",
    messages: [{ role: "user", content: text }],
  });

  return textOf(response.content).trim();
}

/**
 * Suggère 3 à 6 tags pertinents. Réutilise les tags existants quand c'est
 * pertinent. Renvoie une liste de labels (structured output).
 */
export async function suggestTags(
  content: string,
  existingTags: string[],
): Promise<string[]> {
  const text = truncate(content.trim());
  if (!text) return [];

  const existing = existingTags.length ? existingTags.join(", ") : "(aucun)";
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 512,
    thinking: { type: "adaptive" },
    system:
      "Tu proposes des tags thématiques courts (1-2 mots, en minuscules) pour classer des articles de veille technologique. Réutilise en priorité les tags existants fournis quand ils conviennent.",
    messages: [
      { role: "user", content: `Tags existants : ${existing}\n\nArticle :\n${text}` },
    ],
    output_config: { format: { type: "json_schema", schema: TAGS_SCHEMA } },
  });

  return parseTags(textOf(response.content));
}
