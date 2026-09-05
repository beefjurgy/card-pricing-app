import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

function normalizeKey(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

export interface SetInfo {
  blurb: string;
}

// Set/manufacturer context is genuinely permanent (a 1981 Topps set never
// changes) and shared across every card from that set, for every user — so
// this is cached in Postgres, not just in-memory like careerStats.ts/
// playerBuzz.ts. Those two describe things that actually change (stats
// accrue, news comes and goes) and accept an in-memory-only cache resetting
// on cold start; this would otherwise pay for a fresh Anthropic call on
// every cold start for a set that's already been described once, forever.
export async function getSetInfo(year: string, brand: string, setName: string, sport: string): Promise<SetInfo | null> {
  const key = normalizeKey(`${year} ${brand} ${setName}`);
  if (!key) return null;

  const cached = (await sql`SELECT blurb FROM set_info WHERE key = ${key}`) as { blurb: string }[];
  if (cached.length > 0) return { blurb: cached[0].blurb };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const cardSummary = [year, brand, setName, sport].filter(Boolean).join(" ");
  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: 220,
      messages: [
        {
          role: "user",
          content: `Write a short, factual "set info" blurb (3-4 sentences, under 90 words) for a collector looking at a card from this trading card set: ${cardSummary}. Cover things like: the era/context of that year's release, anything notable about this particular set from this manufacturer (design, format, notable inserts, scarcity factors), and brief relevant background on the manufacturer. Don't invent specific facts, print run numbers, or claims you're not confident are true — stay general rather than fabricate a detail. Return only the blurb text, no preamble.`,
        },
      ],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    const blurb = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    if (!blurb) return null;

    await sql`
      INSERT INTO set_info (key, blurb) VALUES (${key}, ${blurb})
      ON CONFLICT (key) DO NOTHING
    `;
    return { blurb };
  } catch (err) {
    console.error("Set info generation failed:", err);
    return null;
  }
}
