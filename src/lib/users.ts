import "server-only";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// Same handle rules as most social platforms: lowercase letters, digits,
// underscores, 3-20 chars. Enforced here (not just client-side) since this
// is also the public URL segment at /u/[username].
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export interface PublicUser {
  id: string;
  name: string | null;
  image: string | null;
  username: string;
}

export async function getUserByUsername(username: string): Promise<PublicUser | null> {
  const rows = (await sql`
    SELECT id, name, image, username FROM users WHERE username = ${username.toLowerCase()}
  `) as PublicUser[];
  return rows.length ? rows[0] : null;
}

export async function setUsername(userId: string, username: string): Promise<void> {
  const normalized = username.toLowerCase();
  if (!USERNAME_PATTERN.test(normalized)) {
    throw new Error("Username must be 3-20 characters: lowercase letters, numbers, and underscores only.");
  }
  try {
    await sql`UPDATE users SET username = ${normalized} WHERE id = ${userId}`;
  } catch (err) {
    // Postgres unique_violation
    if (err instanceof Error && "code" in err && (err as { code: string }).code === "23505") {
      throw new Error("That username is already taken.");
    }
    throw err;
  }
}
