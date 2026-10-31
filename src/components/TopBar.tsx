import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import type { Author } from "@/lib/store";
import { AccountMenu } from "./AccountMenu";

/** Both doors are always in reach: read and collect, or make your own. */
export function TopBar({ user, wide = false }: { user: Author | null; wide?: boolean }) {
  return (
    <header className="topbar">
      <div className={wide ? "topbar-inner wide" : "topbar-inner"}>
        <Link href="/" className="brand">
          {APP_NAME}
        </Link>
        {user && (
          <nav className="topbar-nav">
            <Link href="/create" className="button small topbar-create" aria-label="Create a comic">
              <span aria-hidden="true">+</span>
              <span className="topbar-create-label">Create</span>
            </Link>
            <Link href="/gems" className="button secondary small">
              My collection
            </Link>
            <AccountMenu name={user.name} image={user.image} />
          </nav>
        )}
      </div>
    </header>
  );
}
