"use client";

import { signIn, signOut } from "next-auth/react";

export function SignInButtons({ providers }: { providers: Array<"facebook" | "google"> }) {
  return (
    <>
      {providers.includes("facebook") ? (
        <button type="button" className="button block" onClick={() => signIn("facebook")}>
          Continue with Facebook
        </button>
      ) : (
        <p>
          Facebook sign-in is not configured. Set FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET in .env.local — see
          docs/facebook-app-setup.md.
        </p>
      )}
      <button type="button" className="button block guest" onClick={() => signIn("guest", { callbackUrl: "/" })}>
        Try it as a guest
      </button>
      <p className="guest-note">As a guest you can make 2 comics, but you can&apos;t share them on Facebook.</p>
    </>
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
