import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { IDENTITY_TOOL } from "@/lib/identitySchema";
import { auth } from "@/auth";

export const runtime = "nodejs";

type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

async function toImageBlock(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mediaType = (file.type && file.type.startsWith("image/") ? file.type : "image/jpeg") as ImageMediaType;
  return {
    type: "image" as const,
    source: { type: "base64" as const, media_type: mediaType, data: base64 },
  };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to identify a card." }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { needsApiKey: true, error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 200 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("image");
  const backFile = formData.get("backImage");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No image uploaded." }, { status: 400 });
  }
  const hasBack = backFile instanceof File;

  const imageBlocks = [await toImageBlock(file)];
  if (backFile instanceof File) {
    imageBlocks.push(await toImageBlock(backFile));
  }

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: 1024,
      tools: [IDENTITY_TOOL],
      tool_choice: { type: "tool", name: "report_card_identity" },
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text",
              text: hasBack
                ? "Identify this sports trading card from its front and back photos. Read the player name, year, brand/manufacturer, set name, card number, parallel/variant, and grading info from whichever side shows it — the back often confirms the set/copyright info, card number, or a serial number the front doesn't show clearly. If the card is in a graded slab, also read the certification/serial number printed on the label (often next to a QR code). Also check carefully for a visible autograph/signature (on-card or a sticker auto) — if present, note the authentication company and any separate autograph grade shown on the slab label. If something is not legible on either side, leave that field as an empty string rather than guessing."
                : "Identify this sports trading card. Read the player name, year, brand/manufacturer, set name, card number, parallel/variant, and grading info directly off the card. If the card is in a graded slab, also read the certification/serial number printed on the label (often next to a QR code). Also check carefully for a visible autograph/signature (on-card or a sticker auto) — if present, note the authentication company and any separate autograph grade shown on the slab label. If something is not legible, leave that field as an empty string rather than guessing.",
            },
          ],
        },
      ],
    });

    const toolUse = message.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "Model did not return structured card data." }, { status: 502 });
    }

    return NextResponse.json({ identity: toolUse.input });
  } catch (err) {
    console.error("Identify error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Identification failed: ${message}` }, { status: 502 });
  }
}
