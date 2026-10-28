/**
 * Muse Wonder: one question, any number of images, a JSON answer.
 */
import { readFile } from "node:fs/promises";
import { metaFetch } from "./metaClient";

export const MUSE_WONDER_MODEL = "muse-wonder-1.0";

async function asDataUrl(path: string): Promise<string> {
  const bytes = await readFile(path);
  const mime = path.endsWith(".webp") ? "image/webp" : path.endsWith(".jpg") ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

/** Ask with images attached in the given order. Returns the raw text reply. */
export async function askWonder(question: string, imagePaths: string[]): Promise<string> {
  const images = await Promise.all(imagePaths.map(asDataUrl));
  const res = await metaFetch("/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MUSE_WONDER_MODEL,
      input: [
        {
          type: "message",
          role: "user",
          content: [
            { type: "input_text", text: question },
            ...images.map((image_url) => ({ type: "input_image", image_url })),
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Muse Wonder request failed (${res.status}): ${await res.text()}`);

  const json = (await res.json()) as { output?: Array<{ content?: Array<{ text?: string }> }> };
  return (json.output ?? [])
    .flatMap((o) => o.content ?? [])
    .map((c) => c.text)
    .filter(Boolean)
    .join("\n");
}

/**
 * Pull the first JSON object out of a reply. The model is asked for strict JSON
 * and usually complies, but a model is not a parser: prose or a code fence
 * around the object is tolerated.
 */
export function extractJson(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error(`No JSON in reply: ${text.slice(0, 200)}`);
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error(`Malformed JSON in reply: ${text.slice(start, start + 200)}`);
  }
}

export const str = (v: unknown): string => (typeof v === "string" ? v : "");
export const num = (v: unknown): number => (typeof v === "number" ? v : 0);
