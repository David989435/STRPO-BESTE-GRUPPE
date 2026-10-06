/** PERSON 3 – Der einzige Netzwerkzugang des Frontends. Keine Browserspeicher. */
async function request(url, options = {}) {
  let response;
  try { response = await fetch(`/api${url}`, { cache: 'no-store', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } }); }
  catch { throw new Error('Der Server ist nicht erreichbar. Prüfe, ob ONKI läuft, und versuche es erneut.'); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Die Anfrage konnte nicht abgeschlossen werden.');
  return result;
}
const body = (method, data) => ({ method, body: JSON.stringify(data) });
export const api = {
  decks: () => request('/decks'),
  deck: (id) => request(`/decks/${id}`),
  createDeck: (data) => request('/decks', body('POST', data)),
  updateDeck: (id, data) => request(`/decks/${id}`, body('PATCH', data)),
  deleteDeck: (id) => request(`/decks/${id}`, { method: 'DELETE' }),
  createCard: (deckId, data) => request(`/decks/${deckId}/cards`, body('POST', data)),
  updateCard: (id, data) => request(`/cards/${id}`, body('PATCH', data)),
  deleteCard: (id) => request(`/cards/${id}`, { method: 'DELETE' }),
  uploadImage: (id, data) => request(`/cards/${id}/images`, body('POST', data)),
  deleteImage: (cardId, imageId) => request(`/cards/${cardId}/images/${imageId}`, { method: 'DELETE' }),
  study: (id, all = false) => request(`/decks/${id}/study${all ? '?all=1' : ''}`),
  review: (id, data) => request(`/cards/${id}/review`, body('POST', data)),
  demo: () => request('/demo', body('POST', {})),
};
