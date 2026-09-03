import "server-only";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export interface Comment {
  id: string;
  authorId: string;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
}

interface CommentRow {
  id: string;
  author_id: string;
  author_username: string | null;
  author_avatar_url: string | null;
  body: string;
  created_at: string;
}

function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    authorId: row.author_id,
    authorUsername: row.author_username,
    authorAvatarUrl: row.author_avatar_url,
    body: row.body,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function getCardComments(cardId: string): Promise<Comment[]> {
  const rows = (await sql`
    SELECT c.id, c.author_id, u.username AS author_username,
      COALESCE(u.avatar_url, u.image) AS author_avatar_url, c.body, c.created_at
    FROM comments c JOIN users u ON u.id = c.author_id
    WHERE c.card_id = ${cardId}
    ORDER BY c.created_at ASC
  `) as CommentRow[];
  return rows.map(rowToComment);
}

export async function getProfileComments(profileUserId: string): Promise<Comment[]> {
  const rows = (await sql`
    SELECT c.id, c.author_id, u.username AS author_username,
      COALESCE(u.avatar_url, u.image) AS author_avatar_url, c.body, c.created_at
    FROM comments c JOIN users u ON u.id = c.author_id
    WHERE c.profile_user_id = ${profileUserId}
    ORDER BY c.created_at ASC
  `) as CommentRow[];
  return rows.map(rowToComment);
}

async function fetchCommentWithAuthor(id: string): Promise<Comment> {
  const rows = (await sql`
    SELECT c.id, c.author_id, u.username AS author_username,
      COALESCE(u.avatar_url, u.image) AS author_avatar_url, c.body, c.created_at
    FROM comments c JOIN users u ON u.id = c.author_id
    WHERE c.id = ${id}
  `) as CommentRow[];
  return rowToComment(rows[0]);
}

export async function addCardComment(cardId: string, authorId: string, body: string): Promise<Comment> {
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO comments (id, author_id, card_id, body)
    VALUES (${id}, ${authorId}, ${cardId}, ${body})
  `;
  return fetchCommentWithAuthor(id);
}

export async function addProfileComment(profileUserId: string, authorId: string, body: string): Promise<Comment> {
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO comments (id, author_id, profile_user_id, body)
    VALUES (${id}, ${authorId}, ${profileUserId}, ${body})
  `;
  return fetchCommentWithAuthor(id);
}

export async function getCommentOwnership(id: string): Promise<{ authorId: string } | null> {
  const rows = (await sql`SELECT author_id FROM comments WHERE id = ${id}`) as { author_id: string }[];
  return rows.length ? { authorId: rows[0].author_id } : null;
}

export async function deleteComment(id: string): Promise<void> {
  await sql`DELETE FROM comments WHERE id = ${id}`;
}
