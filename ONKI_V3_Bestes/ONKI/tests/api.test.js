/** PERSON 1 – Echte HTTP-Aufrufe, echte Dateien, Neustart und konkurrierende Saves. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createApp } from '../backend/server.js';
import { toCsv } from '../backend/persistence.js';

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('CRUD, Bildspeicherung, Bewertungen, CSV und Zustand nach Server-Neustart', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'onki-test-'));
  const options = { dataDir: path.join(dir, 'data'), uploadsDir: path.join(dir, 'uploads') };
  let app;
  let base;
  const start = async () => {
    app = await createApp(options);
    await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${app.server.address().port}`;
  };
  const call = async (url, method = 'GET', data, status = 200) => {
    const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
    const body = await response.json();
    assert.equal(response.status, status, JSON.stringify(body));
    return body;
  };
  try {
    await start();
    assert.equal((await call('/api/decks')).decks.length, 0);
    await call('/api/decks', 'POST', { name: '', subject: 'Mathe' }, 400);
    const deck = await call('/api/decks', 'POST', { name: 'Testdeck', subject: 'Mathematik', description: 'Mehrzeilig\nmit „Zitat“' }, 201);
    await call(`/api/decks/${deck.id}`, 'PATCH', { name: 'Aktualisiert', subject: 'Mathematik', description: 'Übung' });
    const card = await call(`/api/decks/${deck.id}/cards`, 'POST', { front: '1 + 1?', back: '2' }, 201);
    await call(`/api/cards/${card.id}`, 'PATCH', { front: '2 + 2?', back: '4' });
    await call(`/api/cards/${card.id}/images`, 'POST', { name: 'bild.svg', side: 'front', data: Buffer.from('<svg/>').toString('base64') }, 400);
    const imageCard = await call(`/api/cards/${card.id}/images`, 'POST', { name: 'bild.png', side: 'back', data: png }, 201);
    assert.equal(imageCard.images.length, 1);
    const imageResponse = await fetch(base + '/uploads/' + imageCard.images[0].filename);
    assert.equal(imageResponse.status, 200);
    assert.equal(Buffer.from(await imageResponse.arrayBuffer()).toString('base64'), png);
    const payload = { rating: 4, reviewId: randomUUID() };
    const reviewed = await call(`/api/cards/${card.id}/review`, 'POST', payload);
    assert.equal(reviewed.card.score, 35);
    assert.equal(reviewed.progress, 35);
    assert.equal((await call(`/api/cards/${card.id}/review`, 'POST', payload)).card.reviewCount, 1);
    await call(`/api/cards/${card.id}/review`, 'POST', { ...payload, rating: 1 }, 409);
    await call(`/api/cards/${card.id}/review`, 'POST', { rating: 5, reviewId: randomUUID() }, 400);
    assert.equal((await call(`/api/decks/${deck.id}/study`)).cards.length, 0);
    assert.equal((await call(`/api/decks/${deck.id}/study?all=1`)).cards.length, 1);
    const before = await call(`/api/decks/${deck.id}`);
    await app.close();
    app = null;
    await start();
    assert.deepEqual(await call(`/api/decks/${deck.id}`), before);
    assert.equal((await fetch(base + '/uploads/' + imageCard.images[0].filename)).status, 200);
    const cardsCsv = await readFile(path.join(options.dataDir, 'cards.csv'), 'utf8');
    assert.ok(cardsCsv.includes('2 + 2?'));
    assert.ok(cardsCsv.includes(imageCard.images[0].filename));
    const csvResponse = await fetch(base + '/api/export/cards.csv');
    assert.equal(csvResponse.status, 200);
    assert.ok((await csvResponse.text()).includes('score'));
    await call(`/api/cards/${card.id}/images/${imageCard.images[0].id}`, 'DELETE');
    assert.equal((await readdir(options.uploadsDir)).length, 0);
    await call(`/api/cards/${card.id}`, 'DELETE');
    assert.equal((await call(`/api/decks/${deck.id}`)).cards.length, 0);
    await call(`/api/decks/${deck.id}`, 'DELETE');
    assert.equal((await call('/api/decks')).decks.length, 0);
    await call(`/api/decks/${deck.id}`, 'GET', undefined, 404);
  } finally { if (app) await app.close(); await rm(dir, { recursive: true, force: true }); }
});

test('Parallele Schreibvorgänge bleiben vollständig und zweiter Server wird blockiert', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'onki-concurrent-'));
  const options = { dataDir: path.join(dir, 'data'), uploadsDir: path.join(dir, 'uploads') };
  const app = await createApp(options);
  try {
    await assert.rejects(createApp(options), /bereits/);
    await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${app.server.address().port}`;
    const responses = await Promise.all(Array.from({ length: 12 }, (_, i) => fetch(base + '/api/decks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `Deck ${i}`, subject: 'Parallel', description: '' }) })));
    responses.forEach((response) => assert.equal(response.status, 201));
    assert.equal((await (await fetch(base + '/api/decks')).json()).decks.length, 12);
    assert.equal(JSON.parse(await readFile(path.join(options.dataDir, 'store.json'), 'utf8')).decks.length, 12);
    assert.equal((await fetch(base + '/backend/data/store.json')).status, 404);
    assert.equal((await fetch(base + '/api/decks', { method: 'POST', headers: { Origin: 'https://foreign.example', 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
    // Eine von einer fremden Startseite geöffnete App muss laden; API-Zugriffe bleiben blockiert.
    assert.equal((await fetch(base + '/', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 200);
    assert.equal((await fetch(base + '/api/decks', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  } finally { await app.close(); await rm(dir, { recursive: true, force: true }); }
});

test('Beschädigtes JSON wird nicht still durch leere Daten ersetzt', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'onki-corrupt-'));
  const target = path.join(dir, 'store.json');
  try {
    await writeFile(target, '{kaputt');
    await assert.rejects(createApp({ dataDir: dir, uploadsDir: path.join(dir, 'uploads') }));
    assert.equal(await readFile(target, 'utf8'), '{kaputt');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('CSV behandelt Anführungszeichen, Zeilenumbrüche und Formeln sicher', () => {
  const csv = toCsv([{ text: 'a,"b"\nc' }, { text: '=1+1' }], ['text']);
  assert.ok(csv.includes('"a,""b""\nc"'));
  assert.ok(csv.includes('"\'=1+1"'));
});
