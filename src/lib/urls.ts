/** Where things live, in one place: pages, files, and the share link. */

export function siteUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function comicPath(id: string): string {
  return `/c/${id}`;
}

export function fileUrl(id: string, name: string, width?: 360 | 720 | 1080): string {
  return `/api/comics/${id}/files/${encodeURIComponent(name)}${width ? `?w=${width}` : ""}`;
}

/**
 * Facebook's share dialog. It needs no permission and no App Review: the reader
 * shares the public comic page, and Facebook reads its preview from the page's
 * Open Graph tags (the gem's teaser card).
 */
export function facebookShareUrl(id: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl() + comicPath(id))}`;
}
