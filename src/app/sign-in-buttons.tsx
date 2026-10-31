"use client";

import { signIn, signOut } from "next-auth/react";

const GUEST_KEY = "tales.guestId";

/**
 * Sign in as this browser's guest, creating it the first time. The id lives in
 * localStorage, not the session cookie, so it outlasts signing out.
 */
export function signInAsGuest(callbackUrl: string) {
  let guestId: string | null = null;
  try {
    guestId = localStorage.getItem(GUEST_KEY);
    if (!guestId || !/^[a-f0-9]{16}$/.test(guestId)) {
      guestId = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem(GUEST_KEY, guestId);
    }
  } catch {
    // Storage blocked (private mode on some browsers): the server makes a fresh guest.
  }
  return signIn("guest", { guestId: guestId ?? "", callbackUrl });
}

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
      <button type="button" className="button block guest" onClick={() => signInAsGuest("/")}>
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
