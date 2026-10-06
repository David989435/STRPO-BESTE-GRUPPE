/**
 * PERSON 2 – Algorithmus und Fortschritt.
 * Reine Funktionen: kein Dateizugriff, kein HTTP, kein DOM.
 * Das Backend ist die einzige Instanz, die Bewertungen dauerhaft übernimmt.
 */
export const RATINGS = Object.freeze([
  { value: 1, label: 'Nicht gewusst', short: 'Gleich noch einmal' },
  { value: 2, label: 'Unsicher', short: 'Nach bis zu 3 Karten' },
  { value: 3, label: 'Gewusst', short: 'Ab morgen' },
  { value: 4, label: 'Sehr sicher gewusst', short: 'Ab einer Woche' },
]);

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const clamp = (score) => Math.max(0, Math.min(100, score));

/**
 * Gleicher Ausgangsscore => streng steigende Zeitintervalle für Rating 1–4.
 * Dritter Parameter nur zur deterministischen Prüfung; zwei Parameter genügen.
 * repeatAfterCards: aktive Sitzung; null = für diese Sitzung abgeschlossen.
 * nextReviewAt: echte Uhrzeit, gilt auch nach Browser-/Server-Neustart.
 */
export function calculateNextReview(currentScore, rating, now = new Date()) {
  if (!Number.isFinite(currentScore) || currentScore < 0 || currentScore > 100) {
    throw new RangeError('Der Score muss zwischen 0 und 100 liegen.');
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 4) {
    throw new RangeError('Die Bewertung muss eine ganze Zahl von 1 bis 4 sein.');
  }
  const timestamp = new Date(now).getTime();
  if (!Number.isFinite(timestamp)) throw new RangeError('Ungültiger Zeitpunkt.');

  // Die bisherige Sicherheit verlängert nur die langfristigen Intervalle.
  const factor = 1 + currentScore / 100;
  const score = clamp(currentScore + [-30, -10, 20, 35][rating - 1]);
  const intervalMs = [MINUTE, 10 * MINUTE, Math.round(DAY * factor), Math.round(7 * DAY * factor)][rating - 1];
  return {
    score,
    rating,
    intervalMs,
    nextReviewAt: new Date(timestamp + intervalMs).toISOString(),
    repeatAfterCards: [0, 3, null, null][rating - 1],
  };
}

/** Unbewertete Karten zählen mit 0. Ein leeres Deck hat 0 % Fortschritt. */
export function calculateDeckProgress(cards) {
  if (!cards.length) return 0;
  return Math.round(cards.reduce((sum, card) => sum + clamp(Number(card.score) || 0), 0) / cards.length);
}

export function isDue(card, now = new Date()) {
  return !card.nextReviewAt || new Date(card.nextReviewAt).getTime() <= new Date(now).getTime();
}

/** Fällige Karten zuerst, danach aufsteigende Fälligkeit und kleinerer Score. */
export function orderCardsForStudy(cards, { includeFuture = false, now = new Date() } = {}) {
  return cards.filter((card) => includeFuture || isDue(card, now)).sort((a, b) => {
    const aTime = a.nextReviewAt ? Date.parse(a.nextReviewAt) : 0;
    const bTime = b.nextReviewAt ? Date.parse(b.nextReviewAt) : 0;
    return aTime - bTime || a.score - b.score || a.id.localeCompare(b.id);
  });
}

/** Aktuelle Karte wurde bereits entfernt. Eingabeliste bleibt unverändert. */
export function reinsertCard(queue, card, repeatAfterCards) {
  const result = queue.filter((item) => item.id !== card.id);
  if (repeatAfterCards !== null) result.splice(Math.min(repeatAfterCards, result.length), 0, card);
  return result;
}
