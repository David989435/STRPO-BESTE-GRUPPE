# REST-Schnittstelle

Basis: `http://127.0.0.1:3000/api`. Anfragen und Antworten verwenden JSON. POST und PATCH benötigen `Content-Type: application/json`. Fehlermeldungen haben die Form `{ "error": "Verständliche Meldung" }`.

| Methode | Pfad | Zweck / Body |
| --- | --- | --- |
| GET | `/health` | Status der Anwendung und eventuelle CSV-Warnung |
| GET | `/decks` | `{ decks, warning }`; pro Deck Anzahl, Fälligkeiten und Fortschritt |
| POST | `/decks` | Deck anlegen: `{ name, subject, description }` |
| GET | `/decks/:id` | `{ deck, cards }` |
| PATCH | `/decks/:id` | Alle drei editierbaren Deckfelder übergeben |
| DELETE | `/decks/:id` | Deck, Karten, Bilder, Bewertungen löschen |
| POST | `/decks/:id/cards` | Karte anlegen: `{ front, back }` |
| PATCH | `/cards/:id` | Beide Textfelder übergeben: `{ front, back }` |
| DELETE | `/cards/:id` | Karte, Bilder und Bewertungen löschen |
| POST | `/cards/:id/images` | `{ name, side, data }`; `data` = reines Base64 ohne Data-URL-Präfix |
| DELETE | `/cards/:id/images/:imageId` | Einzelnes Bild entfernen |
| GET | `/decks/:id/study` | Fällige Karten in Lernreihenfolge |
| GET | `/decks/:id/study?all=1` | Alle Karten einschließlich zukünftiger Fälligkeiten |
| POST | `/cards/:id/review` | `{ rating, reviewId }` |
| GET | `/export/decks.csv` | CSV-Download |
| GET | `/export/cards.csv` | CSV-Download mit Lernstand und Bildreferenzen |
| GET | `/export/reviews.csv` | CSV-Download der Historie |
| POST | `/demo` | Body `{}`; lädt drei Beispieldecks nur in eine leere Sammlung |

Die Bilder werden außerhalb des API-Präfixes unter `/uploads/:filename` ausgeliefert. Zulässig sind ausschließlich vom Backend vergebene UUID-Dateinamen. `side` ist `front` oder `back`. Beim erfolgreichen Upload wird die aktualisierte Karte zurückgegeben. Die Originaldateinamen sind ausschließlich Metadaten und werden nie als Dateisystempfad verwendet.

## Beispiel: Deck und Karte

```json
{
  "name": "Datenbanken verstehen",
  "subject": "Datenmanagement",
  "description": "SQL und relationale Modelle"
}
```

```json
{
  "front": "Wozu dient ein Primärschlüssel?",
  "back": "Er identifiziert jeden Datensatz eindeutig."
}
```

## Beispiel: Bewertung

```js
const result = await fetch(`/api/cards/${cardId}/review`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rating: 3, reviewId: crypto.randomUUID() })
}).then(response => response.json());
```

Antwort: `{ card, schedule, progress }`. `card` enthält den gespeicherten Zustand; `schedule` enthält das Ergebnis der Engine; `progress` ist der aktualisierte Deckfortschritt. Bei einem Retry dieselbe `reviewId` und dieselbe Bewertung verwenden. Eine bereits verwendete ID mit anderem Inhalt führt zu HTTP 409.

## Grenzen und Fehler

Name: 100 Zeichen; Fach: 80; Beschreibung: 1.000; je Kartenseite: 10.000. Name, Fach, Vorder- und Rückseite dürfen nicht leer sein. Bilder: acht je Karte und fünf MiB je Datei. Die gesamte JSON-Anfrage ist auf sieben MiB begrenzt, damit ein Base64-kodiertes Bild hineinpassen kann. PNG/JPEG/GIF/WebP werden anhand ihrer Dateisignatur erkannt; diese Prüfung ist kein vollständiger Bilddecoder und keine Virenprüfung. Der Browser muss das Bild zusätzlich darstellen können.

HTTP 400: ungültige Eingabe. 403: unzulässiger fremder Ursprung. 404: Ressource fehlt. 409: Konflikt. 413: Datei/Anfrage zu groß. 415: falscher Content-Type. 500: unerwarteter Server- oder Dateifehler. Nach einem Fehler bleiben Editorinhalte erhalten; bei teilweise erfolgreichen Bildoperationen zeigt die Oberfläche den bereits gespeicherten Zustand und erlaubt Fortsetzen.

Der Standardbetrieb ist ein lokaler Lernraum. Es gibt keine Benutzer-ID und kein Authentifizierungstoken. Falls später mehrere Personen getrennte Daten auf demselben Server brauchen, muss dieser Vertrag um authentifizierte Benutzerzuordnung erweitert werden.
