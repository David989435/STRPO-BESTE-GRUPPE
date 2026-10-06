# Lernalgorithmus

## Eine nachvollziehbare Heuristik

ONKI implementiert die geforderte einfache Spaced-Repetition-Logik. Sie ist kein Nachbau von Ankis FSRS und keine empirisch kalibrierte Vorhersage der Erinnerungswahrscheinlichkeit. Der Score visualisiert die bisherigen Selbsteinschätzungen.

## `calculateNextReview(currentScore, rating)`

Eingaben: `currentScore` ist eine endliche Zahl von 0 bis 100; `rating` ist eine ganze Zahl von 1 bis 4. Ein optionaler dritter Parameter `now` erlaubt deterministische Tests; im normalen Betrieb wird die aktuelle Serverzeit verwendet.

```js
const result = calculateNextReview(40, 3);
// {
//   score: 60,
//   rating: 3,
//   intervalMs: 120960000,  // 1,4 Tage
//   nextReviewAt: "...",  // Serverzeit + Intervall
//   repeatAfterCards: null
// }
```

Mit `s` als **vorherigem** Score gilt:

| Rating | Scoreänderung | Zeitintervall | `repeatAfterCards` |
| --- | --- | --- | --- |
| 1 | −30 | 60.000 ms | 0 |
| 2 | −10 | 600.000 ms | 3 |
| 3 | +20 | 1 Tag × (1 + s/100) | `null` |
| 4 | +35 | 7 Tage × (1 + s/100) | `null` |

Der neue Score ist `max(0, min(100, s + Änderung))`. Deshalb bleibt eine falsche Antwort bei Score 0 auf 0 und eine sichere Antwort bei Score 100 auf 100. Die Grenzen haben Vorrang vor weiterer Erhöhung oder Senkung.

Bei identischem Ausgangsscore gilt immer strikt:

`Intervall(1) < Intervall(2) < Intervall(3) < Intervall(4)`.

Die Zeitintervalle für Bewertungen 3 und 4 liegen bei 1–2 beziehungsweise 7–14 Tagen. Ein Tag ist dabei ein Intervall von 24 Stunden, nicht „nächster Kalendertag um Mitternacht“.

## Zwei unterschiedliche Aufgaben: Termin und laufende Runde

**Über mehrere Sitzungen:** Der Server speichert `nextReviewAt` als echte Uhrzeit. Beim erneuten Öffnen des normalen Lernmodus werden nur fällige oder neue Karten geladen. Sie werden nach Fälligkeit aufsteigend geordnet, bei Gleichstand nach niedrigerem Score und danach nach ID. Für dieselbe Historie wandert Bewertung 4 somit weiter nach hinten als Bewertung 3. „Alle Karten üben“ schließt auch zukünftig fällige Karten ein; Bewertungen werden dabei genauso gespeichert.

**Innerhalb einer aktiven Runde:** Eine zusätzliche, vorübergehende Warteschlange sorgt dafür, dass du bei einer schwierigen Karte nicht auf die Uhr warten musst. Die aktuelle Karte wird aus der Queue genommen und abhängig von `repeatAfterCards` wieder eingefügt:

- Rating 1: ganz vorne, also sofort noch einmal.
- Rating 2: nach drei anderen Karten. Sind nur ein oder zwei andere übrig, werden zuerst diese gezeigt. Ist keine andere übrig, kommt die Karte direkt wieder.
- Rating 3 oder 4: in dieser Runde abgeschlossen. Der gespeicherte Termin bestimmt die nächste reguläre Wiederholung. Rating 4 bleibt am weitesten in der Zukunft.

Beispiel: Nach Karte A warten B, C, D und E. Bewertung 2 ergibt `B, C, D, A, E`, Bewertung 1 ergibt `A, B, C, D, E`. Bei 3 oder 4 bleibt `B, C, D, E`.

Damit ist die gewünschte Kombination aus „nach drei Karten“ und dauerhaftem Wiederholungsdatum ausdrücklich definiert. Es werden keine drei Klicks in Minuten umgerechnet. Die aktive Queue ist flüchtig; nach einem Neuladen gelten wieder die gespeicherten Termine. Eine schwierige Karte kann dann beispielsweise noch für den Rest ihrer Minute in der Zukunft liegen. „Alle Karten üben“ bleibt verfügbar.

Die Runde endet, wenn alle enthaltenen Karten zuletzt mit 3 oder 4 bewertet wurden. Wer bei 1 bleibt, sieht dieselbe Karte sofort wieder; der Lernmodus kann jederzeit über Deck oder Übersicht verlassen werden. Alle bereits bestätigten Bewertungen bleiben gespeichert.

## `calculateDeckProgress(cards)`

```text
Fortschritt = runden(Summe aller Kartenscores / Anzahl aller Karten)
```

Ein leeres Deck ergibt 0. Neue Karten haben Score 0 und gehören zum Nenner.

Beispiel: Scores 0, 20, 60 und 100 ergeben `(0 + 20 + 60 + 100) / 4 = 45 %`.

Neue Karten können den Durchschnitt senken. Das ist gewollt: Ein größeres Deck enthält mehr noch nicht gefestigtes Wissen. Das Löschen einer Karte kann den Durchschnitt ebenfalls verändern. Eine erledigte Runde und 100 % Deckfortschritt sind verschiedene Größen.

## Erweiterung durch Person 2

Die Rückgabefelder beibehalten und nur die Berechnung ändern. Zum Beispiel könnten später vergangene Intervalle oder die Zahl aufeinanderfolgender richtiger Antworten einbezogen werden. Zusätzliche Historieneingaben erfordern eine abgestimmte Erweiterung des Funktionsvertrags und des Datenmodells. Die Tests prüfen insbesondere strikte Intervallreihenfolge, Scoregrenzen, Deckmittelwert und Queue-Reihenfolge.
