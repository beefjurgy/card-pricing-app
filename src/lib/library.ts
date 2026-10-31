import "server-only";
import { neon } from "@neondatabase/serverless";
import { LibraryCard, Population, Sale, TrendingSignal, Valuation } from "./types";
import { deleteImage } from "./storage";
import { clearFavoriteCardReferences } from "./users";

// HTTP-mode client (a plain fetch per query, no held connection) rather than
// the WebSocket Pool or plain `pg` — Vercel functions can spin up many
// concurrent cold instances, and a stateless per-query client has no
// connection pool to exhaust across them.
const sql = neon(process.env.DATABASE_URL!);

interface CardRow {
  id: string;
  user_id: string | null;
  player: string;
  sport: string;
  year: string;
  brand: string;
  set_name: string;
  card_number: string;
  parallel: string;
  other_details: string;
  grading_company: string;
  grade: string;
  cert_number: string;
  is_autograph: boolean;
  autograph_company: string;
  autograph_grade: string;
  image_url: string;
  back_image_url: string | null;
  date_added: string;
  identify_confidence: LibraryCard["identifyConfidence"];
  identify_notes: string;
  valuation: Valuation;
  sales: Sale[];
  population: Population | null;
  trending: TrendingSignal | null;
  purchase_price: string | null; // NUMERIC comes back as a string from the driver
  purchase_date: string | null;
  purchase_platform: string | null;
  is_sold: boolean;
  sold_price: string | null; // NUMERIC comes back as a string from the driver
  sold_date: string | null;
  sold_platform: string | null;
  is_featured: boolean;
  is_public: boolean;
  description: string | null;
  description_voice: string | null;
}

function rowToCard(row: CardRow): LibraryCard {
  return {
    id: row.id,
    userId: row.user_id,
    player: row.player,
    sport: row.sport as LibraryCard["sport"],
    year: row.year,
    brand: row.brand,
    setName: row.set_name,
    cardNumber: row.card_number,
    parallel: row.parallel,
    otherDetails: row.other_details,
    gradingCompany: row.grading_company,
    grade: row.grade,
    certNumber: row.cert_number,
    isAutograph: row.is_autograph,
    autographCompany: row.autograph_company,
    autographGrade: row.autograph_grade,
    imageUrl: row.image_url,
    backImageUrl: row.back_image_url,
    dateAdded: new Date(row.date_added).toISOString(),
    identifyConfidence: row.identify_confidence,
    identifyNotes: row.identify_notes,
    valuation: row.valuation,
    sales: row.sales,
    population: row.population,
    trending: row.trending,
    purchasePrice: row.purchase_price !== null ? Number(row.purchase_price) : null,
    purchaseDate: row.purchase_date,
    purchasePlatform: row.purchase_platform,
    isSold: row.is_sold,
    soldPrice: row.sold_price !== null ? Number(row.sold_price) : null,
    soldDate: row.sold_date,
    soldPlatform: row.sold_platform,
    isFeatured: row.is_featured,
    isPublic: row.is_public,
    description: row.description,
    descriptionVoice: row.description_voice as LibraryCard["descriptionVoice"],
  };
}

// Only ever called for a logged-out viewer (see /api/library) — cards
// toggled off public view are excluded. The signed-in owner's own read
// (readLibraryForUser) intentionally shows everything, public or not, so
// they can see and manage the toggle.
export async function readLibrary(): Promise<LibraryCard[]> {
  const rows = (await sql`SELECT * FROM cards WHERE is_public = true ORDER BY date_added DESC`) as CardRow[];
  return rows.map(rowToCard);
}

export type ActivityItem =
  | { type: "card_added"; timestamp: string; actorUsername: string; actorAvatarUrl: string | null; card: LibraryCard }
  | {
      type: "comment";
      timestamp: string;
      actorUsername: string;
      actorAvatarUrl: string | null;
      body: string;
      target: { kind: "card"; cardId: string; player: string; imageUrl: string | null } | { kind: "profile"; username: string };
    }
  | {
      type: "reaction";
      timestamp: string;
      actorUsername: string;
      actorAvatarUrl: string | null;
      reaction: "heart" | "thumbs_up";
      cardId: string;
      player: string;
      imageUrl: string | null;
    };

