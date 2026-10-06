/** PERSON 1 – Anwendungsfälle zwischen REST, Dateispeicher und Engine. */
import { randomUUID } from 'node:crypto';
import { HttpError } from './persistence.js';
import { demoDecks } from './demo.js';
import { calculateDeckProgress, calculateNextReview, isDue, orderCardsForStudy } from '../engine/spacedRepetition.js';

const findDeck = (state, id) => {
  const deck = state.decks.find((deck) => deck.id === id);
  if (!deck) throw new HttpError(404, 'Dieses Kartendeck wurde nicht gefunden.');
  return deck;
};
const findCard = (state, id) => {
  const card = state.cards.find((card) => card.id === id);
  if (!card) throw new HttpError(404, 'Diese Karte wurde nicht gefunden.');
  return card;
};
const cleanText = (value, name, max, required = true) => {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
    throw new HttpError(400, `${name}: ${required ? 'Bitte ausfüllen; ' : ''}höchstens ${max} Zeichen.`);
  }
  return value.trim();
};
const deckFields = (body) => ({
  name: cleanText(body.name, 'Name', 100),
  subject: cleanText(body.subject, 'Fach', 80),
  description: cleanText(body.description ?? '', 'Beschreibung', 1000, false),
});
const cardFields = (body) => ({ front: cleanText(body.front, 'Vorderseite', 10000), back: cleanText(body.back, 'Rückseite', 10000) });
function newCard(deckId, fields) {
  return { id: randomUUID(), deckId, ...fields, images: [], score: 0, lastRating: null, nextReviewAt: null, reviewCount: 0, lastReviewedAt: null, createdAt: new Date().toISOString() };
}
export function deckSummary(deck, cards) {
  const own = cards.filter((card) => card.deckId === deck.id);
  return { ...deck, cardCount: own.length, dueCount: own.filter((card) => isDue(card)).length, progress: calculateDeckProgress(own), reviewedCount: own.filter((card) => card.reviewCount > 0).length };
}

/** Nur Rasterbilder; MIME wird aus Dateisignaturen erkannt. Maximal 5 MiB. */
function decodeImage(body) {
  const name = cleanText(body.name, 'Dateiname', 240);
  if (!['front', 'back'].includes(body.side)) throw new HttpError(400, 'Bitte eine Kartenseite wählen.');
  if (typeof body.data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.data) || body.data.length % 4 !== 0) throw new HttpError(400, 'Ungültige Bilddaten.');
  const buffer = Buffer.from(body.data, 'base64');
  if (buffer.length > 5 * 1024 * 1024) throw new HttpError(413, 'Ein Bild darf höchstens 5 MB groß sein.');
  let extension, mime;
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && buffer.toString('ascii', 12, 16) === 'IHDR') { extension = 'png'; mime = 'image/png'; }
  else if (buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 && buffer.at(-2) === 255 && buffer.at(-1) === 217) { extension = 'jpg'; mime = 'image/jpeg'; }
  else if (buffer.length >= 30 && /^GIF8[79]a$/.test(buffer.toString('ascii', 0, 6))) { extension = 'gif'; mime = 'image/gif'; }
  else if (buffer.length >= 16 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') { extension = 'webp'; mime = 'image/webp'; }
  else throw new HttpError(400, 'Bitte eine gültige PNG-, JPG-, GIF- oder WebP-Datei wählen.');
  return { buffer, extension, mime, name, side: body.side };
}

