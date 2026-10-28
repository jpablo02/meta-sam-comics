import { APP_NAME } from "@/lib/brand";

/**
 * Facebook Login requires a public privacy policy URL before an app can go
 * Live. This states what the app actually does — keep it in step with the code.
 */
export const metadata = { title: `Privacy — ${APP_NAME}` };

export default function Privacy() {
  return (
    <main className="page">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Privacy</h1>
        <p>
          {APP_NAME} turns a story idea you write into a comic. This page explains what we
          receive and keep.
        </p>
        <h2>What we receive when you sign in</h2>
        <p>
          Your name, profile picture and email address, from Facebook or Google, and an id that
          identifies your account with that provider. We do not request permission to post on
          your behalf, read your friends, or access your messages.
        </p>
        <h2>What we keep</h2>
        <p>
          The ideas you write and the comics, images and videos generated from them, linked to
          your account id so you can see them again. Ideas are sent to Meta&apos;s Model API to
          generate the comic.
        </p>
        <h2>Sharing</h2>
        <p>
          Nothing is posted to Facebook unless you press Share and confirm it in Facebook&apos;s
          own dialog.
        </p>
        <h2>Deleting your data</h2>
        <p>
          See <a href="/data-deletion">data deletion</a>.
        </p>
      </div>
    </main>
  );
}
