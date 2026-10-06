/** PERSON 2 – Fachliche Invarianten der Lernlogik. Ausführen: npm test */
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNextReview, calculateDeckProgress, orderCardsForStudy, reinsertCard } from '../engine/spacedRepetition.js';

test('Niedrigeres Rating ergibt bei gleicher Historie immer frühere Fälligkeit', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  for (let score = 0; score <= 100; score++) {
    const results = [1, 2, 3, 4].map((rating) => calculateNextReview(score, rating, now));
    for (let i = 1; i < results.length; i++) assert.ok(results[i - 1].nextReviewAt < results[i].nextReviewAt);
    results.forEach((result) => assert.ok(result.score >= 0 && result.score <= 100));
  }
  assert.equal(calculateNextReview(50, 1, now).intervalMs, 60_000);
  assert.ok(calculateNextReview(50, 1, now).score < 50);
  assert.ok(calculateNextReview(50, 3, now).score > 50);
  assert.ok(calculateNextReview(50, 4, now).score > calculateNextReview(50, 3, now).score);
});

test('Leere und neue Decks haben 0 %, Mittelwert ist bewertungsbasiert', () => {
  assert.equal(calculateDeckProgress([]), 0);
  assert.equal(calculateDeckProgress([{ score: 0 }, { score: 0 }]), 0);
  assert.equal(calculateDeckProgress([{ score: 0 }, { score: 20 }, { score: 100 }]), 40);
  assert.equal(calculateDeckProgress([{ score: 100 }]), 100);
});

test('Ungültige Ratings und Scores werden zurückgewiesen', () => {
  for (const rating of [0, 5, 1.5, '3', null]) assert.throws(() => calculateNextReview(0, rating));
  for (const score of [-1, 101, NaN, Infinity]) assert.throws(() => calculateNextReview(score, 3));
});

test('Sitzungsqueue: sofort, nach drei Karten, langfristig erledigt', () => {
  const card = { id: 'A' };
  const queue = ['B', 'C', 'D', 'E'].map((id) => ({ id }));
  assert.deepEqual(reinsertCard(queue, card, 0).map((c) => c.id), ['A', 'B', 'C', 'D', 'E']);
  assert.deepEqual(reinsertCard(queue, card, 3).map((c) => c.id), ['B', 'C', 'D', 'A', 'E']);
  assert.deepEqual(reinsertCard(queue, card, null), queue);
  assert.deepEqual(reinsertCard([], card, 3), [card]);
  assert.equal(queue.length, 4);
});

test('Nur fällige Karten im Standardmodus; freies Üben sortiert Zukunft nach hinten', () => {
  const cards = [{ id: 'a', score: 0, nextReviewAt: null }, { id: 'b', score: 20, nextReviewAt: '2030-01-01T00:00:00Z' }, { id: 'c', score: 10, nextReviewAt: '2025-01-01T00:00:00Z' }];
  const now = new Date('2026-01-01T00:00:00Z');
  assert.deepEqual(orderCardsForStudy(cards, { now }).map((c) => c.id), ['a', 'c']);
  assert.deepEqual(orderCardsForStudy(cards, { now, includeFuture: true }).map((c) => c.id), ['a', 'c', 'b']);
  assert.equal(cards[1].id, 'b');
});