export function createService(store) {
  return {
    async listDecks() {
      const state = await store.read();
      return { decks: state.decks.map((deck) => deckSummary(deck, state.cards)), warning: store.csvWarning };
    },
    async getDeck(id) {
      const state = await store.read();
      return { deck: deckSummary(findDeck(state, id), state.cards), cards: state.cards.filter((card) => card.deckId === id) };
    },
    async createDeck(body) {
      const fields = deckFields(body);
      return store.transaction((state) => {
        const deck = { id: randomUUID(), ...fields, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        state.decks.push(deck);
        return deckSummary(deck, []);
      });
    },
    async updateDeck(id, body) {
      const fields = deckFields(body);
      return store.transaction((state) => Object.assign(findDeck(state, id), fields, { updatedAt: new Date().toISOString() }));
    },
    async deleteDeck(id) {
      const images = await store.transaction((state) => {
        findDeck(state, id);
        const images = state.cards.filter((card) => card.deckId === id).flatMap((card) => card.images);
        state.decks = state.decks.filter((deck) => deck.id !== id);
        state.cards = state.cards.filter((card) => card.deckId !== id);
        state.reviews = state.reviews.filter((review) => review.deckId !== id);
        return images;
      });
      for (const image of images) await store.removeImage(image.filename);
      return { deleted: true };
    },
    async createCard(deckId, body) {
      const fields = cardFields(body);
      return store.transaction((state) => { findDeck(state, deckId); const card = newCard(deckId, fields); state.cards.push(card); return card; });
    },
    async updateCard(id, body) {
      const fields = cardFields(body);
      return store.transaction((state) => Object.assign(findCard(state, id), fields));
    },
    async deleteCard(id) {
      const images = await store.transaction((state) => {
        const card = findCard(state, id);
        state.cards = state.cards.filter((card) => card.id !== id);
        state.reviews = state.reviews.filter((review) => review.cardId !== id);
        return card.images;
      });
      for (const image of images) await store.removeImage(image.filename);
      return { deleted: true };
    },
    async addImage(id, body) {
      const image = decodeImage(body);
      // Erst Existenz prüfen, dann Bild schreiben, danach Zuordnung committen.
      findCard(await store.read(), id);
      const filename = await store.saveImage(image.buffer, image.extension);
      try {
        return await store.transaction((state) => {
          const card = findCard(state, id);
          if (card.images.length >= 8) throw new HttpError(400, 'Pro Karte sind bis zu 8 Bilder möglich.');
          card.images.push({ id: randomUUID(), filename, originalName: image.name, mime: image.mime, size: image.buffer.length, side: image.side });
          return card;
        });
      } catch (error) { await store.removeImage(filename); throw error; }
    },
    async removeImage(cardId, imageId) {
      const result = await store.transaction((state) => {
        const card = findCard(state, cardId);
        const image = card.images.find((image) => image.id === imageId);
        if (!image) throw new HttpError(404, 'Bild nicht gefunden.');
        card.images = card.images.filter((image) => image.id !== imageId);
        return { card, filename: image.filename };
      });
      await store.removeImage(result.filename);
      return result.card;
    },
    async study(id, includeFuture) {
      const state = await store.read();
      const deck = findDeck(state, id);
      const cards = orderCardsForStudy(state.cards.filter((card) => card.deckId === id), { includeFuture });
      return { deck: deckSummary(deck, state.cards), cards };
    },
    async review(id, body) {
      if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 4) throw new HttpError(400, 'Wähle eine Bewertung von 1 bis 4.');
      if (typeof body.reviewId !== 'string' || !/^[a-f\d-]{36}$/.test(body.reviewId)) throw new HttpError(400, 'Ungültige Bewertungs-ID.');
      return store.transaction((state) => {
        const card = findCard(state, id);
        const previous = state.reviews.find((review) => review.id === body.reviewId);
        if (previous) {
          if (previous.cardId !== id || previous.rating !== body.rating) throw new HttpError(409, 'Diese Bewertung wurde bereits anders gespeichert.');
          return { card, schedule: calculateNextReview(previous.scoreBefore, previous.rating, previous.reviewedAt), progress: calculateDeckProgress(state.cards.filter((c) => c.deckId === card.deckId)) };
        }
        const now = new Date().toISOString();
        const schedule = calculateNextReview(card.score, body.rating, now);
        state.reviews.push({ id: body.reviewId, cardId: id, deckId: card.deckId, rating: body.rating, scoreBefore: card.score, scoreAfter: schedule.score, reviewedAt: now, nextReviewAt: schedule.nextReviewAt });
        Object.assign(card, { score: schedule.score, lastRating: body.rating, nextReviewAt: schedule.nextReviewAt, reviewCount: card.reviewCount + 1, lastReviewedAt: now });
        return { card, schedule, progress: calculateDeckProgress(state.cards.filter((c) => c.deckId === card.deckId)) };
      });
    },
    async loadDemo() {
      return store.transaction((state) => {
        if (state.decks.length) throw new HttpError(409, 'Beispieldecks sind nur in einer leeren Sammlung verfügbar.');
        for (const example of demoDecks) {
          const { cards, ...fields } = example;
          const deck = { id: randomUUID(), ...fields, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
          state.decks.push(deck);
          for (const [front, back] of cards) state.cards.push(newCard(deck.id, { front, back }));
        }
        return { created: demoDecks.length };
      });
    },
  };
}
