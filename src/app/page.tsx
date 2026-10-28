import { getServerSession } from "next-auth";
import { authOptions, availableProviders } from "@/lib/auth";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { SignInButtons, SignOutButton } from "./sign-in-buttons";

/**
 * Landing. Scaffold only: sign-in works end to end; the studio itself
 * (idea → comic → collectible) lands on this page once the backend that runs
 * the pipeline is decided.
 */
export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <main className="page">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>{APP_NAME}</h1>
        <p className="muted">{APP_TAGLINE}</p>

        {session?.user ? (
          <>
            <p>
              Signed in as <strong>{session.user.name}</strong>.
            </p>
            <SignOutButton />
          </>
        ) : (
          <SignInButtons providers={availableProviders()} />
        )}
      </div>

      <p className="muted" style={{ fontSize: 13, marginTop: 24 }}>
        <a href="/privacy">Privacy</a> · <a href="/data-deletion">Data deletion</a>
      </p>
    </main>
  );
}
