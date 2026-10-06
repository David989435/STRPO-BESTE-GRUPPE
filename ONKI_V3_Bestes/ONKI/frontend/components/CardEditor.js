/** PERSON 3 – Text und Bilder; Dateizugriff erfolgt nur über die Backend-API. */
import { api } from '../api.js';
import { escapeHtml as e, icon, imageUrl, openDialog, toast } from './ui.js';

function fileBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Das Bild konnte nicht gelesen werden.'));
    reader.readAsDataURL(file);
  });
}

export function openCardEditor(deckId, existing, onSave) {
  let savedCard = existing ? structuredClone(existing) : null;
  let pending = [];
  const removed = new Set();
  let saving = false;
  let committed = false;
  const dialog = openDialog(`<form id="card-form"><div class="modal-header"><div><span class="eyebrow">FRAGE TRIFFT ANTWORT</span><h2>${existing ? 'Karte bearbeiten' : 'Eine neue Karte'}</h2></div><button type="button" class="icon-button" data-close aria-label="Schließen">${icon('close')}</button></div><fieldset class="editor-fields"><div class="editor-columns">${['front', 'back'].map((side) => `<section class="editor-side"><label for="card-${side}"><span class="side-number">${side === 'front' ? '01' : '02'}</span>${side === 'front' ? 'Vorderseite · Frage' : 'Rückseite · Antwort'}</label><textarea id="card-${side}" name="${side}" rows="7" required maxlength="10000" placeholder="${side === 'front' ? 'Was möchtest du dir merken?' : 'Hier steht die Antwort.'}" ${side === 'front' ? 'autofocus' : ''}>${e(existing?.[side])}</textarea><div class="editor-images" data-images="${side}"></div><label class="upload-control" for="file-${side}">${icon('image')}Bild hinzufügen<input type="file" id="file-${side}" accept="image/png,image/jpeg,image/webp,image/gif" multiple data-side="${side}"></label></section>`).join('')}</div><p class="input-hint">PNG, JPG, WebP oder GIF · bis zu 5 MB je Bild · maximal 8 Bilder pro Karte</p></fieldset><p class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="button secondary" data-close>Abbrechen</button><button class="button primary" type="submit">${icon('check')}Karte speichern</button></div></form>`, { wide: true, onClose: () => { pending.forEach((item) => URL.revokeObjectURL(item.url)); if (committed) onSave(); } });
  const errorEl = dialog.querySelector('.form-error');
  const showError = (message) => { errorEl.textContent = message; errorEl.hidden = false; };
  const refreshImages = () => {
    for (const side of ['front', 'back']) {
      const saved = (savedCard?.images || []).filter((image) => image.side === side && !removed.has(image.id));
      const target = dialog.querySelector(`[data-images="${side}"]`);
      target.innerHTML = [...saved.map((image) => `<div class="editor-image"><img src="${imageUrl(image)}" alt="${e(image.originalName)}"><button type="button" class="image-remove" data-saved="${image.id}" aria-label="${e(image.originalName)} entfernen">${icon('close')}</button></div>`), ...pending.filter((item) => item.side === side).map((item) => `<div class="editor-image"><img src="${item.url}" alt="${e(item.file.name)}"><button type="button" class="image-remove" data-pending="${item.id}" aria-label="${e(item.file.name)} entfernen">${icon('close')}</button></div>`)].join('');
    }
    dialog.querySelectorAll('[data-saved]').forEach((button) => { button.onclick = () => { removed.add(button.dataset.saved); refreshImages(); }; });
    dialog.querySelectorAll('[data-pending]').forEach((button) => { button.onclick = () => { const item = pending.find((item) => item.id === button.dataset.pending); URL.revokeObjectURL(item.url); pending = pending.filter((item) => item !== item); refreshImages(); }; });
  };
  dialog.querySelectorAll('input[type=file]').forEach((input) => {
    input.onchange = () => {
      errorEl.hidden = true;
      for (const file of input.files) {
        if (file.size > 5 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { showError('Bitte wähle PNG, JPG, WebP oder GIF mit höchstens 5 MB.'); continue; }
        if ((savedCard?.images.length || 0) - removed.size + pending.length >= 8) { showError('Maximal 8 Bilder pro Karte.'); break; }
        pending.push({ id: crypto.randomUUID(), file, side: input.dataset.side, url: URL.createObjectURL(file) });
      }
      input.value = '';
      refreshImages();
    };
  });
  dialog.addEventListener('cancel', (event) => { if (saving) event.preventDefault(); });
  dialog.querySelector('form').onsubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    saving = true;
    errorEl.hidden = true;
    dialog.querySelector('fieldset').disabled = true;
    dialog.querySelectorAll('.modal-actions button,[data-close]').forEach((button) => { button.disabled = true; });
    const submit = dialog.querySelector('[type=submit]');
    submit.textContent = 'Wird gespeichert …';
    try {
      savedCard = savedCard ? await api.updateCard(savedCard.id, fields) : await api.createCard(deckId, fields);
      committed = true;
      for (const id of [...removed]) { savedCard = await api.deleteImage(savedCard.id, id); removed.delete(id); }
      for (const item of [...pending]) {
        savedCard = await api.uploadImage(savedCard.id, { name: item.file.name, side: item.side, data: await fileBase64(item.file) });
        pending = pending.filter((candidate) => candidate !== item);
        URL.revokeObjectURL(item.url);
      }
      dialog.close(); toast('Karte gespeichert.');
    } catch (error) {
      showError(`${committed ? 'Der Text ist gespeichert. ' : ''}${error.message} Du kannst das Speichern erneut versuchen.`);
      refreshImages();
    } finally {
      saving = false;
      dialog.querySelector('fieldset').disabled = false;
      dialog.querySelectorAll('.modal-actions button,[data-close]').forEach((button) => { button.disabled = false; });
      submit.innerHTML = `${icon('check')}Karte speichern`;
    }
  };
  refreshImages();
}
