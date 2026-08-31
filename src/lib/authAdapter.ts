import "server-only";
import { neon } from "@neondatabase/serverless";
import type { Adapter, AdapterAccount, AdapterSession, AdapterUser } from "next-auth/adapters";

// Same HTTP-mode client as src/lib/library.ts, for the same reason: a
// stateless per-query client has no connection pool for many concurrent
// Vercel serverless instances to exhaust. The official @auth/neon-adapter
// is built around the pg-compatible Pool/Client interface (WebSocket mode)
// instead, so it isn't usable here — this hand-rolled adapter covers only
// the methods Auth.js actually calls for a Google-only, database-session
// setup (no Email or WebAuthn provider, so verification tokens and
// authenticators are never touched).
const sql = neon(process.env.DATABASE_URL!);

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  emailVerified: string | null;
  image: string | null;
}

function rowToUser(row: UserRow): AdapterUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified ? new Date(row.emailVerified) : null,
    image: row.image,
  };
}

interface SessionRow {
  sessionToken: string;
  userId: string;
  expires: string;
}

function rowToSession(row: SessionRow): AdapterSession {
  return { sessionToken: row.sessionToken, userId: row.userId, expires: new Date(row.expires) };
}

export function NeonHttpAdapter(): Adapter {
  return {
    async createUser(user) {
      const rows = (await sql`
        INSERT INTO users (name, email, "emailVerified", image)
        VALUES (${user.name ?? null}, ${user.email}, ${user.emailVerified}, ${user.image ?? null})
        RETURNING *
      `) as UserRow[];
      return rowToUser(rows[0]);
    },

    async getUser(id) {
      const rows = (await sql`SELECT * FROM users WHERE id = ${id}`) as UserRow[];
      return rows.length ? rowToUser(rows[0]) : null;
    },

    async getUserByEmail(email) {
      const rows = (await sql`SELECT * FROM users WHERE email = ${email}`) as UserRow[];
      return rows.length ? rowToUser(rows[0]) : null;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const rows = (await sql`
        SELECT u.* FROM users u
        JOIN accounts a ON a."userId" = u.id
        WHERE a.provider = ${provider} AND a."providerAccountId" = ${providerAccountId}
      `) as UserRow[];
      return rows.length ? rowToUser(rows[0]) : null;
    },

    async updateUser(user) {
      const existing = (await sql`SELECT * FROM users WHERE id = ${user.id}`) as UserRow[];
      if (!existing.length) throw new Error(`updateUser: no user with id ${user.id}`);
      const merged = { ...rowToUser(existing[0]), ...user };
      const rows = (await sql`
        UPDATE users
        SET name = ${merged.name ?? null},
            email = ${merged.email},
            "emailVerified" = ${merged.emailVerified},
            image = ${merged.image ?? null}
        WHERE id = ${user.id}
        RETURNING *
      `) as UserRow[];
      return rowToUser(rows[0]);
    },

    async linkAccount(account: AdapterAccount) {
      await sql`
        INSERT INTO accounts (
          "userId", type, provider, "providerAccountId", refresh_token, access_token,
          expires_at, token_type, scope, id_token, session_state
        ) VALUES (
          ${account.userId}, ${account.type}, ${account.provider}, ${account.providerAccountId},
          ${account.refresh_token ?? null}, ${account.access_token ?? null}, ${account.expires_at ?? null},
          ${account.token_type ?? null}, ${account.scope ?? null}, ${account.id_token ?? null},
          ${(account.session_state as string | undefined) ?? null}
        )
      `;
    },

    async createSession(session) {
      const rows = (await sql`
        INSERT INTO sessions ("sessionToken", "userId", expires)
        VALUES (${session.sessionToken}, ${session.userId}, ${session.expires})
        RETURNING *
      `) as SessionRow[];
      return rowToSession(rows[0]);
    },

    async getSessionAndUser(sessionToken) {
      const rows = (await sql`
        SELECT
          s."sessionToken" AS s_token, s."userId" AS s_user_id, s.expires AS s_expires,
          u.id AS u_id, u.name AS u_name, u.email AS u_email, u."emailVerified" AS u_email_verified, u.image AS u_image
        FROM sessions s
        JOIN users u ON u.id = s."userId"
        WHERE s."sessionToken" = ${sessionToken}
      `) as {
        s_token: string;
        s_user_id: string;
        s_expires: string;
        u_id: string;
        u_name: string | null;
        u_email: string;
        u_email_verified: string | null;
        u_image: string | null;
      }[];
      if (!rows.length) return null;
      const r = rows[0];
      return {
        session: rowToSession({ sessionToken: r.s_token, userId: r.s_user_id, expires: r.s_expires }),
        user: rowToUser({ id: r.u_id, name: r.u_name, email: r.u_email, emailVerified: r.u_email_verified, image: r.u_image }),
      };
    },

    async updateSession(session) {
      const rows = (await sql`
        UPDATE sessions
        SET expires = COALESCE(${session.expires ?? null}, expires),
            "userId" = COALESCE(${session.userId ?? null}, "userId")
        WHERE "sessionToken" = ${session.sessionToken}
        RETURNING *
      `) as SessionRow[];
      return rows.length ? rowToSession(rows[0]) : null;
    },

    async deleteSession(sessionToken) {
      await sql`DELETE FROM sessions WHERE "sessionToken" = ${sessionToken}`;
    },
  };
}
