import { APP_NAME } from "@/lib/brand";
import { currentUser } from "@/lib/session";
import { LegalPage } from "@/components/LegalPage";

/**
 * Facebook Login requires a data deletion instructions URL (or callback) before
 * an app can go Live. Instructions are enough for an app that stores no data
 * Facebook would need to be told about.
 */
export const metadata = { title: `Data deletion — ${APP_NAME}` };

export default async function DataDeletion() {
  const user = await currentUser();
  // A contact address is required by Facebook; it lives in the environment so
  // the repo never carries a personal one.
  const contact = process.env.CONTACT_EMAIL;
  return (
    <LegalPage user={user} title="Delete your data" updated="October 31, 2026">
      <p className="legal-lead">
        You can have your account and everything you made with {APP_NAME} deleted at any time.
      </p>

      <h2>How to ask</h2>
      <ol>
        <li>
          Email{" "}
          {contact ? (
            <a href={`mailto:${contact}?subject=Delete%20my%20data`}>{contact}</a>
          ) : (
            "the contact address listed on this app's Facebook page"
          )}{" "}
          from the address on your Facebook or Google account.
        </li>
        <li>Use the subject &quot;Delete my data&quot;.</li>
        <li>If you used {APP_NAME} as a guest, include the link to a comic you made, so we can find it.</li>
      </ol>

      <h2>What is deleted</h2>
      <ul>
        <li>Your account: name, picture, email and provider id.</li>
        <li>Your ideas, and the comics, images and videos made from them.</li>
        <li>The gems you collected.</li>
      </ul>
      <p>It is removed within 30 days, and you get a confirmation by email.</p>

      <h2>Remove the app from Facebook</h2>
      <p>
        You can also disconnect {APP_NAME} from your Facebook account at any time, under Settings → Apps and
        Websites.
      </p>
    </LegalPage>
  );
}
