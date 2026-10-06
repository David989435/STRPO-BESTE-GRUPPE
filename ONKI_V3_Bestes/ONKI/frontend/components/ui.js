/** PERSON 3 – Kleine wiederverwendbare UI-Helfer, ohne Framework. */
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  layers: '<rect x="5" y="7" width="16" height="14" rx="3"/><path d="M17 3H6a3 3 0 0 0-3 3v10"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  back: '<path d="M19 12H5m5-5-5 5 5 5"/>',
  play: '<path d="m9 5 11 7-11 7V5Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chart: '<path d="M4 19V5m0 14h16M8 14l4-4 4 2 5-6"/>',
  book: '<path d="M12 6v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2V4Z"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
  math: '<path d="M5 6h5M7.5 3.5v5M15 5h5M5 16l5 5m0-5-5 5M15 16h5m-5 4h5"/>',
  edit: '<path d="m15 4 5 5M4 20l5-1L20 8a3.5 3.5 0 0 0-5-5L4 14l-1 7Z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  turn: '<path d="M20 7v6H8m0 0 4-4m-4 4 4 4M4 5v14"/>',
  alert: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3v.1"/>',
};
export const icon = (name, className = '') => `<svg class="icon ${className}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.book}</svg>`;
export function subjectLook(subject) {
  const s = subject.toLowerCase();
  if (/daten|sql/.test(s)) return { theme: 'purple', icon: 'database' };
  if (/mathe|logik/.test(s)) return { theme: 'blue', icon: 'math' };
  if (/programm|java|code/.test(s)) return { theme: 'orange', icon: 'code' };
  return { theme: 'green', icon: 'book' };
}
export const imageUrl = (image) => `/uploads/${encodeURIComponent(image.filename)}`;
export const pluralCards = (count) => `${count} ${count === 1 ? 'Karte' : 'Karten'}`;
export function dueLabel(card) {
  if (!card.nextReviewAt) return 'Neu';
  if (new Date(card.nextReviewAt) <= new Date()) return 'Jetzt fällig';
  return new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(card.nextReviewAt));
}
let toastTimer;
export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 4500);
}
export function openDialog(html, { wide = false, onClose = () => {} } = {}) {
  const returnFocus = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = `modal ${wide ? 'modal-wide' : ''}`;
  dialog.innerHTML = html;
  const title = dialog.querySelector('h2');
  if (title) { title.id = `dialog-${crypto.randomUUID()}`; dialog.setAttribute('aria-labelledby', title.id); }
  document.body.append(dialog);
  dialog.addEventListener('close', () => { onClose(); dialog.remove(); returnFocus?.focus(); }, { once: true });
  dialog.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => dialog.close()));
  dialog.showModal();
  return dialog;
}
export function confirmDelete(title, text, action, onSuccess) {
  const dialog = openDialog(`<div class="modal-header"><h2>${escapeHtml(title)}</h2><button class="icon-button" type="button" data-close aria-label="Schließen">${icon('close')}</button></div><p class="muted">${escapeHtml(text)}</p><p class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="button secondary" data-close autofocus>Abbrechen</button><button type="button" class="button danger" id="confirm-delete">Endgültig löschen</button></div>`);
  dialog.querySelector('#confirm-delete').onclick = async (event) => {
    event.currentTarget.disabled = true;
    try { await action(); dialog.close(); toast('Gelöscht.'); onSuccess(); }
    catch (error) { const el = dialog.querySelector('.form-error'); el.textContent = error.message; el.hidden = false; dialog.querySelector('#confirm-delete').disabled = false; }
  };
}
export function renderImages(images, side) {
  const matching = images.filter((image) => image.side === side);
  return matching.length ? `<div class="study-images">${matching.map((image) => `<img src="${imageUrl(image)}" alt="${escapeHtml(image.originalName)}" loading="lazy">`).join('')}</div>` : '';
}
