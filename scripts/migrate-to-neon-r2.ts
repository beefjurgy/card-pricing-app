// One-time migration: data/library.json + public/uploads/* -> Neon + R2.
// Not part of the deployed app. Run once locally after setting the new env
// vars, with Node >= 20.6:
//   node --env-file=.env.local ./node_modules/.bin/tsx scripts/migrate-to-neon-r2.ts
//
// Purely additive — never touches or deletes data/library.json or
// public/uploads/*, which remain a full offline backup after cutover.
// Idempotent — skips any card id already present in the DB, so it's safe to
// re-run after an interruption without erroring or double-uploading images.

import fs from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { LibraryCard } from "../src/lib/types";

const sql = neon(process.env.DATABASE_URL!);
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS cards (
      id                  UUID PRIMARY KEY,
      player              TEXT NOT NULL,
      sport               TEXT NOT NULL,
      year                TEXT NOT NULL,
      brand               TEXT NOT NULL,
      set_name            TEXT NOT NULL,
      card_number         TEXT NOT NULL,
      parallel            TEXT NOT NULL DEFAULT '',
      grading_company     TEXT NOT NULL DEFAULT '',
      grade               TEXT NOT NULL DEFAULT '',
      cert_number         TEXT NOT NULL DEFAULT '',
      is_autograph        BOOLEAN NOT NULL DEFAULT false,
      autograph_company   TEXT NOT NULL DEFAULT '',
      autograph_grade     TEXT NOT NULL DEFAULT '',
      image_url           TEXT NOT NULL DEFAULT '',
      back_image_url      TEXT,
      date_added          TIMESTAMPTZ NOT NULL DEFAULT now(),
      identify_confidence TEXT NOT NULL DEFAULT 'medium',
      identify_notes      TEXT NOT NULL DEFAULT '',
      valuation           JSONB NOT NULL,
      sales               JSONB NOT NULL DEFAULT '[]',
      population          JSONB,
      trending            JSONB,
      purchase_price      NUMERIC,
      purchase_date       TEXT,
      purchase_platform   TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS cards_date_added_idx ON cards (date_added DESC)`;
}

function contentTypeFor(filename: string): string {
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

// Takes "/uploads/<filename>", uploads public/uploads/<filename> to R2 under
// the SAME filename as the key, returns the new public URL.
async function migrateImage(localUrl: string): Promise<string> {
  const filename = path.basename(localUrl);
  const filePath = path.join(process.cwd(), "public", "uploads", filename);
  const buffer = await fs.readFile(filePath);
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: filename,
      Body: buffer,
      ContentType: contentTypeFor(filename),
    })
  );
  return `${PUBLIC_URL}/${filename}`;
}

async function main() {
  await ensureSchema();

  const raw = await fs.readFile(path.join(process.cwd(), "data", "library.json"), "utf-8");
  const rawCards: LibraryCard[] = JSON.parse(raw);

  // A few of the oldest cards predate isAutograph/autographCompany/
  // autographGrade becoming consistently-set fields, so those keys are
  // simply absent (not null) on their JSON objects — normalize to the
  // column's NOT NULL defaults rather than let the insert reject them.
  const cards = rawCards.map((card) => ({
    ...card,
    isAutograph: card.isAutograph ?? false,
    autographCompany: card.autographCompany ?? "",
    autographGrade: card.autographGrade ?? "",
  }));

  let migrated = 0;
  let skipped = 0;

  for (const card of cards) {
    const existing = await sql`SELECT id FROM cards WHERE id = ${card.id}`;
    if (existing.length) {
      skipped++;
      continue;
    }

    const imageUrl = card.imageUrl ? await migrateImage(card.imageUrl) : "";
    const backImageUrl = card.backImageUrl ? await migrateImage(card.backImageUrl) : null;

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
        ${imageUrl}, ${backImageUrl}, ${card.dateAdded}, ${card.identifyConfidence}, ${card.identifyNotes},
        ${JSON.stringify(card.valuation)}, ${JSON.stringify(card.sales)},
        ${card.population ? JSON.stringify(card.population) : null},
        ${card.trending ? JSON.stringify(card.trending) : null},
        ${card.purchasePrice}, ${card.purchaseDate}, ${card.purchasePlatform}
      )
    `;
    migrated++;
    console.log(`migrated ${card.id} (${card.player})`);
  }

  console.log(`Done. migrated=${migrated} skipped=${skipped} total=${cards.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
