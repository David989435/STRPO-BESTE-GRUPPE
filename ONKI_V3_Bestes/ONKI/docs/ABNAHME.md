# Anforderungen und Abnahme

Grundlage: `HUE1(5).pdf`, `Taskt1(5).pdf`, `ONKI_ProjectDescription_Gruppe1(3).pdf` und die konkreten Implementierungsvorgaben im Auftrag. Die ersten beiden PDFs enthalten dieselbe Aufgabenbeschreibung. Die Anforderungsnummern für NFR unterscheiden sich zwischen Projekt-PDF und Auftrag; die folgende Übersicht berücksichtigt beide.

## Funktionale Anforderungen

| ID | Umsetzung | Nachweis |
| --- | --- | --- |
| FR-01 | Erstellen, Ändern, Löschen von Decks mit Name, Fach, Beschreibung | REST-CRUD automatisiert geprüft; UI in Dashboard und DeckEditor |
| FR-02 | Beide Textseiten erstellen und ändern | REST-CRUD automatisiert geprüft; CardEditor |
| FR-03 | Bilder dauerhaft mit Karte und Seite verknüpfen | Upload, bytegleiche Auslieferung, Zuordnung nach Neustart und Löschung automatisiert geprüft |
| FR-04 | Genau vier vorgegebene Bewertungsstufen | Gemeinsame RATINGS-Konstante; Service akzeptiert nur Integer 1–4 |
| FR-05 | Strikt steigende Intervalle bei gleicher Historie | Für alle ganzzahligen Ausgangsscores 0–100 und alle vier Ratings automatisiert geprüft |
| FR-06 | Prozentualer Fortschritt aus Kartenbewertungen | Mittelwert, leere Decks und Scoregrenzen automatisiert geprüft |

## Nicht-funktionale Anforderungen

| Anforderung | Umsetzung / Stand |
| --- | --- |
| Intuitive, übersichtliche UI | Responsives Dashboard, klar beschriftete Aktionen, getrennte Frage/Antwort, native Dialoge, Tastaturkürzel |
| Höchstens 3 Klicks | Übersicht → Lernmodus: 1; Übersicht → Karteneditor: Deck öffnen + Neue Karte = 2; Lernmodus → Editor: Zum Kartendeck + Bearbeiten = 2; Deck → Übersicht: 1; Lernmodus → Übersicht: 1 |
| Erhalt nach Browser-/Server-Neustart | Daten kommen bei jedem Laden vom Dateispeicher; Speicherung und erneutes Laden nach Server-Neustart technisch geprüft |
| Kein Browserspeicher | Keine Nutzung von localStorage, sessionStorage, IndexedDB, Cookies oder Service Workern im Anwendungscode; `Cache-Control: no-store` |
| Modularität | Frontend, REST/Service, Persistenz und Engine getrennt; kommentierte Zuständigkeiten und dokumentierter API-Vertrag |
| Leicht lokal startbar | Node.js-Bordmittel; `npm start`, kein Paketdownload und kein Build nötig |
| 80 % erfolgreiche Erstnutzer (Projekt-PDF) | **Noch offen:** benötigt reale Testpersonen; nicht aus Quellcode oder automatisierten Tests ableitbar |

## Ausgeführte technische Prüfungen

Prüfumgebung: Node.js 24 unter Linux. Befehl: `npm test`.

Neun automatisierte Tests:

1. Deck/Karten-CRUD, Bildbytes, Bewertung, Idempotenz, CSV, identische Daten nach Server-Neustart und Laden der App-Dateien bei cross-site Navigation bei gleichzeitiger Sperre des Cross-Site-API-Aufrufs.
2. Zwölf parallele Schreibvorgänge ohne verlorene Decks; zweiter Server auf demselben Datenordner blockiert; interne Datenpfade nicht über HTTP abrufbar; fremder Origin zurückgewiesen.
3. Beschädigtes JSON wird nicht durch einen leeren Bestand ersetzt.
4. CSV-Quoting für Anführungszeichen, Zeilenumbrüche und Formelanfänge.
5. Strikt steigende Wiederholungsintervalle und Scoregrenzen.
6. Deckfortschritt für leere, neue und unterschiedlich bewertete Karten.
7. Ungültige Ratings und Scores werden zurückgewiesen.
8. Reihenfolge innerhalb einer Sitzung einschließlich kleinem/leerem Restdeck.
9. Auswahl fälliger Karten und Sortierung zukünftiger Karten im freien Üben.

