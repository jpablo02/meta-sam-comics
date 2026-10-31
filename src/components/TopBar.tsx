import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import type { Author } from "@/lib/store";
import { Avatar } from "./ui";

export function TopBar({ user, wide = false }: { user: Author | null; wide?: boolean }) {
  return (
    <header className="topbar">
      <div className={wide ? "topbar-inner wide" : "topbar-inner"}>
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
