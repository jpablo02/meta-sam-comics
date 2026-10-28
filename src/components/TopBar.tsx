import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import type { Author } from "@/lib/store";
import { Avatar } from "./ui";

export function TopBar({ user }: { user: Author | null }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          {APP_NAME}
        </Link>
        {user && (
          <nav className="topbar-nav">
            <Link href="/gems" className="button secondary small">
              My Gems
            </Link>
            <Avatar name={user.name} image={user.image} size={36} />
          </nav>
        )}
      </div>
    </header>
  );
}
