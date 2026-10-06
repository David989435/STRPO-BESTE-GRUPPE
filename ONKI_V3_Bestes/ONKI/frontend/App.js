/** PERSON 3 – Navigation und Zusammensetzen der unabhängigen UI-Komponenten. */
import { api } from './api.js';
import { renderDashboard } from './components/Dashboard.js';
import { renderDeckView } from './components/DeckView.js';
import { renderStudyMode } from './components/StudyMode.js';
import { escapeHtml as e, icon, openDialog, subjectLook, toast } from './components/ui.js';

const main = document.getElementById('main');
let cleanup = () => {};
let navigation = 0;
document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
document.getElementById('today').textContent = new Intl.DateTimeFormat('de-AT', { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date());
document.querySelector('.skip-link').onclick = (event) => { event.preventDefault(); main.focus(); };

document.getElementById('algorithm-help').onclick = () => openDialog(`<div class="modal-header"><div><span class="eyebrow">WIEDERHOLEN MIT SYSTEM</span><h2>So lernt ONKI mit dir</h2></div><button class="icon-button" data-close aria-label="Schließen">${icon('close')}</button></div><p>Zeige zuerst die Antwort. Schätze dann ehrlich ein, wie sicher du warst.</p><div class="help-ratings"><p><strong>1 · Nicht gewusst</strong><span>In dieser Runde sofort erneut. Sonst in 1 Minute. Sicherheit −30 Punkte.</span></p><p><strong>2 · Unsicher</strong><span>Nach bis zu 3 weiteren Karten. Sonst in 10 Minuten. Sicherheit −10 Punkte.</span></p><p><strong>3 · Gewusst</strong><span>Für diese Runde erledigt. Wiederholung in 1–2 Tagen. Sicherheit +20 Punkte.</span></p><p><strong>4 · Sehr sicher gewusst</strong><span>Für diese Runde erledigt. Wiederholung in 7–14 Tagen. Sicherheit +35 Punkte.</span></p></div><p class="muted">Die Sicherheit bleibt zwischen 0 und 100. Der Deckfortschritt ist der Mittelwert aller Kartenscores. Neue Karten zählen mit 0. Die Reihenfolge folgt den Fälligkeiten; sichere Karten stehen entsprechend weiter hinten.</p><div class="modal-actions"><button class="button primary" data-close>Verstanden${icon('check')}</button></div>`);

async function renderRoute() {
  const version = ++navigation;
  cleanup();
  cleanup = () => {};
  const url = new URL((location.hash.slice(1) || '/'), location.origin);
  const segments = url.pathname.split('/').filter(Boolean);
  const page = segments[0] || 'home';
  main.setAttribute('aria-busy', 'true');
  try {
    const [overview, content] = await Promise.all([
      api.decks(),
      page === 'deck' && segments[1] ? api.deck(segments[1]) : page === 'study' && segments[1] ? api.study(segments[1], url.searchParams.get('all') === '1') : Promise.resolve(null),
    ]);
    if (version !== navigation) return;
    document.querySelectorAll('[data-nav]').forEach((link) => {
      const active = link.dataset.nav === (page === 'home' ? 'home' : 'decks');
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    document.getElementById('quick-decks').innerHTML = overview.decks.length ? overview.decks.map((deck) => `<a href="#/deck/${deck.id}" class="${segments[1] === deck.id ? 'selected' : ''}" title="${e(deck.name)}"><span class="subject-dot ${subjectLook(deck.subject).theme}"></span><span>${e(deck.subject)}</span></a>`).join('') : '<span class="sidebar-empty">Deine Fächer erscheinen hier.</span>';
    const crumb = page === 'home' ? 'Übersicht' : page === 'decks' ? 'Kartendecks' : page === 'study' ? 'Lernmodus' : content?.deck.name || 'Kartendecks';
    document.getElementById('breadcrumb-current').textContent = crumb;
    document.title = `${crumb} · ONKI`;
    if (page === 'deck' && content) renderDeckView(main, content, renderRoute);
    else if (page === 'study' && content) cleanup = renderStudyMode(main, content, url.searchParams.get('all') === '1');
    else renderDashboard(main, overview.decks, { listOnly: page === 'decks', refresh: renderRoute });
    if (overview.warning) toast(overview.warning);
  } catch (error) {
    if (version !== navigation) return;
    main.innerHTML = `<div class="empty-state error-state"><span class="empty-icon">${icon('alert')}</span><h1>Das hat gerade nicht geklappt.</h1><p>${e(error.message)}</p><div class="empty-actions"><button class="button primary" id="retry">Erneut versuchen</button><a class="button secondary" href="#/">Zur Übersicht</a></div></div>`;
    main.querySelector('#retry').onclick = renderRoute;
  } finally { if (version === navigation) main.removeAttribute('aria-busy'); }
}
window.addEventListener('hashchange', () => { window.scrollTo({ top: 0 }); renderRoute(); });
renderRoute();
