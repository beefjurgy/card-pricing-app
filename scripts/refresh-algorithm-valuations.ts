import { neon } from "@neondatabase/serverless";
import type { CardIdentity } from "../src/lib/types";

const sql = neon(process.env.DATABASE_URL!);
const PRODUCTION_URL = "https://card-pricing-app-snc9.vercel.app";

interface Row {
  id: string;
  player: string;
  valuation: { note: string };
  sport: string;
  year: string;
  brand: string;
  set_name: string;
  card_number: string;
  parallel: string;
  grading_company: string;
  grade: string;
  is_autograph: boolean;
  autograph_company: string;
  autograph_grade: string;
}

async function main() {
  const rows = (await sql`SELECT * FROM cards`) as Row[];
  let refreshed = 0;
  let protectedCount = 0;

  for (const row of rows) {
    if (row.valuation.note.includes("supplied directly by the collector")) {
      protectedCount++;
      console.log(`protected (manual): ${row.player}`);
      continue;
    }

    const identity: CardIdentity = {
      player: row.player,
      sport: row.sport as CardIdentity["sport"],
      year: row.year,
      brand: row.brand,
      setName: row.set_name,
      cardNumber: row.card_number,
      parallel: row.parallel,
      gradingCompany: row.grading_company,
      grade: row.grade,
      certNumber: "",
      isAutograph: row.is_autograph,
      autographCompany: row.autograph_company,
      autographGrade: row.autograph_grade,
    };

    const res = await fetch(`${PRODUCTION_URL}/api/valuation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(identity),
    });
    const result = await res.json();

    await sql`
      UPDATE cards
      SET valuation = ${JSON.stringify(result.valuation)},
          trending = ${result.trending ? JSON.stringify(result.trending) : null}
      WHERE id = ${row.id}
    `;

    console.log(`refreshed: ${row.player} -> $${result.valuation.estimate}`);
    refreshed++;
  }

  console.log(`\nDone. refreshed=${refreshed} protected=${protectedCount} total=${rows.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
