import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import type { Author } from "./store";

/** The signed-in reader, or null. */
export async function currentUser(): Promise<Author | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; name?: string | null; image?: string | null } | undefined;
  if (!user?.id) return null;
  return { id: user.id, name: user.name ?? "Someone", image: user.image ?? null };
}