**Ergebnis: 9 bestanden, 0 fehlgeschlagen.** Zusätzlich wurden alle JavaScript-Dateien auf Syntax und die Frontend-Module auf erfolgreiche Auslieferung durch den Server geprüft.

## Browserprüfung der neuen Gestaltung — 24.09.2026

Die neue Oberfläche wurde mit Chromium 153 unter Linux interaktiv geprüft:

- Decks erstellen, bearbeiten und löschen; Karten erstellen, bearbeiten und löschen.
- Bilder auf beiden Seiten hochladen, anzeigen und entfernen.
- Antwort aufdecken, alle vier Bewertungen, Wiederholung in derselben Runde und freies Üben.
- Tastatursteuerung mit Leertaste sowie Bewertungstasten.
- Lernstand und Karten nach Neuladen erhalten; kein localStorage, sessionStorage, IndexedDB oder Cookie-Speicher.
- Benutzereingaben als Text statt als ausführbares HTML behandeln.
- Desktop-Darstellung sowie mobile Ansichten bei 390 und 320 Pixel Breite ohne horizontalen Überlauf.
- Lokal mitgelieferte Schriften bei abgeschalteten externen Schriftantworten geladen; keine fehlgeschlagenen lokalen Ressourcen und keine JavaScript-Fehler im Layouttest.

Screenshots von Dashboard und Lernmodus liegen diesem Ordner bei. Windows selbst wurde in dieser Umgebung nicht getestet. Die 80-%-Usability-Messung mit echten Erstnutzern bleibt offen.

Quellcodevergleich zur vorherigen ONKI-Ausgabe: **Alle JavaScript-Dateien sind bytegleich**. Damit bleiben Backend, Service, Persistenz, Algorithmus, Routing, API-Aufrufe, Event-Handler und der JavaScript-Anteil aller UI-Komponenten identisch. Geändert wurden ausschließlich Stylesheet, Schriftdateien, visuelles Logo und die Theme-Farbe im HTML-Grundgerüst; Dokumentation und Vorschaubilder wurden passend aktualisiert. Die App bleibt ohne KI.

Flat-Design-Prüfung: Neun Backend-/Algorithmustests und der vollständige Browserdurchlauf mit Chromium 153 bestehen. Desktop-, 390-px- und 320-px-Ansichten wurden geprüft; lokale Outfit-Schriften und lokale Ressourcen laden erfolgreich.

## Kurzer manueller Durchlauf für eure Abnahme

1. Starten, Übersicht öffnen und ein Deck erstellen.
2. Karte mit Frage, Antwort und je einem Bild auf beiden Seiten speichern.
3. Text und Deckbeschreibung ändern; beide Bilder prüfen.
4. Lernmodus öffnen: Vor der Aufdeckung ist nur die Frage sichtbar; danach exakt vier Bewertungsbuttons.
5. Rating 1 wählen: sofort erneut. Rating 2 bei mindestens fünf Karten wählen: drei andere Karten dazwischen. Ratings 3/4 schließen die Karte für diese Runde ab.
6. Deckfortschritt prüfen, Browser schließen und neu öffnen.
7. Server mit Strg+C stoppen, neu starten: Texte, Bilder, Score und Fälligkeit vergleichen.
8. CSV über die Deckübersicht herunterladen und öffnen.
9. Bei schmalem Fenster und 200 % Textvergrößerung auf Umbrüche und erreichbare Aktionen prüfen.
10. Karte/Bild/Deck löschen; nur mit selbst angelegten Testdaten arbeiten.

## Usability-Test aus dem Projekt-PDF

Mindestens fünf Personen ohne vorherige Einweisung führen „Kartendeck öffnen“, „Lernmodus starten“ und „zur Übersicht zurückkehren“ durch. Pro Person Erfolg ohne Hilfe notieren. Ziel: mindestens vier von fünf Testpersonen, also 80 %, erledigen diese Aufgaben selbstständig. Ergebnisse getrennt von der technischen Abnahme protokollieren; bisher liegen keine solchen Messwerte vor.
