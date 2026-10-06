/**
 * PERSON 1 – REST-Schnittstelle und Auslieferung des Frontends.
 * Native Node.js-Module: kein Installationsschritt und kein Framework nötig.
 */
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPersistence, csvSnapshots, HttpError } from './persistence.js';
import { createService } from './service.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../frontend');
const types = { '.woff2': 'font/woff2', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };

async function readJson(request) {
  if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'JSON-Daten erwartet.');
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 7 * 1024 * 1024) throw new HttpError(413, 'Die Anfrage ist zu groß (maximal 7 MB).');
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new HttpError(400, 'Ungültiges JSON.'); }
}

function sendJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

export async function createApp(options = {}) {
  const store = await createPersistence({
    dataDir: options.dataDir ?? process.env.ONKI_DATA_DIR ?? path.join(here, 'data'),
    uploadsDir: options.uploadsDir ?? process.env.ONKI_UPLOADS_DIR ?? path.join(here, 'uploads'),
  });
  const service = createService(store);

  const server = http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' https://fonts.gstatic.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    try {
      const url = new URL(request.url, 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);
      const method = request.method;
      // Der lokale Server benötigt keine Cookies. Fremde Websites dürfen ihn
      // nicht über das Browserprofil verändern; reine Same-Origin-Nutzung.
      // Öffentliche App-Dateien (inkl. /) müssen auch nach dem Öffnen eines
      // Links aus ChatGPT/Teams geladen werden können. Fremde Cross-Site-Aufrufe
      // an die API bleiben gesperrt; API-Änderungen prüfen zusätzlich Origin.
      if (pathname.startsWith('/api/') && request.headers['sec-fetch-site'] === 'cross-site') {
        throw new HttpError(403, 'Zugriff nur direkt über ONKI möglich.');
      }
      if (!['GET', 'HEAD'].includes(method) && request.headers.origin) {
        let origin;
        try { origin = new URL(request.headers.origin); }
        catch { throw new HttpError(403, 'Ungültiger Ursprung ist nicht erlaubt.'); }
        if (origin.host !== request.headers.host) throw new HttpError(403, 'Fremder Ursprung ist nicht erlaubt.');
      }
      let match;
      if (method === 'GET' && pathname === '/api/health') return sendJson(response, 200, { ok: true, storage: 'filesystem', warning: store.csvWarning });
      if (pathname === '/api/decks') {
        if (method === 'GET') return sendJson(response, 200, await service.listDecks());
        if (method === 'POST') return sendJson(response, 201, await service.createDeck(await readJson(request)));
      }
      if (method === 'POST' && pathname === '/api/demo') {
        await readJson(request);
        return sendJson(response, 201, await service.loadDemo());
      }
      if ((match = pathname.match(/^\/api\/decks\/([^/]+)$/))) {
        if (method === 'GET') return sendJson(response, 200, await service.getDeck(match[1]));
        if (method === 'PATCH') return sendJson(response, 200, await service.updateDeck(match[1], await readJson(request)));
        if (method === 'DELETE') return sendJson(response, 200, await service.deleteDeck(match[1]));
      }
      if (method === 'POST' && (match = pathname.match(/^\/api\/decks\/([^/]+)\/cards$/))) return sendJson(response, 201, await service.createCard(match[1], await readJson(request)));
      if (method === 'GET' && (match = pathname.match(/^\/api\/decks\/([^/]+)\/study$/))) return sendJson(response, 200, await service.study(match[1], url.searchParams.get('all') === '1'));
      if ((match = pathname.match(/^\/api\/cards\/([^/]+)$/))) {
        if (method === 'PATCH') return sendJson(response, 200, await service.updateCard(match[1], await readJson(request)));
        if (method === 'DELETE') return sendJson(response, 200, await service.deleteCard(match[1]));
      }
      if (method === 'POST' && (match = pathname.match(/^\/api\/cards\/([^/]+)\/review$/))) return sendJson(response, 200, await service.review(match[1], await readJson(request)));
      if (method === 'POST' && (match = pathname.match(/^\/api\/cards\/([^/]+)\/images$/))) return sendJson(response, 201, await service.addImage(match[1], await readJson(request)));
      if (method === 'DELETE' && (match = pathname.match(/^\/api\/cards\/([^/]+)\/images\/([^/]+)$/))) return sendJson(response, 200, await service.removeImage(match[1], match[2]));
      if (method === 'GET' && (match = pathname.match(/^\/api\/export\/(decks|cards|reviews)\.csv$/))) {
        const csv = csvSnapshots(await store.read())[match[1]];
        response.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="onki-${match[1]}.csv"` });
        return response.end(csv);
      }
      if (pathname.startsWith('/api/')) throw new HttpError(404, 'API-Endpunkt nicht gefunden.');
      if (!['GET', 'HEAD'].includes(method)) throw new HttpError(405, 'Diese Methode ist nicht erlaubt.');

      let target;
      if (pathname.startsWith('/uploads/')) target = (await store.imageInfo(pathname.slice('/uploads/'.length))).fullPath;
      else if (pathname === '/engine/spacedRepetition.js') target = path.resolve(here, '../engine/spacedRepetition.js');
      else {
        target = path.resolve(frontendRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
        if (!target.startsWith(frontendRoot + path.sep) || pathname.split('/').some((part) => part.startsWith('.'))) throw new HttpError(404, 'Datei nicht gefunden.');
      }
      const type = types[path.extname(target)];
      if (!type) throw new HttpError(404, 'Datei nicht gefunden.');
      try {
        if (!(await stat(target)).isFile()) throw new HttpError(404, 'Datei nicht gefunden.');
        const bytes = await readFile(target);
        response.writeHead(200, { 'Content-Type': type, 'Content-Length': bytes.length });
        response.end(method === 'HEAD' ? undefined : bytes);
      } catch (error) { if (error.code === 'ENOENT') throw new HttpError(404, 'Datei nicht gefunden.'); throw error; }
    } catch (error) {
      const status = error.status ?? (error instanceof URIError ? 400 : 500);
      if (status === 500) console.error(error);
      if (!response.headersSent) sendJson(response, status, { error: status === 500 ? 'Speichern oder Laden fehlgeschlagen. Bitte erneut versuchen und den Server prüfen.' : error.message });
      else response.end();
    }
  });
  server.requestTimeout = 30_000;
  return { server, store, async close() { await new Promise((resolve) => server.close(resolve)); await store.close(); } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const app = await createApp();
    const port = Number(process.env.PORT || 3000);
    const host = process.env.HOST || '127.0.0.1';
    app.server.on('error', async (error) => { console.error(`ONKI konnte nicht starten: ${error.message}`); await app.store.close(); process.exitCode = 1; });
    app.server.listen(port, host, () => console.log(`ONKI läuft auf http://${host}:${port}\nBeenden: Strg+C`));
    let stopping = false;
    const stop = async () => { if (stopping) return; stopping = true; await app.close(); process.exit(0); };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  } catch (error) { console.error(`ONKI konnte nicht starten: ${error.message}`); process.exitCode = 1; }
}
