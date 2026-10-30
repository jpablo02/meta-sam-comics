/**
 * Google Cloud access, the same way on Vercel and on Cloud Run.
 *
 * On Cloud Run the job runs as its own service account and needs nothing here.
 * Vercel has no Google identity, so it carries a service-account key in
 * GCP_SERVICE_ACCOUNT (the JSON, base64-encoded — one line, no quoting trouble).
 */
import { Storage } from "@google-cloud/storage";
import { GoogleAuth } from "google-auth-library";

function credentials(): Record<string, string> | undefined {
  const b64 = process.env.GCP_SERVICE_ACCOUNT;
  return b64 ? JSON.parse(Buffer.from(b64, "base64").toString("utf8")) : undefined;
}

let storage: Storage | null = null;
export function gcs(): Storage {
  storage ??= new Storage({ credentials: credentials() });
  return storage;
}

let auth: GoogleAuth | null = null;
export function googleAuth(): GoogleAuth {
  auth ??= new GoogleAuth({ credentials: credentials(), scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  return auth;
}