// Each query is independently limited, then the merged, timestamp-sorted
// list is trimmed to the requested size — simpler than one combined SQL
// query across three differently-shaped sources, and fine at this scale.
// Same is_public filter as readLibrary throughout — a card someone's hidden
// from public view shouldn't leak into a follower's feed either way (as the
// new card itself, a comment on it, or a reaction to it).
export async function readActivityFeed(followedUserIds: string[], limit: number): Promise<ActivityItem[]> {
  if (followedUserIds.length === 0) return [];

  // Cast the AWAITED results, not the raw query promises — Promise<T>'s
  // structural check (via its `then` signature) is much stricter than
  // casting a plain resolved array, which is why every other query in this
  // file casts `(await sql\`...\`)` rather than `sql\`...\` as Promise<...>`.
  const [cardRows, cardCommentRows, profileCommentRows, reactionRows] = (await Promise.all([
    sql`
      SELECT c.*, u.username AS actor_username, COALESCE(u.avatar_url, u.image) AS actor_avatar_url
      FROM cards c
      JOIN users u ON u.id = c.user_id
      WHERE c.user_id = ANY(${followedUserIds}) AND c.is_public = true AND u.username IS NOT NULL
      ORDER BY c.date_added DESC
      LIMIT ${limit}
    `,
    sql`
      SELECT cm.body, cm.created_at, au.username AS actor_username, COALESCE(au.avatar_url, au.image) AS actor_avatar_url,
        c.id AS card_id, c.player, c.image_url
      FROM comments cm
      JOIN users au ON au.id = cm.author_id
      JOIN cards c ON c.id = cm.card_id
      WHERE cm.author_id = ANY(${followedUserIds}) AND c.is_public = true AND au.username IS NOT NULL
      ORDER BY cm.created_at DESC
      LIMIT ${limit}
    `,
    sql`
      SELECT cm.body, cm.created_at, au.username AS actor_username, COALESCE(au.avatar_url, au.image) AS actor_avatar_url,
        pu.username AS target_username
      FROM comments cm
      JOIN users au ON au.id = cm.author_id
      JOIN users pu ON pu.id = cm.profile_user_id
      WHERE cm.author_id = ANY(${followedUserIds}) AND au.username IS NOT NULL AND pu.username IS NOT NULL
      ORDER BY cm.created_at DESC
      LIMIT ${limit}
    `,
    sql`
      SELECT cr.reaction, cr.created_at, au.username AS actor_username, COALESCE(au.avatar_url, au.image) AS actor_avatar_url,
        c.id AS card_id, c.player, c.image_url
      FROM card_reactions cr
      JOIN users au ON au.id = cr.user_id
      JOIN cards c ON c.id = cr.card_id
      WHERE cr.user_id = ANY(${followedUserIds}) AND c.is_public = true AND au.username IS NOT NULL
      ORDER BY cr.created_at DESC
      LIMIT ${limit}
    `,
  ])) as [
    (CardRow & { actor_username: string; actor_avatar_url: string | null })[],
    { body: string; created_at: string; actor_username: string; actor_avatar_url: string | null; card_id: string; player: string; image_url: string }[],
    { body: string; created_at: string; actor_username: string; actor_avatar_url: string | null; target_username: string }[],
    {
      reaction: "heart" | "thumbs_up";
      created_at: string;
      actor_username: string;
      actor_avatar_url: string | null;
      card_id: string;
      player: string;
      image_url: string;
    }[],
  ];

  const items: ActivityItem[] = [
    ...cardRows.map((row): ActivityItem => ({
      type: "card_added",
      timestamp: new Date(row.date_added).toISOString(),
      actorUsername: row.actor_username,
      actorAvatarUrl: row.actor_avatar_url,
      card: rowToCard(row),
    })),
    ...cardCommentRows.map((row): ActivityItem => ({
      type: "comment",
      timestamp: new Date(row.created_at).toISOString(),
      actorUsername: row.actor_username,
      actorAvatarUrl: row.actor_avatar_url,
      body: row.body,
      target: { kind: "card", cardId: row.card_id, player: row.player, imageUrl: row.image_url },
    })),
    ...profileCommentRows.map((row): ActivityItem => ({
      type: "comment",
      timestamp: new Date(row.created_at).toISOString(),
      actorUsername: row.actor_username,
      actorAvatarUrl: row.actor_avatar_url,
      body: row.body,
      target: { kind: "profile", username: row.target_username },
    })),
    ...reactionRows.map((row): ActivityItem => ({
      type: "reaction",
      timestamp: new Date(row.created_at).toISOString(),
      actorUsername: row.actor_username,
      actorAvatarUrl: row.actor_avatar_url,
      reaction: row.reaction,
      cardId: row.card_id,
      player: row.player,
      imageUrl: row.image_url,
    })),
  ];

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items.slice(0, limit);
}

export async function readLibraryForUser(userId: string): Promise<LibraryCard[]> {
  const rows = (await sql`SELECT * FROM cards WHERE user_id = ${userId} ORDER BY date_added DESC`) as CardRow[];
  return rows.map(rowToCard);
}

