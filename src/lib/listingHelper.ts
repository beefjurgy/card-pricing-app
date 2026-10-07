import { CardIdentity, LibraryCard } from "./types";

// eBay's own title field caps at 80 characters; Whatnot has no equivalent
// hard limit, but the same length is a reasonable target for either
// platform. Built in priority order (most important first) so trimming
// just drops the lowest-priority trailing pieces rather than truncating
// mid-word through something a buyer would search for.
export function buildListingTitle(card: CardIdentity): string {
  const parts = [
    card.year,
    card.brand,
    card.setName && card.setName !== card.brand ? card.setName : "",
    card.player,
    card.cardNumber && `#${card.cardNumber}`,
    card.parallel && card.parallel.toLowerCase() !== "base" ? card.parallel : "",
    card.gradingCompany && card.grade ? `${card.gradingCompany} ${card.grade}` : "",
    card.isAutograph ? "Auto" : "",
    card.otherDetails,
  ].filter(Boolean);
  const title = parts.join(" ");
  if (title.length <= 80) return title;
  return title.slice(0, 80).replace(/\s+\S*$/, "");
}

export function buildListingDescription(card: LibraryCard): string {
  const identity = [card.year, card.brand, card.setName, card.player, card.cardNumber && `#${card.cardNumber}`]
    .filter(Boolean)
    .join(" ");
  const lines: string[] = [];
  lines.push(`${identity}${card.parallel && card.parallel.toLowerCase() !== "base" ? ` — ${card.parallel}` : ""}.`);

  if (card.gradingCompany && card.grade) {
    lines.push(`Professionally graded ${card.gradingCompany} ${card.grade}${card.certNumber ? ` (cert #${card.certNumber})` : ""}.`);
  } else {
    lines.push("Raw / ungraded — please review photos closely for condition.");
  }

  if (card.isAutograph) {
    lines.push(
      `Autographed${card.autographCompany ? `, authenticated by ${card.autographCompany}` : ""}${
        card.autographGrade ? ` (auto grade ${card.autographGrade})` : ""
      }.`
    );
  }

  if (card.otherDetails) lines.push(`${card.otherDetails}.`);

  lines.push(
    "From a smoke-free home. Ships securely within 1-2 business days of payment. See photos for exact condition — feel free to ask questions before bidding/buying."
  );

  return lines.join(" ");
}
