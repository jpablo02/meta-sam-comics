import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import { currentUser } from "@/lib/session";
import { LegalPage } from "@/components/LegalPage";

/**
 * Facebook Login requires a public privacy policy URL before an app can go
 * Live. This states what the app actually does — keep it in step with the code.
 */
export const metadata = { title: `Privacy — ${APP_NAME}` };

export default async function Privacy() {
  const user = await currentUser();
  return (
    <LegalPage user={user} title="Privacy" updated="October 31, 2026">
      <p className="legal-lead">
        {APP_NAME} turns a story idea you write into a comic. This page explains what we receive, what we keep
        and who can see it.
      </p>

      <h2>When you sign in</h2>
      <p>
        With Facebook or Google we receive your name, profile picture and email address, and an id that
        identifies your account with that provider. We do not ask to post on your behalf, read your friends or
        access your messages.
      </p>
      <p>
        As a guest we receive nothing about you. Your browser keeps a random guest id so you can come back to
        your comics; clearing the browser&apos;s data forgets it.
      </p>

      <h2>What we keep</h2>
      <ul>
        <li>The ideas you write, and the comics, images and videos made from them.</li>
        <li>The gems you collect, and the number of each copy you hold.</li>
        <li>A session cookie that keeps you signed in.</li>
      </ul>
      <p>All of it is linked to your account id, so you can see it again.</p>

      <h2>Who can see it</h2>
      <p>
        Comics are made to be read: each one appears in the {APP_NAME} feed with its author&apos;s name and
        picture, and other readers can read it and collect its gem. Your email is never shown.
      </p>

      <h2>How a comic is made</h2>
      <p>
        Your idea is sent to Meta&apos;s Model API, whose models write the script, draw the art and find what
        is in it. The app runs on Vercel and stores its data on Google Cloud. We do not sell your data and
        there are no ads.
      </p>

      <h2>Sharing</h2>
      <p>Nothing is posted to Facebook unless you press Share and confirm it in Facebook&apos;s own dialog.</p>

      <h2>Deleting your data</h2>
      <p>
        You can ask for everything to be deleted at any time — see <Link href="/data-deletion">data deletion</Link>.
      </p>
    </LegalPage>
  );
}
