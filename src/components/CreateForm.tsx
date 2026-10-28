"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Two fields, on purpose: the story, and — if the writer has one in mind — the gem. */
export function CreateForm() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [gemHint, setGemHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <label htmlFor="gem">The gem (optional)</label>
        <input
          id="gem"
          value={gemHint}
          onChange={(e) => setGemHint(e.target.value)}
          placeholder="The letter inside the bottle — what it says changes everything"
          maxLength={300}
        />
        <span className="field-hint">
          An object in the story worth keeping. Everyone will see it; only people who collect it read what it hides.
        </span>
      </div>

      {error && <p className="error" style={{ margin: 0 }}>{error}</p>}

      <button type="submit" className="button block" disabled={busy || idea.trim().length < 20}>
        {busy ? "Starting…" : "Make my comic"}
      </button>
    </form>
  );
}
