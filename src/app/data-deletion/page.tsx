import { APP_NAME } from "@/lib/brand";

/**
 * Facebook Login requires a data deletion instructions URL (or callback) before
 * an app can go Live. Instructions are enough for an app that stores no data
 * Facebook would need to be told about.
 */
export const metadata = { title: `Data deletion — ${APP_NAME}` };

export default function DataDeletion() {
  // A contact address is required by Facebook; it lives in the environment so
  // the repo never carries a personal one.
  const contact = process.env.CONTACT_EMAIL ?? "the contact address listed on this app's Facebook page";
  return (
    <main className="page">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Delete your data</h1>
        <p>
          To delete your account and everything you made with {APP_NAME} — your ideas, comics,
          images and videos — email{" "}
          {process.env.CONTACT_EMAIL ? <a href={`mailto:${contact}`}>{contact}</a> : contact} from the
          address on your Facebook or Google account with the subject
          &quot;Delete my data&quot;. It is removed within 30 days and you will get a confirmation.
        </p>
        <p>
          You can also remove {APP_NAME} from your Facebook account at any time under Settings →
          Apps and Websites.
        </p>
      </div>
    </main>
  );
}
