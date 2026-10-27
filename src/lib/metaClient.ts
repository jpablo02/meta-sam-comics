/**
 * Meta Model API client.
 *
 * The API is drop-in compatible with the OpenAI SDK, so the only thing that
 * changes is the base URL. The SDK does not read our env var on its own, so the
 * key is passed explicitly.
 */
import OpenAI from "openai";

export const META_BASE_URL = "https://api.meta.ai/v1";

export const SAM_MODEL = "sam-3.1";
export const MUSE_IMAGE_MODEL = "muse-image-1.0";

function requireKey(): string {
  const key = process.env.META_API_KEY;
  if (!key) {
    throw new Error(
      "META_API_KEY is not set. Copy .env.example to .env.local and put your key there.",
    );
  }
  return key;
}

let client: OpenAI | null = null;

export function metaClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ baseURL: META_BASE_URL, apiKey: requireKey() });
  }
  return client;
}

/** Raw fetch against the Model API, for the endpoints the SDK does not cover. */
export async function metaFetch(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${requireKey()}`);
  return fetch(`${META_BASE_URL}${path}`, { ...init, headers });
}