export async function addCard(card: LibraryCard): Promise<void> {
  await sql`
    INSERT INTO cards (
      id, user_id, player, sport, year, brand, set_name, card_number, parallel, other_details,
      grading_company, grade, cert_number, is_autograph, autograph_company, autograph_grade,
      image_url, back_image_url, date_added, identify_confidence, identify_notes,
      valuation, sales, population, trending,
      purchase_price, purchase_date, purchase_platform, is_featured, is_public, description, description_voice
    ) VALUES (
      ${card.id}, ${card.userId}, ${card.player}, ${card.sport}, ${card.year}, ${card.brand}, ${card.setName}, ${card.cardNumber}, ${card.parallel}, ${card.otherDetails},
      ${card.gradingCompany}, ${card.grade}, ${card.certNumber}, ${card.isAutograph}, ${card.autographCompany}, ${card.autographGrade},
      ${card.imageUrl}, ${card.backImageUrl}, ${card.dateAdded}, ${card.identifyConfidence}, ${card.identifyNotes},
      ${JSON.stringify(card.valuation)}, ${JSON.stringify(card.sales)},
      ${card.population ? JSON.stringify(card.population) : null},
      ${card.trending ? JSON.stringify(card.trending) : null},
      ${card.purchasePrice}, ${card.purchaseDate}, ${card.purchasePlatform}, ${card.isFeatured}, true,
      ${card.description}, ${card.descriptionVoice}
    )
  `;
}

export async function getCard(id: string): Promise<LibraryCard | null> {
  const rows = (await sql`SELECT * FROM cards WHERE id = ${id}`) as CardRow[];
  return rows.length ? rowToCard(rows[0]) : null;
}

// Mirrors the route's PATCH allowlist — purchase info, sold info, isFeatured,
// the generated description, and now the identity fields (editable via the
// in-app card editor). Valuation and images are deliberately absent: they
// only ever come from the scan flow or refresh-valuation's own setter, never
// this generic patch path.
export async function updateCard(id: string, patch: Partial<LibraryCard>): Promise<LibraryCard | null> {
  const existing = await getCard(id);
  if (!existing) return null;
  const merged = { ...existing, ...patch };
  const rows = (await sql`
    UPDATE cards
    SET purchase_price = ${merged.purchasePrice},
        purchase_date = ${merged.purchaseDate},
        purchase_platform = ${merged.purchasePlatform},
        is_sold = ${merged.isSold},
        sold_price = ${merged.soldPrice},
        sold_date = ${merged.soldDate},
        sold_platform = ${merged.soldPlatform},
        is_featured = ${merged.isFeatured},
        is_public = ${merged.isPublic},
        description = ${merged.description},
        description_voice = ${merged.descriptionVoice},
        player = ${merged.player},
        sport = ${merged.sport},
        year = ${merged.year},
        brand = ${merged.brand},
        set_name = ${merged.setName},
        card_number = ${merged.cardNumber},
        parallel = ${merged.parallel},
        other_details = ${merged.otherDetails},
        grading_company = ${merged.gradingCompany},
        grade = ${merged.grade},
        cert_number = ${merged.certNumber},
        is_autograph = ${merged.isAutograph},
        autograph_company = ${merged.autographCompany},
        autograph_grade = ${merged.autographGrade},
        identify_notes = ${merged.identifyNotes}
    WHERE id = ${id}
    RETURNING *
  `) as CardRow[];
  return rows.length ? rowToCard(rows[0]) : null;
}

// Used only by the refresh-valuation route, which computes these fields
// server-side via getValuation() — never accepts them as client input, so a
// narrow, purpose-built setter is fine here (unlike a generic patch, this
// isn't exposed to arbitrary client-supplied values).
export async function setValuationFields(
  id: string,
  fields: { valuation: Valuation; sales: Sale[]; population: Population | null; trending: TrendingSignal | null }
): Promise<LibraryCard | null> {
  const rows = (await sql`
    UPDATE cards
    SET valuation = ${JSON.stringify(fields.valuation)},
        sales = ${JSON.stringify(fields.sales)},
        population = ${fields.population ? JSON.stringify(fields.population) : null},
        trending = ${fields.trending ? JSON.stringify(fields.trending) : null}
    WHERE id = ${id}
    RETURNING *
  `) as CardRow[];
  return rows.length ? rowToCard(rows[0]) : null;
}

export async function setCardImage(id: string, side: "front" | "back", url: string): Promise<LibraryCard | null> {
  const rows =
    side === "front"
      ? ((await sql`UPDATE cards SET image_url = ${url} WHERE id = ${id} RETURNING *`) as CardRow[])
      : ((await sql`UPDATE cards SET back_image_url = ${url} WHERE id = ${id} RETURNING *`) as CardRow[]);
  return rows.length ? rowToCard(rows[0]) : null;
}

export async function deleteCard(id: string): Promise<boolean> {
  // RETURNING the image columns in the same statement avoids a second round
  // trip just to find out what to remove from R2.
  const rows = (await sql`
    DELETE FROM cards WHERE id = ${id}
    RETURNING image_url, back_image_url
  `) as { image_url: string; back_image_url: string | null }[];
  if (!rows.length) return false;
  const { image_url, back_image_url } = rows[0];
  await deleteImage(image_url);
  if (back_image_url) await deleteImage(back_image_url);
  await clearFavoriteCardReferences(id);
  return true;
}
