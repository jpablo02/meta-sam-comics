"use client";

import { signIn, signOut } from "next-auth/react";

export function SignInButtons({ providers }: { providers: Array<"facebook" | "google"> }) {
  if (!providers.includes("facebook")) {
    return (
      <p>
        Sign-in is not configured. Set FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET in .env.local — see
        docs/facebook-app-setup.md.
      </p>
    );
  }
  return (
    <button type="button" className="button block" onClick={() => signIn("facebook")}>
      Continue with Facebook
    </button>
  );
}

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut()}
      style={{ border: 0, background: "none", padding: 0, font: "inherit", color: "var(--accent)", cursor: "pointer", textDecoration: "underline" }}
    >
      Sign out
    </button>
  );
}
