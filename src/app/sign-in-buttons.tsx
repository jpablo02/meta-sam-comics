"use client";

import { signIn, signOut } from "next-auth/react";

const LABELS = { facebook: "Continue with Facebook", google: "Continue with Google" } as const;

export function SignInButtons({ providers }: { providers: Array<keyof typeof LABELS> }) {
  if (providers.length === 0) {
    return (
      <p className="muted">
        No sign-in provider is configured. Set FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET in
        .env.local — see docs/facebook-app-setup.md.
      </p>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {providers.map((p) => (
        <button
          key={p}
          type="button"
          className={p === "facebook" ? "button" : "button secondary"}
          onClick={() => signIn(p)}
        >
          {LABELS[p]}
        </button>
      ))}
    </div>
  );
}

export function SignOutButton() {
  return (
    <button type="button" className="button secondary" onClick={() => signOut()}>
      Sign out
    </button>
  );
}
