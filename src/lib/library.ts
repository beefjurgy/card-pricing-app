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
  player: string;
  sport: string;
  year: string;
  brand: string;
  set_name: string;
  card_number: string;
  parallel: string;
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
}

function rowToCard(row: CardRow): LibraryCard {
  return {
    id: row.id,
    player: row.player,
    sport: row.sport as LibraryCard["sport"],
    year: row.year,
    brand: row.brand,
    setName: row.set_name,
    cardNumber: row.card_number,
    parallel: row.parallel,
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
  };
}

export async function readLibrary(): Promise<LibraryCard[]> {
  const rows = (await sql`SELECT * FROM cards ORDER BY date_added DESC`) as CardRow[];
  return rows.map(rowToCard);
}

export async function addCard(card: LibraryCard): Promise<void> {
  await sql`
    INSERT INTO cards (
      id, player, sport, year, brand, set_name, card_number, parallel,
      grading_company, grade, cert_number, is_autograph, autograph_company, autograph_grade,
      image_url, back_image_url, date_added, identify_confidence, identify_notes,
      valuation, sales, population, trending,
      purchase_price, purchase_date, purchase_platform
    ) VALUES (
      ${card.id}, ${card.player}, ${card.sport}, ${card.year}, ${card.brand}, ${card.setName}, ${card.cardNumber}, ${card.parallel},
      ${card.gradingCompany}, ${card.grade}, ${card.certNumber}, ${card.isAutograph}, ${card.autographCompany}, ${card.autographGrade},
      ${card.imageUrl}, ${card.backImageUrl}, ${card.dateAdded}, ${card.identifyConfidence}, ${card.identifyNotes},
      ${JSON.stringify(card.valuation)}, ${JSON.stringify(card.sales)},
      ${card.population ? JSON.stringify(card.population) : null},
      ${card.trending ? JSON.stringify(card.trending) : null},
      ${card.purchasePrice}, ${card.purchaseDate}, ${card.purchasePlatform}
    )
  `;
}

export async function getCard(id: string): Promise<LibraryCard | null> {
  const rows = (await sql`SELECT * FROM cards WHERE id = ${id}`) as CardRow[];
  return rows.length ? rowToCard(rows[0]) : null;
}

// The route's PATCH surface only ever touches purchase-related fields, so
// mirror that here rather than building a generic dynamic-column UPDATE.
export async function updateCard(id: string, patch: Partial<LibraryCard>): Promise<LibraryCard | null> {
  const existing = await getCard(id);
  if (!existing) return null;
  const merged = { ...existing, ...patch };
  const rows = (await sql`
    UPDATE cards
    SET purchase_price = ${merged.purchasePrice},
        purchase_date = ${merged.purchaseDate},
        purchase_platform = ${merged.purchasePlatform}
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
