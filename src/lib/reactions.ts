import "server-only";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export type ReactionType = "heart" | "thumbs_up";

export interface ReactionSummary {
  heart: number;
  thumbsUp: number;
  viewerReaction: ReactionType | null;
}

export async function getCardReactionSummary(cardId: string, viewerId: string | null | undefined): Promise<ReactionSummary> {
  const rows = (await sql`
    SELECT reaction, COUNT(*)::int AS count
    FROM card_reactions
    WHERE card_id = ${cardId}
    GROUP BY reaction
  `) as { reaction: ReactionType; count: number }[];

  const heart = rows.find((r) => r.reaction === "heart")?.count ?? 0;
  const thumbsUp = rows.find((r) => r.reaction === "thumbs_up")?.count ?? 0;

  let viewerReaction: ReactionType | null = null;
  if (viewerId) {
    const mine = (await sql`
      SELECT reaction FROM card_reactions WHERE card_id = ${cardId} AND user_id = ${viewerId}
    `) as { reaction: ReactionType }[];
    viewerReaction = mine[0]?.reaction ?? null;
  }

  return { heart, thumbsUp, viewerReaction };
}

// Toggles: reacting with the same type you already had removes it;
// reacting with a different type switches it. One row per (card, user)
// enforced by the table's primary key.
export async function toggleCardReaction(cardId: string, userId: string, reaction: ReactionType): Promise<ReactionType | null> {
  const existing = (await sql`
    SELECT reaction FROM card_reactions WHERE card_id = ${cardId} AND user_id = ${userId}
  `) as { reaction: ReactionType }[];

  if (existing[0]?.reaction === reaction) {
    await sql`DELETE FROM card_reactions WHERE card_id = ${cardId} AND user_id = ${userId}`;
    return null;
  }

  await sql`
    INSERT INTO card_reactions (card_id, user_id, reaction)
    VALUES (${cardId}, ${userId}, ${reaction})
    ON CONFLICT (card_id, user_id) DO UPDATE SET reaction = ${reaction}, created_at = now()
  `;
  return reaction;
}
