import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CardIdentity } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { needsApiKey: true, error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 200 }
    );
  }

  const { voice, ...identity } = (await req.json()) as CardIdentity & {
    voice?: "simmons" | "berman" | "madden" | "costas" | "scott" | "burke";
  };
  if (!identity?.player) {
    return NextResponse.json({ error: "Player name is required." }, { status: 400 });
  }

  const cardSummary = [identity.year, identity.brand, identity.setName, identity.parallel, identity.player]
    .filter(Boolean)
    .join(" ");
  const gradeText = identity.gradingCompany && identity.grade ? `, graded ${identity.gradingCompany} ${identity.grade}` : "";
  const autoText = identity.isAutograph
    ? `, autographed${identity.autographCompany ? ` (authenticated by ${identity.autographCompany})` : ""}${identity.autographGrade ? ` with an auto grade of ${identity.autographGrade}` : ""}`
    : "";

  const voiceInstruction =
    voice === "berman"
      ? " Write it in the over-the-top style of a legendary highlight-reel sports announcer known for booming delivery, alliteration, and playful signature nicknames for players — exclamation points welcome."
      : voice === "simmons"
      ? " Write it in the voice of a witty, pop-culture-referencing sports columnist known for digressive hot takes and nostalgia — conversational, a little self-aware, a parenthetical aside or two."
      : voice === "madden"
      ? " Write it in the exuberant, folksy voice of a beloved football-broadcaster-turned-video-game-namesake known for booming 'BOOM!'-style exclamations, simple joyful enthusiasm, and vivid down-to-earth comparisons (trucks, turkey legs, big guys doing big-guy things)."
      : voice === "costas"
      ? " Write it in the polished, literary voice of a veteran primetime sports anchor known for measured eloquence, understated wit, and a fondness for weaving in historical context and gravitas."
      : voice === "scott"
      ? " Write it in the electric, hip-hop-inflected voice of an iconic late-night highlights anchor known for effortless cool, catchy slang-flecked signature phrases, and infectious energy — 'as cool as the other side of the pillow.'"
      : voice === "burke"
      ? " Write it in the sharp, insightful voice of a veteran basketball analyst known for precise on-court IQ, incisive technical breakdowns, and warm but no-nonsense authority."
      : "";

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Write a short, fun, playful flavor-text description (2-3 sentences, under 60 words) for a sports card, like hype copy a collector would enjoy reading. Card: ${cardSummary}${gradeText}${autoText}.${voiceInstruction} Be creative and entertaining — light humor is welcome — but don't invent specific fake stats, dates, or claims about real career achievements presented as fact. Return only the description text, no preamble.`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const description = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    if (!description) {
      return NextResponse.json({ error: "Model did not return a description." }, { status: 502 });
    }

    return NextResponse.json({ description });
  } catch (err) {
    console.error("Describe error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Description generation failed: ${message}` }, { status: 502 });
  }
}
