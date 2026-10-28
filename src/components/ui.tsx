/** Small shared pieces: avatar, icons, relative time. No state, server-safe. */

export function Avatar({ name, image, size = 40 }: { name: string; image?: string | null; size?: number }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="avatar" src={image} alt="" width={size} height={size} style={{ width: size, height: size }} />;
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span className="avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials || "T"}
    </span>
  );
}

const ICON = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export function GemIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...ICON} width={size} height={size}>
      <path d="M6 3h12l4 6-10 12L2 9z" />
      <path d="M2 9h20M12 21 8 9l4-6 4 6z" />
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg {...ICON}>
      <path d="M15 5l6 6-6 6" />
      <path d="M21 11H9a6 6 0 0 0-6 6v2" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg {...ICON}>
      <path d="M7 4v16l13-8z" />
    </svg>
  );
}

export function BookIcon() {
  return (
    <svg {...ICON}>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
      <path d="M4 19V5" />
    </svg>
  );
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}
