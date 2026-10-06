# ONKI – Karteikarten mit gezielten Wiederholungen

Eine vollständig lokal startbare Webanwendung für euer Uniprojekt. HTML/CSS und Vanilla JavaScript bilden das Frontend; ein Node.js-Server stellt die REST-API bereit. Daten werden als JSON, CSV und Bilddateien gespeichert. Keine externen Laufzeitpakete, kein Build-Schritt, keine Anmeldung.


## Neue Gestaltung: Flat Design

Diese Ausgabe verwendet die unveränderte ONKI-Version ohne KI mit einer neuen Gestaltung. Alle JavaScript-Dateien einschließlich Backend, Lernalgorithmus, API-Aufrufen, Routing und Event-Handlern sind bytegleich mit der vorherigen Ausgabe.

Das Design nutzt Outfit als lokal mitgelieferte Schrift, eine weiße Grundfläche, kräftige blaue, grüne und gelbe Abschnitte, geometrische Formen und ein responsives Deckraster. Es gibt keine Schatten, Verläufe oder Unschärfeeffekte. Bedienelemente erhalten klare Fokusmarkierungen; reduzierte Bewegung wird berücksichtigt.

Farben, Rundungen, Abstände und Schrift sind zentral in den CSS-Variablen am Anfang von frontend/styles.css definiert. Weiße kleine Beschriftungen verwenden für besseren Kontrast Blau 600 (#2563EB); das Primärblau des Systems bleibt #3B82F6. Der lokale Outfit-Schriftsatz liegt in frontend/assets/fonts, seine Lizenz unter docs/font-licenses/outfit.txt. Zum Laden der Schrift ist keine Internetverbindung nötig.

## Vorhandene Karten übernehmen

1. Den bisherigen ONKI-/On(KI)-Server mit **Strg+C** beenden.
2. Den bisherigen Projektordner als Sicherung behalten und dieses ZIP in einen **neuen Ordner** entpacken.
3. Aus dem alten Projekt die beiden vollständigen Ordner **backend/data** und **backend/uploads** in das neue ONKI-Verzeichnis kopieren. Die leeren gleichnamigen Ordner dort dürfen ersetzt werden. Daten aus zwei verschiedenen Installationen nicht mischen.
4. Im neuen Ordner **START_ONKI.cmd** starten und im Browser neu laden (**Strg+F5**).

Die Formate von JSON, CSV, Bildern und Lernständen bleiben kompatibel. Die Umgebungsvariablen dieser Ausgabe heißen ONKI_DATA_DIR und ONKI_UPLOADS_DIR; ein Standardstart benötigt keine solchen Variablen.

## In einer Minute starten

1. ZIP vollständig entpacken.
2. **Node.js ab Version 22** muss installiert sein. Mit `node --version` prüfen.
3. Ein Terminal im entpackten Ordner **ONKI** öffnen, dort:

```bash
npm start
```

4. Im Browser **http://127.0.0.1:3000** öffnen.
5. „Neues Deck“ anlegen oder „Beispieldecks laden“ wählen.

Es ist **kein `npm install`** nötig: ONKI verwendet ausschließlich Node.js-Bordmittel. Unter Windows kann alternativ `START_ONKI.cmd` doppelt angeklickt werden. Das Fenster bleibt während der Nutzung offen. Beenden mit **Strg+C**. Die `index.html` nicht direkt doppelt anklicken: Sie benötigt den Server.

Falls PowerShell `npm.ps1` blockiert, funktioniert ohne Änderung der Ausführungsrichtlinie:

```bash
node backend/server.js
```

## Enthaltene Funktionen

- Decks mit Name, Fach und Beschreibung erstellen, bearbeiten und löschen.
- Vorder- und Rückseiten als Text bearbeiten; Karten auch löschen.
- Bis zu acht Bilder pro Karte, auf Vorder- und/oder Rückseite: PNG, JPEG, GIF, WebP; je höchstens 5 MiB.
- Lernmodus mit Antwortaufdeckung und genau vier Bewertungen.
- Schwierige Karten sofort oder nach bis zu drei anderen Karten wiederholen.
- Echte, dauerhaft gespeicherte Fälligkeitstermine für spätere Sitzungen.
- Fortschritt von 0 bis 100 Prozent je Deck.
- Fällige Karten lernen oder über „Alle Karten üben“ frei wiederholen.
- CSV-Export der Decks, Karten einschließlich Bildreferenzen und Bewertungen.
- Responsive Oberfläche, Tastaturbedienung und verständliche Fehlerzustände.
- Drei optional ladbare Beispieldecks mit 15 Lernkarten; alle beginnen bei 0 %.

## Projektstruktur und Zuständigkeiten

```text
ONKI/
  backend/
    server.js              REST-Endpunkte und statische Auslieferung
    service.js             Validierung und Anwendungsfälle
    persistence.js         JSON-/CSV-Lesen und -Schreiben, Bilddateien
    demo.js                Optionale Beispieldaten
    data/                  Automatisch erzeugte Datendateien
    uploads/               Dauerhaft gespeicherte Bilder
  engine/
    spacedRepetition.js    Reine Algorithmus- und Fortschrittsfunktionen
  frontend/
    index.html             Grundgerüst der Oberfläche
    App.js                 Navigation und Zusammensetzen der Ansichten
    api.js                 Zentraler REST-Client
    styles.css             Gestaltung und mobile Ansichten
    assets/onki.svg        Logo und Favicon
    components/
      Dashboard.js         Startseite und Deckübersicht
      DeckView.js          Karten eines Decks
      DeckEditor.js        Deck erstellen/bearbeiten
      CardEditor.js        Texte und Bilder bearbeiten
      StudyMode.js         Lernmodus und Bewertungsoberfläche
      ui.js                Gemeinsame UI-Helfer
  tests/
    engine.test.js         Fachliche Algorithmustests
    api.test.js            API, Persistenz, Bilder und Neustart
  docs/
    ARCHITEKTUR.md         Datenmodell und Zusammenarbeit zu dritt
    ALGORITHMUS.md         Formeln, Sitzungsqueue und Beispiele
    API.md                REST-Vertrag
    ABNAHME.md             Zuordnung zu den Anforderungen und Prüfprotokoll
  START_ONKI.cmd           Windows-Starthilfe
  package.json
  README.md
```

| Person | Verantwortungsbereich | Zentrale Dateien |
| --- | --- | --- |
| **1 – Backend/Daten** | REST, Validierung, JSON/CSV, Bilder | `backend/`, `tests/api.test.js` |
| **2 – Algorithmus** | Wiederholung, Priorität, Score, Deckfortschritt | `engine/spacedRepetition.js`, `tests/engine.test.js` |
| **3 – UI/Frontend** | Dashboard, Editor, Lernmodus, Responsive Design | `frontend/` |

Die Kommentare im Quellcode kennzeichnen die Verantwortlichen. Mehr Details zur unabhängigen Zusammenarbeit: [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md).

## Wo werden Daten gespeichert?

Beim ersten Start erzeugt der Server:

| Ort | Inhalt |
| --- | --- |
| `backend/data/store.json` | Vollständige, maßgebliche Decks, Karten, Lernstände und Bewertungshistorie |
| `backend/data/decks.csv` | Lesbare Kopie der Decks |
| `backend/data/cards.csv` | Lesbare Kopie der Karten, Bildreferenzen und Lernstände |
| `backend/data/reviews.csv` | Lesbare Kopie der Bewertungshistorie |
| `backend/uploads/` | Bilddateien mit vom Server vergebenen Dateinamen |

Es gibt **kein localStorage, sessionStorage, IndexedDB, Service-Worker-Caching oder Cookie als Datenspeicher**. Der Browser hält nur die gerade angezeigten Daten und die aktuelle Lernrunde im Arbeitsspeicher. Jede erfolgreiche Bewertung wird vor dem Kartenwechsel auf dem Server gespeichert. Nach einem Neuladen entsteht die Runde aus den gespeicherten Fälligkeiten neu; die bisher gespeicherten Bewertungen bleiben erhalten.

JSON ist die Datenquelle, CSV eine abgeleitete Lesekopie. CSV-Dateien sind nicht zum direkten Bearbeiten oder Importieren gedacht. Nach einem regulären Neustart werden sie aus JSON erneuert. Falls eine CSV-Kopie nicht geschrieben werden kann, zeigt die Anwendung eine Warnung; das bereits gespeicherte JSON bleibt erhalten. Formelähnliche Texte erhalten im CSV ein führendes Apostroph, damit Tabellenprogramme sie nicht als Formel ausführen. Im JSON bleiben die Texte unverändert.

**Backup:** Server beenden und `backend/data` zusammen mit `backend/uploads` kopieren. Zur Wiederherstellung bei beendetem Server beide Ordner gemeinsam zurückkopieren. Nach dem Schließen des Browsers oder einem Server-Neustart bleiben diese Dateien bestehen. Beschädigte JSON-Dateien werden nicht automatisch durch leere Daten ersetzt.

## Lernlogik auf einen Blick

| Bewertung | In der laufenden Runde | Nächste reguläre Fälligkeit | Score |
| --- | --- | --- | --- |
| Nicht gewusst | sofort erneut | 1 Minute | −30 |
| Unsicher | nach bis zu 3 anderen Karten | 10 Minuten | −10 |
| Gewusst | für diese Runde erledigt | 1–2 Tage | +20 |
| Sehr sicher gewusst | für diese Runde erledigt; in der Gesamtordnung nach hinten | 7–14 Tage | +35 |

Der Score liegt immer zwischen 0 und 100. Deckfortschritt = gerundeter Mittelwert aller Kartenscores; neue Karten zählen als 0. Eine abgeschlossene Runde bedeutet **nicht** automatisch 100 % Deckfortschritt. Die genaue, bewusst einfache und nachvollziehbare Logik ist in [docs/ALGORITHMUS.md](docs/ALGORITHMUS.md) beschrieben.

**Tastatur:** Leertaste deckt die Antwort auf, danach bewerten die Tasten 1–4. In Eingabefeldern und Dialogen sind diese Kürzel deaktiviert.

## Entwickeln und prüfen

```bash
npm run dev
npm test
```

`dev` startet den Server mit automatischem Neustart bei Änderungen am Backend oder an importierten Modulen. Frontend-Änderungen werden beim Browser-Neuladen sichtbar. Die Tests verwenden eigene temporäre Ordner und verändern keine Nutzerdaten. Die Testumgebung für diese Ausgabe verwendet Node.js 24 unter Linux.

## Konfiguration

| Umgebungsvariable | Standard | Zweck |
| --- | --- | --- |
| `PORT` | `3000` | HTTP-Port |
| `HOST` | `127.0.0.1` | Standardmäßig nur vom eigenen Rechner erreichbar |
| `ONKI_DATA_DIR` | `backend/data` | Alternativer Ordner für JSON und CSV |
| `ONKI_UPLOADS_DIR` | `backend/uploads` | Alternativer Bildordner |

Beispiel für PowerShell, falls Port 3000 belegt ist:

```powershell
$env:PORT = "3001"
node backend/server.js
```

Danach http://127.0.0.1:3001 öffnen. Datenordner möglichst als absolute Pfade konfigurieren.

## Umfang und Erweiterbarkeit

Dies ist eine **lokale Einzelbenutzer-Anwendung**. Verschiedene Browser am selben Server teilen denselben Lernbestand. Der Dateispeicher serialisiert Schreibvorgänge; ein zweiter Serverprozess darf denselben Datenordner nicht gleichzeitig verwenden. Die Sperre liegt in `backend/data/.writer.lock`. Beim normalen Beenden wird sie entfernt; nach einem Absturz erkennt ONKI nicht mehr vorhandene Prozesse.

Dateispeicherung ist für das Uniprojekt transparent und einfach. Sie garantiert allein keine Skalierbarkeit: Der Datenbestand wird im Speicher gehalten und bei Änderungen vollständig geschrieben. Für viele Nutzer, sehr große Bestände oder mehrere Server ersetzt Person 1 später die Persistenzschicht durch eine Datenbank; Frontend und reine Lernfunktionen können dabei weitgehend bleiben. Ein öffentlich erreichbarer Mehrbenutzerbetrieb benötigt zusätzlich Benutzerkonten und Zugriffsrechte. Dieses Paket setzt absichtlich die geforderte lokale JSON-/CSV-Architektur um und enthält keine Cloud-Bereitstellung.

Die PDF-Anforderung „mindestens 80 % erfolgreicher Erstnutzer“ muss noch mit echten Testpersonen geprüft werden. Der beiliegende Abnahmeplan unterscheidet diese offene Usability-Messung von den technischen Prüfungen.
