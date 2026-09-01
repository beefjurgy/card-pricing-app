import "server-only";
import { neon } from "@neondatabase/serverless";
import { LibraryCard, Population, Sale, TrendingSignal, Valuation } from "./types";
import { deleteImage } from "./storage";

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
  is_featured: boolean;
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
    isFeatured: row.is_featured,
    description: row.description,
    descriptionVoice: row.description_voice as LibraryCard["descriptionVoice"],
  };
}

export async function readLibrary(): Promise<LibraryCard[]> {
  const rows = (await sql`SELECT * FROM cards ORDER BY date_added DESC`) as CardRow[];
  return rows.map(rowToCard);
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
      purchase_price, purchase_date, purchase_platform, is_featured, description, description_voice
    ) VALUES (
      ${card.id}, ${card.userId}, ${card.player}, ${card.sport}, ${card.year}, ${card.brand}, ${card.setName}, ${card.cardNumber}, ${card.parallel}, ${card.otherDetails},
      ${card.gradingCompany}, ${card.grade}, ${card.certNumber}, ${card.isAutograph}, ${card.autographCompany}, ${card.autographGrade},
      ${card.imageUrl}, ${card.backImageUrl}, ${card.dateAdded}, ${card.identifyConfidence}, ${card.identifyNotes},
      ${JSON.stringify(card.valuation)}, ${JSON.stringify(card.sales)},
      ${card.population ? JSON.stringify(card.population) : null},
      ${card.trending ? JSON.stringify(card.trending) : null},
      ${card.purchasePrice}, ${card.purchaseDate}, ${card.purchasePlatform}, ${card.isFeatured},
      ${card.description}, ${card.descriptionVoice}
    )
  `;
}

export async function getCard(id: string): Promise<LibraryCard | null> {
  const rows = (await sql`SELECT * FROM cards WHERE id = ${id}`) as CardRow[];
  return rows.length ? rowToCard(rows[0]) : null;
}

// Mirrors the route's PATCH allowlist — purchase info, isFeatured, the
// generated description, and now the identity fields (editable via the
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
        is_featured = ${merged.isFeatured},
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
  return true;
}
