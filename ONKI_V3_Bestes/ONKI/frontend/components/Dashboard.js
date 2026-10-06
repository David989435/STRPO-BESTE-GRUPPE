/** PERSON 3 – Startseite und Deckübersicht. Ausschließlich API-Daten. */
import { api } from '../api.js';
import { escapeHtml as e, icon, subjectLook, pluralCards, toast } from './ui.js';
import { openDeckEditor } from './DeckEditor.js';

function deckTile(deck) {
  const look = subjectLook(deck.subject);
  return `<article class="deck-tile ${look.theme}"><div class="deck-reading"><span class="subject-name">${e(deck.subject)}</span><h3><a href="#/deck/${deck.id}">${e(deck.name)}</a></h3><p class="deck-description">${e(deck.description || 'Dein Platz für neues Wissen.')}</p></div><div class="deck-status"><span class="due-badge ${deck.dueCount ? '' : 'quiet'}">${deck.dueCount ? `${deck.dueCount} fällig` : deck.cardCount ? 'Alles wiederholt' : 'Noch keine Karten'}</span><div class="deck-progress-label"><span>${pluralCards(deck.cardCount)}</span><strong>${deck.progress} %</strong></div><progress max="100" value="${deck.progress}" aria-label="Lernfortschritt ${e(deck.name)}">${deck.progress}%</progress></div><div class="deck-tile-actions"><a class="text-link" href="#/deck/${deck.id}">Deck öffnen${icon('arrow')}</a>${deck.cardCount ? `<a class="mini-study" href="#/study/${deck.id}${deck.dueCount ? '' : '?all=1'}" aria-label="${e(deck.name)} lernen">${icon('play')}</a>` : ''}</div></article>`;
}

export function renderDashboard(container, decks, { listOnly = false, refresh }) {
  const totalCards = decks.reduce((sum, deck) => sum + deck.cardCount, 0);
  const totalDue = decks.reduce((sum, deck) => sum + deck.dueCount, 0);
  const reviewed = decks.reduce((sum, deck) => sum + deck.reviewedCount, 0);
  const nextDeck = decks.find((deck) => deck.dueCount > 0);
  container.innerHTML = `<div class="page-heading"><div><span class="eyebrow">${listOnly ? 'DEIN WISSEN, GUT SORTIERT' : 'DEIN PERSÖNLICHES LERNJOURNAL'}</span><h1>${listOnly ? 'Deine Kartendecks' : 'Wissen wächst.<br><em>Mit jeder Karte.</em>'}</h1><p>${listOnly ? 'Alles, was du lernen möchtest. An einem Ort.' : totalDue ? `${pluralCards(totalDue)} warten heute auf deine nächste Wiederholung.` : 'Mach aus neuen Fragen vertrautes Wissen.'}</p></div><button class="button primary" id="new-deck">${icon('plus')}Neues Deck</button></div>
  ${!listOnly ? `<section class="overview-stats" aria-label="Lernübersicht"><div class="stat"><span class="stat-symbol purple">${icon('layers')}</span><div><span>Kartendecks</span><strong>${decks.length}<small>in deiner Sammlung</small></strong></div></div><div class="stat"><span class="stat-symbol orange">${icon('clock')}</span><div><span>Jetzt fällig</span><strong>${totalDue}<small>bereit zum Wiederholen</small></strong></div></div><div class="stat"><span class="stat-symbol green">${icon('check')}</span><div><span>Schon kennengelernt</span><strong>${reviewed}<small>von ${pluralCards(totalCards)}</small></strong></div></div></section>
  <section class="focus-banner"><div class="focus-copy"><span class="focus-tag">${icon('spark')}DEIN NÄCHSTER SCHRITT</span><h2>${nextDeck ? 'Ein bisschen heute. Viel mehr behalten.' : decks.length ? 'Platz für deinen nächsten Lernmoment.' : 'Dein Wissen beginnt mit einer Karte.'}</h2><p>${nextDeck ? `Starte mit „${e(nextDeck.name)}“. Schwierige Karten kommen früher wieder.` : decks.length ? 'Öffne ein Deck, ergänze neue Fragen oder wiederhole bereits gelernte Karten.' : 'Erstelle dein erstes Deck oder entdecke ONKI mit Beispielen aus dem Studium.'}</p>${nextDeck ? `<a class="button dark" href="#/study/${nextDeck.id}">${icon('play')}Jetzt lernen${icon('arrow')}</a>` : `<button class="button dark" id="banner-create">${icon('plus')}Deck erstellen</button>`}</div><div class="focus-art" aria-hidden="true"><span class="paper-caption">NOTIZ / 01</span><span class="paper-letter">Aa.</span><span class="paper-note">Eine gute Frage<br>ist ein guter Anfang.</span></div></section>` : ''}
  <section class="decks-section"><div class="section-heading"><div><h2>${listOnly ? 'Alle Decks' : 'Deine Kartendecks'} <span class="count-pill">${decks.length}</span></h2>${!listOnly ? '<p>Ein Thema. Ein Deck. Dein Tempo.</p>' : ''}</div>${decks.length ? `<details class="export-menu"><summary>${icon('download')}CSV exportieren</summary><div><a href="/api/export/decks.csv" download>Decks</a><a href="/api/export/cards.csv" download>Karten & Lernstände</a><a href="/api/export/reviews.csv" download>Bewertungen</a></div></details>` : ''}</div>
  ${decks.length ? `<div class="deck-grid">${decks.map(deckTile).join('')}<button class="add-deck-tile" id="add-deck-tile"><span>${icon('plus')}</span><strong>Neues Wissen sammeln</strong><span>Ein weiteres Deck erstellen</span></button></div>` : `<div class="empty-state"><span class="empty-icon">${icon('layers')}</span><h3>Noch ganz viel Platz für Wissen.</h3><p>Lege dein erstes Kartendeck an.<br>Oder probiere 15 Beispielkarten zu Datenbanken, Mathematik und Java aus.</p><div class="empty-actions"><button class="button primary" id="empty-create">${icon('plus')}Erstes Deck erstellen</button><button class="button secondary" id="load-demo">Beispieldecks laden</button></div></div>`}</section>`;
  const create = () => openDeckEditor(null, (deck) => { location.hash = `#/deck/${deck.id}`; });
  container.querySelectorAll('#new-deck,#banner-create,#add-deck-tile,#empty-create').forEach((button) => { button.onclick = create; });
  const demo = container.querySelector('#load-demo');
  if (demo) demo.onclick = async () => {
    demo.disabled = true;
    try { await api.demo(); toast('Drei Beispieldecks sind bereit. Du kannst alle Inhalte bearbeiten.'); refresh(); }
    catch (error) { toast(error.message); demo.disabled = false; }
  };
}
