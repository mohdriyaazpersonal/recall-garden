import test from "node:test";
import assert from "node:assert/strict";
import {
  scheduleReview,
  dueCards,
  validateBackup,
  seedState,
  DAY,
} from "../core.js";
test("grades schedule distinct future intervals without changing original", () => {
  const card = seedState().decks[0].cards[0],
    now = 1700000000000;
  assert.equal(scheduleReview(card, "again", now).due, now + 600000);
  assert.equal(scheduleReview(card, "good", now).due, now + DAY);
  assert.equal(scheduleReview(card, "easy", now).due, now + 4 * DAY);
  assert.equal(card.reviews, 0);
  assert.equal(scheduleReview(card, "good", now).reviews, 1);
  assert.throws(() => scheduleReview(card, "bad", now));
});
test("mature cards grow according to confidence", () => {
  const c = { ...seedState().decks[0].cards[0], interval: 10 };
  assert.equal(scheduleReview(c, "hard", 0).interval, 12);
  assert.equal(scheduleReview(c, "good", 0).interval, 25);
  assert.equal(scheduleReview(c, "easy", 0).interval, 35);
});
test("due queue includes boundary, excludes future, and sorts deterministically", () => {
  assert.deepEqual(
    dueCards(
      [
        { id: "c", due: 20 },
        { id: "b", due: 10 },
        { id: "a", due: 10 },
      ],
      10,
    ).map((x) => x.id),
    ["a", "b"],
  );
});
test("backup validation accepts a fresh copy and rejects malformed or duplicate data", () => {
  const good = seedState();
  assert.deepEqual(validateBackup(good), good);
  assert.notEqual(validateBackup(good), good);
  for (const mutate of [
    (s) => (s.version = 2),
    (s) => s.decks.push(s.decks[0]),
    (s) => (s.decks[0].cards[0].due = -1),
    (s) => (s.decks[0].cards[0].front = ""),
    (s) => (s.decks[0].cards[0].reviews = 1.2),
  ]) {
    const bad = seedState();
    mutate(bad);
    assert.throws(() => validateBackup(bad));
  }
});
