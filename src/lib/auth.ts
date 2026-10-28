/**
 * Sign-in: Facebook first, Google optional.
 *
 * Same shape as Token Comic: NextAuth with JWT sessions and no account table —
 * the provider is the identity, and the comics a user makes are stored against
 * the provider's stable id. Nothing about the user is kept beyond what the
 * session needs (id, name, picture).
 *
 * No email/password form, on purpose: one less thing to secure, and the people
 * this is for already have a Facebook account open in the next tab.
 *
 * A provider is only offered when its credentials are configured, so a fresh
 * clone runs with whatever the developer has set up.
 */
import type { NextAuthOptions } from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";

function configuredProviders(): NextAuthOptions["providers"] {
  const providers: NextAuthOptions["providers"] = [];

  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    providers.push(
      FacebookProvider({
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        // public_profile only: name and photo are all a comic and a collection
        // need. email would add a data-handling review to going Live.
        authorization: { params: { scope: "public_profile" } },
      }),
    );
  }

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }),
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  providers: configuredProviders(),
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  callbacks: {
    // Carry a stable, provider-scoped id into the session: "facebook:1234…".
    // Comics are keyed by it; a display name or email is not stable enough.
    async jwt({ token, account }) {
      if (account) token.uid = `${account.provider}:${account.providerAccountId}`;
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.uid === "string") {
        (session.user as { id?: string }).id = token.uid;
      }
      return session;
    },
  },
};

/** Which sign-in buttons to show. */
export function availableProviders(): Array<"facebook" | "google"> {
  const out: Array<"facebook" | "google"> = [];
  if (process.env.FACEBOOK_CLIENT_ID) out.push("facebook");
  if (process.env.GOOGLE_CLIENT_ID) out.push("google");
  return out;
}
