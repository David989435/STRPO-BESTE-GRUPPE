# Architektur und Zusammenarbeit

## Drei klar getrennte Verantwortungsbereiche

Das Frontend ruft REST-Endpunkte auf. `server.js` übernimmt HTTP und delegiert an `service.js`. Der Service validiert Nutzereingaben, fragt reine Engine-Funktionen ab und übergibt Änderungen an `persistence.js`. Nur die Persistenzschicht schreibt auf die Festplatte. Der Browser kann keine Pfade festlegen und berechnet keine verbindlichen Scores.

| Modul | Darf verwenden | Darf nicht enthalten |
| --- | --- | --- |
| `frontend/` | DOM, Fetch, flüchtigen Ansichtsstatus | Dateizugriff, dauerhafte Browserspeicherung |
| `backend/server.js` | HTTP, Service, statische Dateien | Formeln für Lernintervalle |
| `backend/service.js` | Validierung, Engine, Persistenz | DOM, UI-Layout |
| `backend/persistence.js` | Node-Dateisystem, JSON, CSV | Lernformeln, HTML |
| `engine/spacedRepetition.js` | Reine JavaScript-Funktionen | HTTP, DOM, Dateisystem |

`reinsertCard` ist eine reine Queue-Funktion der Engine, die das Frontend für die laufende Runde wiederverwendet. Alle verbindlichen Scores und Termine werden trotzdem ausschließlich im Backend berechnet und gespeichert.

## Datenmodell

`store.json` enthält `schemaVersion: 1`, `decks`, `cards` und `reviews`.

| Objekt | Wichtige Felder |
| --- | --- |
| Deck | `id`, `name`, `subject`, `description`, `createdAt`, `updatedAt` |
| Karte | `id`, `deckId`, `front`, `back`, `images`, `score`, `lastRating`, `nextReviewAt`, `reviewCount`, `lastReviewedAt`, `createdAt` |
| Bild | `id`, `filename`, `originalName`, `mime`, `size`, `side` (`front` oder `back`) |
| Bewertung | `id`, `cardId`, `deckId`, `rating`, `scoreBefore`, `scoreAfter`, `reviewedAt`, `nextReviewAt` |

IDs sind UUIDs. Zeitpunkte werden in UTC als ISO-8601-Zeichenfolge gespeichert und im Browser in dessen lokaler Zeitzone angezeigt. `nextReviewAt: null` bedeutet „noch nie bewertet und sofort lernbar“. `lastRating: null` bedeutet „noch nicht bewertet“.

Eine Karte gehört genau einem Deck. Eine Karte hat null bis acht optionale Bilder; FR-03 fordert die Fähigkeit, mindestens ein Bild hinzuzufügen, keine Bildpflicht für jede Karte. Beim Löschen einer Karte oder eines Decks werden zugehörige Bewertungen und Bilder entfernt.

## Ablauf einer Bewertung

1. Person 3 zeigt die vier Optionen erst nach der Antwortaufdeckung an.
2. Der Browser schickt `rating` und eine eindeutige `reviewId` an den Server.
3. Person 1 prüft Karte, Bewertung und eine eventuell bereits gespeicherte ID.
4. Person 2 berechnet Score, Fälligkeit und Wiederholungsposition.
5. Person 1 speichert Karte und Historieneintrag gemeinsam in einer JSON-Transaktion.
6. Erst nach einer erfolgreichen Serverantwort wechselt die Oberfläche zur nächsten Karte.

Bei einer unklaren Netzwerkantwort kann dieselbe Bewertung mit derselben ID wiederholt werden. Sie erhöht Score und Zähler nur einmal. Während ein Ergebnis unklar ist, bietet die Oberfläche nur die Wiederholung derselben Entscheidung an.

## Schreibkonsistenz

Der Speicher kopiert den aktuellen Zustand, führt die Änderung auf der Kopie aus und schreibt eine temporäre Datei im selben Ordner. Nach `fsync` wird sie auf `store.json` umbenannt. Erst nach erfolgreichem Commit wird der Zustand im Arbeitsspeicher ersetzt. Gleichzeitig eintreffende Änderungen laufen nacheinander in einer Promise-Warteschlange.

Ein Absturz vor dem JSON-Commit kann eine nicht referenzierte Bilddatei oder temporäre Datei hinterlassen, aber keine Karte, deren neu hochgeladenes Bild noch gar nicht geschrieben wurde. Beim Löschen wird zuerst die Referenz entfernt und danach die Bilddatei bereinigt. JSON ist die maßgebliche Transaktion; die drei CSV-Dateien werden daraus abgeleitet. Sie sind keine unabhängigen, gemeinsam atomaren Datenbanken. Nach einem normalen Neustart werden sie neu erzeugt.

Diese Strategie schützt vor teilgeschriebenem JSON und verlorenen gleichzeitigen Updates innerhalb eines Serverprozesses. Sie ersetzt keine Backups und keinen Datenbank-Cluster.

## So arbeitet ihr unabhängig

1. Person 1 hält den Vertrag in `API.md` stabil und startet den Server.
2. Person 2 verändert die reinen Funktionen und führt `npm test` aus. Rückgabefelder und Bewertungswerte bleiben kompatibel.
3. Person 3 arbeitet in `frontend/`, greift nur über `api.js` auf Daten zu und lädt den Browser nach Änderungen neu.

Jede Person kann das Projekt auf dem eigenen Rechner starten. `backend/data` und `backend/uploads` sind in `.gitignore`, damit persönliche Lernstände nicht versehentlich durch Git-Merges ersetzt werden. `demo.js` ist die gemeinsame reproduzierbare Ausgangsbasis.

Änderungen am API-Vertrag vorher gemeinsam abstimmen. Es gibt bewusst keinen Framework-, ORM- oder Build-Tool-Unterbau, der zusätzliche Einarbeitung erfordert.
