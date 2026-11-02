import type { Metadata } from "next";
import type { ReactNode } from "react";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { siteUrl } from "@/lib/urls";
import { Providers } from "./providers";
import "./globals.css";

const PITCH = "Turn a one-line idea into a comic, and find the gem hidden inside it.";

/** What a shared link to Tales looks like on X and Facebook, wherever a page says nothing more. */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: APP_NAME,
  description: `${APP_TAGLINE} ${PITCH}`,
  openGraph: {
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: PITCH,
    siteName: APP_NAME,
    type: "website",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: `${APP_NAME} — ${APP_TAGLINE}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: PITCH,
    images: ["/og.jpg"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
