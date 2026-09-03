import "server-only";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function isFollowing(followerId: string, followedId: string): Promise<boolean> {
  const rows = (await sql`
    SELECT 1 FROM follows WHERE follower_id = ${followerId} AND followed_id = ${followedId}
  `) as unknown[];
  return rows.length > 0;
}

export async function followUser(followerId: string, followedId: string): Promise<void> {
  if (followerId === followedId) return;
  await sql`
    INSERT INTO follows (follower_id, followed_id) VALUES (${followerId}, ${followedId})
    ON CONFLICT DO NOTHING
  `;
}

export async function unfollowUser(followerId: string, followedId: string): Promise<void> {
  await sql`DELETE FROM follows WHERE follower_id = ${followerId} AND followed_id = ${followedId}`;
}

export async function getFollowingIds(userId: string): Promise<string[]> {
  const rows = (await sql`SELECT followed_id FROM follows WHERE follower_id = ${userId}`) as { followed_id: string }[];
  return rows.map((r) => r.followed_id);
}

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const rows = (await sql`
    SELECT
      (SELECT COUNT(*)::int FROM follows WHERE followed_id = ${userId}) AS followers,
      (SELECT COUNT(*)::int FROM follows WHERE follower_id = ${userId}) AS following
  `) as { followers: number; following: number }[];
  return rows[0] ?? { followers: 0, following: 0 };
}
