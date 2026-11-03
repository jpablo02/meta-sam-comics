import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import type { Author } from "@/lib/store";
import { AccountMenu } from "./AccountMenu";
import { HomeIcon } from "./ui";

/** Make is always one tap away; what is yours — your comics, your gems — lives under your photo. */
export function TopBar({ user, wide = false }: { user: Author | null; wide?: boolean }) {
  return (
    <header className="topbar">
      <div className={wide ? "topbar-inner wide" : "topbar-inner"}>
        <div className="topbar-start">
          <Link href="/" className="brand" translate="no">
            {APP_NAME}
          </Link>
          {user && (
            <Link href="/" className="topbar-home" aria-label="Home">
              <HomeIcon />
            </Link>
          )}
        </div>
        {user && (
          <nav className="topbar-nav">
            <Link href="/create" className="button small topbar-create" aria-label="Create a comic">
              <span aria-hidden="true">+</span>
              <span className="topbar-create-label">Create</span>
            </Link>
            <AccountMenu name={user.name} image={user.image} />
          </nav>
        )}
      </div>
    </header>
  );
}
