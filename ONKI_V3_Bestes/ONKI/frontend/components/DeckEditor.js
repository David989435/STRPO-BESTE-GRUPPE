/** PERSON 3 – Deck erstellen oder bearbeiten. */
import { api } from '../api.js';
import { escapeHtml as e, icon, openDialog, toast } from './ui.js';
export function openDeckEditor(deck, onSave) {
  const dialog = openDialog(`<form id="deck-form"><div class="modal-header"><div><span class="eyebrow">DEINE SAMMLUNG</span><h2>${deck ? 'Deck bearbeiten' : 'Ein neues Kartendeck'}</h2></div><button type="button" class="icon-button" data-close aria-label="Schließen">${icon('close')}</button></div><label>Name<input name="name" required maxlength="100" placeholder="z. B. Datenbanken verstehen" value="${e(deck?.name)}" autofocus></label><label>Fach<input name="subject" required maxlength="80" placeholder="z. B. Datenmanagement" value="${e(deck?.subject)}"></label><label>Beschreibung <span class="optional">optional</span><textarea name="description" maxlength="1000" rows="3" placeholder="Was möchtest du mit diesem Deck lernen?">${e(deck?.description)}</textarea></label><p class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="button secondary" data-close>Abbrechen</button><button type="submit" class="button primary">${deck ? 'Änderungen speichern' : 'Deck erstellen'}${icon('arrow')}</button></div></form>`);
  dialog.querySelector('form').onsubmit = async (event) => {
    event.preventDefault();
    const button = dialog.querySelector('[type=submit]');
    button.disabled = true;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const saved = deck ? await api.updateDeck(deck.id, data) : await api.createDeck(data);
      dialog.close(); toast(deck ? 'Deck aktualisiert.' : 'Dein neues Deck ist bereit.'); onSave(saved);
    } catch (error) { const el = dialog.querySelector('.form-error'); el.textContent = error.message; el.hidden = false; button.disabled = false; }
  };
}
