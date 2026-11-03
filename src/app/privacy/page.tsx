import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import { currentUser } from "@/lib/session";
import { LegalPage } from "@/components/LegalPage";
import { Brand } from "@/components/NoTranslate";

/**
 * Facebook Login requires a public privacy policy URL before an app can go
 * Live. This states what the app actually does — keep it in step with the code.
 */
export const metadata = { title: `Privacy — ${APP_NAME}` };

export default async function Privacy() {
  const user = await currentUser();
  return (
    <LegalPage user={user} title="Privacy" updated="November 3, 2026">
      <p className="legal-lead">
        <Brand /> turns a story idea you write into a comic. This page explains what we receive, what we keep
        and who can see it.
      </p>

      <h2>When you sign in</h2>
      <p>
        With Facebook we receive your name, your profile picture and an id that identifies your account —
        nothing else, not even your email. We do not ask to post on your behalf, read your friends or access
        your messages.
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
        Comics are made to be read: each one appears in the <Brand /> feed with its author&apos;s name and
        picture, and other readers can read it and collect its gem.
      </p>

      <h2>How a comic is made</h2>
      <p>
        Your idea is sent to Meta&apos;s Model API, whose models write the script, draw the art and find what
        is in it. The app runs on Vercel and stores its data on Google Cloud. We do not sell your data and
        there are no ads.
      </p>

      <h2>Sharing</h2>
      <p>
        Nothing is ever posted for you. When you choose to post a comic&apos;s link or share its video, you
        confirm it yourself, in Facebook&apos;s own dialog or your phone&apos;s share sheet.
      </p>

      <h2>Deleting your data</h2>
      <p>
        You can delete any comic you made yourself, from <strong>My comics</strong> in the menu under your
        picture. To have everything deleted, see <Link href="/data-deletion">data deletion</Link>.
      </p>
    </LegalPage>
  );
}
