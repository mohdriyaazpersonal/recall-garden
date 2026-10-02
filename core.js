export const DAY = 86400000;
export function scheduleReview(card, grade, now = Date.now()) {
  if (!["again", "hard", "good", "easy"].includes(grade))
    throw new Error("Unknown review grade");
  if (!Number.isFinite(now)) throw new Error("Invalid time");
  const old = Number(card.interval) || 0;
  const interval =
    grade === "again"
      ? 0
      : grade === "hard"
        ? Math.max(1, Math.round(old * 1.2))
        : grade === "good"
          ? Math.max(1, Math.round(old * 2.5))
          : Math.max(4, Math.round(old * 3.5));
  return {
    ...card,
    interval,
    due: now + (grade === "again" ? 600000 : interval * DAY),
    reviews: (card.reviews || 0) + 1,
    lastReviewed: now,
  };
}
export function dueCards(cards, now = Date.now()) {
  return cards
    .filter((c) => c.due <= now)
    .sort((a, b) => a.due - b.due || a.id.localeCompare(b.id));
}
export function validateBackup(value) {
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.decks) ||
    value.decks.length > 100
  )
    throw new Error("Expected a Recall Garden version 1 backup.");
  const ids = new Set();
  const str = (x, max) => typeof x === "string" && x.length <= max;
  for (const d of value.decks) {
    if (
      !d ||
      !str(d.id, 100) ||
      !d.id ||
      ids.has(d.id) ||
      !str(d.name, 120) ||
      !d.name.trim() ||
      !str(d.notes, 100000) ||
      !Array.isArray(d.cards) ||
      d.cards.length > 5000
    )
      throw new Error("Invalid or duplicate deck.");
    ids.add(d.id);
    for (const c of d.cards) {
      if (
        !c ||
        !str(c.id, 100) ||
        !c.id ||
        ids.has(c.id) ||
        !str(c.front, 2000) ||
        !c.front.trim() ||
        !str(c.back, 5000) ||
        !c.back.trim() ||
        !str(c.source, 5000) ||
        !Number.isFinite(c.due) ||
        c.due < 0 ||
        !Number.isFinite(c.interval) ||
        c.interval < 0 ||
        !Number.isInteger(c.reviews) ||
        c.reviews < 0
      )
        throw new Error("Invalid or duplicate flashcard.");
      ids.add(c.id);
    }
  }
  return structuredClone(value);
}
export function seedState() {
  return {
    version: 1,
    decks: [
      {
        id: "deck-design",
        name: "Design fundamentals",
        notes:
          "# Design fundamentals\n\nContrast creates visual hierarchy: differences in size, weight, or color guide attention.\n\nWhitespace is the space between elements. It groups related information and makes a composition easier to read.\n\nA design system combines reusable components with shared standards.\n\nThese are sample notes. Replace them with your own trusted material.",
        cards: [
          {
            id: "card-contrast",
            front: "What does contrast help create?",
            back: "Visual hierarchy. Differences in size, weight, or color guide attention.",
            source:
              "Contrast creates visual hierarchy: differences in size, weight, or color guide attention.",
            due: 0,
            interval: 0,
            reviews: 0,
          },
          {
            id: "card-space",
            front: "Why is whitespace useful?",
            back: "It groups related information and makes a composition easier to read.",
            source:
              "Whitespace is the space between elements. It groups related information and makes a composition easier to read.",
            due: 0,
            interval: 0,
            reviews: 0,
          },
          {
            id: "card-system",
            front: "What does a design system combine?",
            back: "Reusable components and shared standards.",
            source:
              "A design system combines reusable components with shared standards.",
            due: 0,
            interval: 0,
            reviews: 0,
          },
        ],
      },
      {
        id: "deck-web",
        name: "Web essentials",
        notes:
          "# Web essentials\n\nHTML describes page structure. CSS controls presentation. JavaScript adds behavior.\n\nSemantic HTML communicates meaning to browsers and assistive technologies.",
        cards: [
          {
            id: "card-html",
            front: "What is the role of semantic HTML?",
            back: "It communicates meaning to browsers and assistive technologies.",
            source:
              "Semantic HTML communicates meaning to browsers and assistive technologies.",
            due: 0,
            interval: 0,
            reviews: 0,
          },
        ],
      },
    ],
  };
}
