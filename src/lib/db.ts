/**
 * Postgres on Cloud SQL, when TALES_DB_INSTANCE is set. Null otherwise — the
 * store then uses local files.
 *
 * Connected through Google's Cloud SQL connector: it authenticates with the
 * service account and verifies the instance's certificate, so the connection is
 * encrypted and checked end to end without shipping a CA file.
 *
 * Tales has its own database and user on the instance; it never sees another
 * app's tables. The pool is kept small on purpose: the instance is shared, and
 * serverless functions multiply connections.
 */
import { Pool } from "pg";
import { Connector, IpAddressTypes } from "@google-cloud/cloud-sql-connector";
import { googleAuth } from "./gcp";

let pool: Promise<Pool> | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS comics (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS comics_created_at ON comics (created_at DESC);
CREATE TABLE IF NOT EXISTS statuses (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS collections (
  comic_id text NOT NULL,
  user_id text NOT NULL,
  number int NOT NULL,
  at timestamptz NOT NULL,
  PRIMARY KEY (comic_id, user_id),
  UNIQUE (comic_id, number)
);
CREATE INDEX IF NOT EXISTS collections_user ON collections (user_id);
`;

async function open(instanceConnectionName: string): Promise<Pool> {
  const connector = new Connector({ auth: googleAuth() });
  const options = await connector.getOptions({ instanceConnectionName, ipType: IpAddressTypes.PUBLIC });
  const p = new Pool({
    ...options,
    user: process.env.TALES_DB_USER,
    password: process.env.TALES_DB_PASSWORD,
    database: process.env.TALES_DB_NAME ?? "tales",
    max: 3,
  });
  await p.query(SCHEMA);
  return p;
}

export async function db(): Promise<Pool | null> {
  const instance = process.env.TALES_DB_INSTANCE;
  if (!instance) return null;
  pool ??= open(instance).catch((e) => {
    pool = null;
    throw e;
  });
  return pool;
}
