/**
 * PERSON 3 – Darstellung einer Sitzung, mit Queue-Funktion von PERSON 2.
 * Nur die vorübergehende Ansicht lebt im Arbeitsspeicher des Browsers.
 * Jede Bewertung wird VOR dem Kartenwechsel vom Backend bestätigt.
 */
import { api } from '../api.js';
import { RATINGS, reinsertCard } from '../../engine/spacedRepetition.js';
import { escapeHtml as e, icon, renderImages } from './ui.js';

export function renderStudyMode(container, { deck, cards }, all = false) {
  let queue = [...cards];
  let revealed = false;
  let busy = false;
  let answers = 0;
  let completed = 0;
  let progress = deck.progress;
  let pendingReview = null;
  let lastMessage = '';
  let errorMessage = '';
  let disposed = false;
  const total = cards.length;

  function render() {
    if (disposed) return;
    const card = queue[0];
    container.innerHTML = `<div class="study-top"><a class="back-link" href="#/deck/${deck.id}">${icon('back')}Zum Kartendeck</a><span class="study-mode-label">${icon('spark')}${all ? 'Freies Üben' : 'Fällige Karten'}</span><a class="text-link" href="#/">Übersicht${icon('close')}</a></div><div class="study-title"><span class="eyebrow">${e(deck.subject)}</span><h1>${e(deck.name)}</h1></div>
      ${card ? `<div class="session-progress"><div><span>${completed} von ${total} Karten für diese Runde gefestigt</span><strong>${answers} ${answers === 1 ? 'Antwort' : 'Antworten'}</strong></div><progress max="${total || 1}" value="${completed}" aria-label="Fortschritt dieser Lernsitzung"></progress></div>
      <section class="flashcard ${revealed ? 'revealed' : ''}" aria-label="Aktuelle Lernkarte"><div class="flashcard-label"><span>${icon(revealed ? 'check' : 'book')}${revealed ? 'ANTWORT' : 'FRAGE'}</span><span>${card.reviewCount ? `${card.score} % Sicherheit` : 'Neue Karte'}</span></div>${revealed ? `<p class="question-context">${e(card.front)}</p>` : ''}<div class="flashcard-text ${revealed ? 'answer-text' : ''}">${e(revealed ? card.back : card.front)}</div>${renderImages(card.images, revealed ? 'back' : 'front')}<div class="flashcard-bottom">${revealed ? 'Wie sicher warst du bei deiner Antwort?' : 'Nimm dir einen Moment. Was fällt dir dazu ein?'}</div></section>
      <p class="study-error" role="alert" ${errorMessage ? '' : 'hidden'}>${e(errorMessage)}</p>
      ${revealed ? `<div class="rating-area"><div class="rating-heading"><strong>Deine Einschätzung</strong><span>Mit den Tasten 1–4 bewerten</span></div><div class="rating-buttons">${RATINGS.map((rating) => `<button class="rating rating-${rating.value}" data-rating="${rating.value}" ${busy || (pendingReview && pendingReview.rating !== rating.value) ? 'disabled' : ''}><span class="rating-key">${rating.value}</span><strong>${rating.label}</strong><span>${busy && pendingReview?.rating === rating.value ? 'Wird gespeichert …' : rating.short}</span></button>`).join('')}</div></div>` : `<div class="reveal-area"><button class="button primary reveal-button" id="reveal">${icon('turn')}Antwort anzeigen</button><span>oder <kbd>Leertaste</kbd> drücken</span></div>`}
      <p class="session-note" role="status">${e(lastMessage || 'Deine Einschätzung bestimmt, wann du diese Karte wieder siehst.')}</p>` : `<section class="study-complete"><span class="complete-icon">${icon('check')}</span><span class="eyebrow">${total ? 'GUT GEMACHT' : 'ALLES IM RHYTHMUS'}</span><h2>${total ? 'Für diese Runde geschafft.' : 'Gerade ist keine Karte fällig.'}</h2><p>${total ? `Du hast ${total} ${total === 1 ? 'Karte' : 'Karten'} mit ${answers} ${answers === 1 ? 'Bewertung' : 'Bewertungen'} wiederholt.<br>Deine Lernstände und nächsten Termine sind gespeichert.` : 'Deine Karten warten bis zur nächsten Wiederholung.<br>Wenn du magst, kannst du trotzdem weiterüben.'}</p><div class="complete-progress"><strong>${progress} %</strong><span>Lernfortschritt im Deck</span><progress value="${progress}" max="100" aria-label="Lernfortschritt im Deck"></progress></div><div class="empty-actions"><a class="button primary" href="#/deck/${deck.id}">Zum Kartendeck${icon('arrow')}</a>${!total && deck.cardCount ? `<a class="button secondary" href="#/study/${deck.id}?all=1">Alle Karten üben</a>` : '<a class="button secondary" href="#/">Zur Übersicht</a>'}</div></section>`}`;
    container.querySelector('#reveal')?.addEventListener('click', () => { revealed = true; render(); container.querySelector('[data-rating]')?.focus({ preventScroll: true }); });
    container.querySelectorAll('[data-rating]').forEach((button) => { button.onclick = () => rate(Number(button.dataset.rating)); });
  }

  async function rate(rating) {
    if (!revealed || busy || !queue.length || (pendingReview && pendingReview.rating !== rating)) return;
    const card = queue[0];
    pendingReview ??= { rating, reviewId: crypto.randomUUID() };
    busy = true;
    errorMessage = '';
    render();
    try {
      const result = await api.review(card.id, pendingReview);
      queue = reinsertCard(queue.slice(1), result.card, result.schedule.repeatAfterCards);
      if (result.schedule.repeatAfterCards === null) completed++;
      progress = result.progress;
      answers++;
      revealed = false;
      pendingReview = null;
      const when = new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(result.schedule.nextReviewAt));
      lastMessage = rating === 1 ? 'Gespeichert. Probiere diese Karte gleich noch einmal.' : rating === 2 ? 'Gespeichert. Diese Karte kommt nach bis zu drei anderen Karten wieder.' : `Gespeichert. Nächste Wiederholung dieser Karte: ${when}.`;
    } catch (error) {
      // Bei einem Verbindungsabbruch dieselbe ID erneut senden: kein Doppelzählen.
      errorMessage = `${error.message} Klicke dieselbe Bewertung erneut, um es sicher zu wiederholen.`;
    } finally { busy = false; render(); }
  }

  const keydown = (event) => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.code === 'Space' && queue.length && !revealed) { event.preventDefault(); revealed = true; render(); }
    if (/^[1-4]$/.test(event.key) && revealed) { event.preventDefault(); rate(Number(event.key)); }
  };
  document.addEventListener('keydown', keydown);
  render();
  return () => { disposed = true; document.removeEventListener('keydown', keydown); };
}
