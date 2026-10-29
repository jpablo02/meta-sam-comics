import { NextResponse } from "next/server";
import { metaClient } from "@/lib/metaClient";
import { MUSE_SPARK_MODEL } from "@/lib/writeContents";
import { currentUser } from "@/lib/session";

/**
 * Every story has a gem. When the writer has none in mind, Muse Spark proposes
 * one from their idea — the same kind of object the script writer is held to:
 * something a character can hold, with something written on or inside it.
 */
export async function POST(req: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { idea?: unknown };
  const idea = typeof body.idea === "string" ? body.idea.trim().slice(0, 1200) : "";
  if (idea.length < 20) return NextResponse.json({ error: "Write the story first." }, { status: 400 });

  const prompt = [
    "A writer is about to turn this idea into a four-panel comic:",
    '"""',
    idea,
    '"""',
    "",
    "Propose the ONE object hidden in this story that readers will collect. It must:",
    "- belong naturally to this story, its place and its era;",
    "- be small enough for a character to hold, hide or hand over;",
    "- carry something written on it or inside it (a letter, an engraving, a note on the back,",
    "  a label, a stamp) whose words would change how the story reads.",
    "",
    "Answer with ONE sentence of at most 25 words, in the SAME language as the idea: the object,",
    "and a hint of why what it says matters. No quotes, no preamble.",
  ].join("\n");

  try {
    const completion = await metaClient().chat.completions.create({
      model: MUSE_SPARK_MODEL,
      messages: [{ role: "user", content: prompt }],
    });
    const gem = (completion.choices[0]?.message?.content ?? "").trim().replace(/^["“]|["”]$/g, "");
    if (!gem) throw new Error("empty suggestion");
    return NextResponse.json({ gem: gem.slice(0, 300) });
  } catch (e) {
    console.error("[suggest-gem]", e);
    return NextResponse.json({ error: "Could not suggest one right now." }, { status: 502 });
  }
}
