export const IDENTITY_TOOL = {
  name: "report_card_identity",
  description: "Report structured identification details for a trading card (sports or non-sport, e.g. Garbage Pail Kids).",
  input_schema: {
    type: "object" as const,
    properties: {
      player: { type: "string", description: "Player's full name. For non-sport cards (e.g. Garbage Pail Kids), the character's name instead." },
      sport: {
        type: "string",
        enum: ["Baseball", "Basketball", "Football", "Hockey", "Soccer", "Other"],
        description: "Sport the card is for. Use 'Other' for non-sport/novelty cards like Garbage Pail Kids.",
      },
      year: { type: "string", description: "Card year, e.g. 2018. Empty string if unknown." },
      brand: { type: "string", description: "Manufacturer, e.g. Topps, Panini, Bowman, Upper Deck." },
      setName: { type: "string", description: "Set name, e.g. Chrome, Prizm, Update Series." },
      cardNumber: { type: "string", description: "Card number, e.g. 193 or US175. Empty string if unknown." },
      parallel: {
        type: "string",
        description:
          "Parallel/insert/variant, e.g. 'Silver Prizm' or 'Base Rookie'. Use 'Base' if standard. If the card is serial-numbered (a print run like '086/150' printed on the card), append the run as e.g. 'Silver Prizm /150' — this is how the pricing lookup tells a scarce numbered parallel apart from the far more common unnumbered version of the same insert, so include it here even if you also mention the exact serial number in notes.",
      },
      gradingCompany: {
        type: "string",
        description: "Grading company if graded, as its abbreviation (e.g. PSA, BGS, SGC, CCG, BGG, PGS). Empty string if ungraded/raw/unknown.",
      },
      grade: { type: "string", description: "Numeric grade if graded, e.g. '10'. Empty string if ungraded/raw/unknown." },
      certNumber: {
        type: "string",
        description:
          "The certification/serial number printed on the grading company's slab label (often next to a QR code), e.g. '55120539'. Empty string if ungraded or the number isn't legible.",
      },
      isAutograph: { type: "boolean", description: "True if the card has a visible autograph/signature on it (on-card or sticker auto)." },
      autographCompany: {
        type: "string",
        description: "Authentication company for the autograph if stated on the card/slab (e.g. PSA/DNA, JSA, Beckett Authentication, Panini Authentic, Topps Certified Autograph). Empty string if not autographed or the authenticator isn't stated.",
      },
      autographGrade: {
        type: "string",
        description: "Separate autograph grade if the authenticator assigns one distinct from the overall card grade (e.g. a BGS card grade of 9 with an Auto grade of 10). Empty string if not autographed or no separate auto grade is shown.",
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "Your confidence in this identification overall.",
      },
      notes: { type: "string", description: "Brief notes about anything uncertain or ambiguous." },
    },
    required: [
      "player",
      "sport",
      "year",
      "brand",
      "setName",
      "cardNumber",
      "parallel",
      "gradingCompany",
      "grade",
      "certNumber",
      "isAutograph",
      "autographCompany",
      "autographGrade",
      "confidence",
      "notes",
    ],
  },
};
