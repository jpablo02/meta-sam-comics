"use client";

import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "./ui";

/** The avatar in the top bar: who is signed in, and the way out. */
export function AccountMenu({ name, image }: { name: string; image?: string | null }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => root.current?.contains(e.target as Node) || setOpen(false);
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className="account" ref={root}>
      <button
        type="button"
        className="account-button"
        aria-label="Account"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar name={name} image={image} size={36} />
      </button>
      {open && (
        <div className="account-menu" role="menu">
          <span className="account-name">{name}</span>
          <button type="button" role="menuitem" className="account-item" onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
