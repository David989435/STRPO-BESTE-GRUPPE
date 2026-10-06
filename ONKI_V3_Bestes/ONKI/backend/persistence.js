/**
 * PERSON 1 – Ausschließlich Dateispeicherung. Keine UI und keine Lernformel.
 * JSON ist die Datenquelle. CSV-Dateien sind automatisch erneuerte Lesekopien.
 * Eine Warteschlange verhindert verlorene Updates bei parallelen API-Aufrufen.
 */
import { mkdir, readFile, writeFile, rename, unlink, open, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function csvCell(value) {
  let text = value == null ? '' : String(value);
  // Verhindert Formelausführung beim Öffnen eines Exports in Excel/LibreOffice.
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function toCsv(records, columns) {
  return '\uFEFF' + [columns.join(','), ...records.map((row) => columns.map((col) => csvCell(row[col])).join(','))].join('\r\n') + '\r\n';
}

export function csvSnapshots(state) {
  return {
    decks: toCsv(state.decks, ['id', 'name', 'subject', 'description', 'createdAt', 'updatedAt']),
    cards: toCsv(state.cards.map((card) => ({ ...card, images: JSON.stringify(card.images) })), ['id', 'deckId', 'front', 'back', 'images', 'score', 'lastRating', 'nextReviewAt', 'reviewCount', 'lastReviewedAt']),
    reviews: toCsv(state.reviews, ['id', 'cardId', 'deckId', 'rating', 'scoreBefore', 'scoreAfter', 'reviewedAt', 'nextReviewAt']),
  };
}

/** Temp-Datei im selben Ordner, flush, dann atomar ersetzen. */
async function atomicWrite(filename, contents) {
  const temp = `${filename}.${randomUUID()}.tmp`;
  let handle;
  try {
    handle = await open(temp, 'wx', 0o600);
    await handle.writeFile(contents);
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(temp, filename);
  } finally {
    await handle?.close().catch(() => {});
    await unlink(temp).catch(() => {});
  }
}

function checkState(data) {
  if (data?.schemaVersion !== 1 || !['decks', 'cards', 'reviews'].every((key) => Array.isArray(data[key]))) {
    throw new Error('store.json hat ein unbekanntes Format. Datei sichern und prüfen; sie wird nicht überschrieben.');
  }
}

export async function createPersistence({ dataDir, uploadsDir }) {
  await mkdir(dataDir, { recursive: true });
  await mkdir(uploadsDir, { recursive: true });
  const filename = path.join(dataDir, 'store.json');
  const lockPath = path.join(dataDir, '.writer.lock');

  // Genau ein Serverprozess darf denselben Dateibestand schreiben.
  try {
    await writeFile(lockPath, String(process.pid), { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const pid = Number(await readFile(lockPath, 'utf8'));
    // Eine gerade erst erstellte Sperrdatei kann noch leer sein. Sie niemals
    // vorschnell entfernen: das könnte zwei gleichzeitig gestartete Schreiber zulassen.
    if (!Number.isInteger(pid) || pid <= 0) throw new Error('Die Schreibsperre ist unvollständig. Zuerst alle ONKI-Server beenden, dann .writer.lock prüfen.');
    let live = true;
    try { process.kill(pid, 0); }
    catch (err) { if (err.code === 'ESRCH') live = false; }
    if (live) throw new Error('Dieser Datenordner wird bereits von einem ONKI-Server verwendet.');
    await unlink(lockPath);
    await writeFile(lockPath, String(process.pid), { flag: 'wx', mode: 0o600 });
  }

  let state;
  let writes = Promise.resolve();
  let closed = false;
  let csvWarning = null;

  async function updateCsv() {
    try {
      for (const [name, csv] of Object.entries(csvSnapshots(state))) {
        await atomicWrite(path.join(dataDir, `${name}.csv`), csv);
      }
      csvWarning = null;
    } catch (error) {
      // Die JSON-Transaktion ist schon erfolgreich: keine falsche Fehlermeldung
      // nach einem Commit. Beim Neustart und nächsten Speichern erneut ableiten.
      csvWarning = 'CSV-Lesekopien konnten nicht aktualisiert werden. JSON ist gespeichert.';
      console.error(csvWarning, error.message);
    }
  }

  try {
    try { state = JSON.parse(await readFile(filename, 'utf8')); checkState(state); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      state = { schemaVersion: 1, decks: [], cards: [], reviews: [] };
      await atomicWrite(filename, JSON.stringify(state, null, 2));
    }
    await updateCsv();
  } catch (error) {
    await unlink(lockPath).catch(() => {});
    throw error;
  }

  return {
    get csvWarning() { return csvWarning; },
    async read() { await writes; return structuredClone(state); },
    async transaction(change) {
      if (closed) throw new Error('Speicher ist geschlossen.');
      const operation = writes.then(async () => {
        const next = structuredClone(state);
        const result = await change(next);
        checkState(next);
        await atomicWrite(filename, JSON.stringify(next, null, 2));
        state = next;
        await updateCsv();
        return structuredClone(result);
      });
      writes = operation.catch(() => {});
      return operation;
    },
    async saveImage(buffer, extension) {
      const filename = `${randomUUID()}.${extension}`;
      await atomicWrite(path.join(uploadsDir, filename), buffer);
      return filename;
    },
    async imageInfo(filename) {
      // Namen stammen aus unseren UUIDs; keine vom Client gewählten Pfade.
      if (!/^[a-f\d-]{36}\.(png|jpg|webp|gif)$/.test(filename)) throw new HttpError(404, 'Bild nicht gefunden.');
      const fullPath = path.join(uploadsDir, filename);
      try { return { fullPath, size: (await stat(fullPath)).size }; }
      catch (error) { if (error.code === 'ENOENT') throw new HttpError(404, 'Bild nicht gefunden.'); throw error; }
    },
    async removeImage(filename) {
      if (!/^[a-f\d-]{36}\.(png|jpg|webp|gif)$/.test(filename)) return;
      await unlink(path.join(uploadsDir, filename)).catch((error) => {
        if (error.code !== 'ENOENT') console.error('Verwaistes Bild konnte nicht entfernt werden:', error.message);
      });
    },
    async close() {
      closed = true;
      await writes;
      await unlink(lockPath).catch(() => {});
    },
  };
}
