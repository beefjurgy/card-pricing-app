import "server-only";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// Same handle rules as most social platforms: lowercase letters, digits,
// underscores, 3-20 chars. Enforced here (not just client-side) since this
// is also the public URL segment at /u/[username].
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export interface PublicUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
}

// Full name is never shown publicly (only @username) — see redactForViewer
// for the same reasoning applied to purchase price. A custom avatar_url
// (set via /account) takes priority over the Google account photo, since
// the whole point of letting someone upload their own is to replace it.
export async function getUserByUsername(username: string): Promise<PublicUser | null> {
  const rows = (await sql`
    SELECT id, username, COALESCE(avatar_url, image) AS "avatarUrl", bio
    FROM users WHERE username = ${username.toLowerCase()}
  `) as PublicUser[];
  return rows.length ? rows[0] : null;
}

export const BIO_MAX_LENGTH = 280;

export async function getBio(userId: string): Promise<string | null> {
  const rows = (await sql`SELECT bio FROM users WHERE id = ${userId}`) as { bio: string | null }[];
  return rows[0]?.bio ?? null;
}

export async function setBio(userId: string, bio: string): Promise<string | null> {
  const trimmed = bio.trim().slice(0, BIO_MAX_LENGTH);
  const value = trimmed.length > 0 ? trimmed : null;
  await sql`UPDATE users SET bio = ${value} WHERE id = ${userId}`;
  return value;
}

export async function getAvatarUrl(userId: string): Promise<string | null> {
  const rows = (await sql`SELECT avatar_url FROM users WHERE id = ${userId}`) as { avatar_url: string | null }[];
  return rows[0]?.avatar_url ?? null;
}

export async function setAvatarUrl(userId: string, avatarUrl: string): Promise<void> {
  await sql`UPDATE users SET avatar_url = ${avatarUrl} WHERE id = ${userId}`;
}

export async function clearAvatarUrl(userId: string): Promise<void> {
  await sql`UPDATE users SET avatar_url = NULL WHERE id = ${userId}`;
}

// A small, fixed-size "top 3" showcase — deliberately separate from
// isFeatured (which can be any number of cards, shown as a filterable
// subset of the grid). This is 3 columns rather than a normalized table
// since the cardinality is fixed and tiny; no FK constraint, so a deleted
// card just leaves a dangling id here until clearFavoriteCardReferences is
// called (see library.ts's deleteCard).
export async function getFavoriteCardIds(userId: string): Promise<(string | null)[]> {
  const rows = (await sql`
    SELECT favorite_card_1, favorite_card_2, favorite_card_3 FROM users WHERE id = ${userId}
  `) as { favorite_card_1: string | null; favorite_card_2: string | null; favorite_card_3: string | null }[];
  const row = rows[0];
  if (!row) return [null, null, null];
  return [row.favorite_card_1, row.favorite_card_2, row.favorite_card_3];
}

export async function setFavoriteCard(userId: string, slot: 1 | 2 | 3, cardId: string | null): Promise<void> {
  // Clear this card from any other slot first, so the same card never
  // appears twice in someone's top 3 (e.g. moving it from slot 2 to slot 1).
  if (cardId) {
    await sql`
      UPDATE users SET
        favorite_card_1 = CASE WHEN favorite_card_1 = ${cardId} THEN NULL ELSE favorite_card_1 END,
        favorite_card_2 = CASE WHEN favorite_card_2 = ${cardId} THEN NULL ELSE favorite_card_2 END,
        favorite_card_3 = CASE WHEN favorite_card_3 = ${cardId} THEN NULL ELSE favorite_card_3 END
      WHERE id = ${userId}
    `;
  }
  if (slot === 1) await sql`UPDATE users SET favorite_card_1 = ${cardId} WHERE id = ${userId}`;
  else if (slot === 2) await sql`UPDATE users SET favorite_card_2 = ${cardId} WHERE id = ${userId}`;
  else await sql`UPDATE users SET favorite_card_3 = ${cardId} WHERE id = ${userId}`;
}

// Called when a card is deleted so a removed card doesn't linger as a
// dangling id in someone's favorites.
export async function clearFavoriteCardReferences(cardId: string): Promise<void> {
  await sql`
    UPDATE users SET
      favorite_card_1 = CASE WHEN favorite_card_1 = ${cardId} THEN NULL ELSE favorite_card_1 END,
      favorite_card_2 = CASE WHEN favorite_card_2 = ${cardId} THEN NULL ELSE favorite_card_2 END,
      favorite_card_3 = CASE WHEN favorite_card_3 = ${cardId} THEN NULL ELSE favorite_card_3 END
    WHERE favorite_card_1 = ${cardId} OR favorite_card_2 = ${cardId} OR favorite_card_3 = ${cardId}
  `;
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
