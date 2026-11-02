"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { ProgressBubble } from "@/components/ProgressBubble";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <ProgressBubble />
    </SessionProvider>
  );
}
