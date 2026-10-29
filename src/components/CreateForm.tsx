"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Two fields, both required: the story, and its gem. Every story has one — when
 * the writer has none in mind, "Suggest one" asks Muse Spark for it.
 */
export function CreateForm() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [gemHint, setGemHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ideaReady = idea.trim().length >= 20;

  async function suggest() {
    setSuggesting(true);
    setError(null);
    try {
      const res = await fetch("/api/suggest-gem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Could not suggest one right now.");
      else setGemHint(data.gem);
    } catch {
      setError("Could not suggest one right now.");
    } finally {
      setSuggesting(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/comics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, gemHint }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start your comic.");
        setBusy(false);
        return;
      }
      router.push(`/c/${data.id}`);
    } catch {
      setError("Could not start your comic.");
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="field">
        <label htmlFor="idea">What happens in your story?</label>
        <textarea
          id="idea"
          rows={6}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="A fisherwoman in Cartagena pulls a green bottle from the sea. Her grandfather goes pale when he sees it…"
          maxLength={1200}
          required
        />
        <span className="field-hint">Who is in it, where, and what goes wrong. Spanish or English — the comic comes out in English.</span>
      </div>

      <div className="field">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <label htmlFor="gem">The gem</label>
          <button
            type="button"
            className="button secondary small"
            onClick={suggest}
            disabled={!ideaReady || suggesting}
            title={ideaReady ? undefined : "Write the story first"}
          >
            {suggesting ? "Thinking…" : "✨ Suggest one"}
          </button>
        </div>
        <textarea
          id="gem"
          rows={2}
          value={gemHint}
          onChange={(e) => setGemHint(e.target.value)}
          placeholder="The letter inside the bottle — what it says changes everything"
          maxLength={300}
          required
        />
        <span className="field-hint">
          The object hidden in your story. Everyone will see it; only people who collect it read what it says. No
          idea? Write the story and tap Suggest one.
        </span>
      </div>

      {error && <p className="error" style={{ margin: 0 }}>{error}</p>}

      <button type="submit" className="button block" disabled={busy || !ideaReady || gemHint.trim().length < 3}>
        {busy ? "Starting…" : "Make my comic"}
      </button>
    </form>
  );
}
