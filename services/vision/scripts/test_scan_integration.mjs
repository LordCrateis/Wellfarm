// Runs real checkpoint inference against an isolated local API and temporary database.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
const root = process.cwd();
const directory = await mkdtemp(join(tmpdir(), 'wellfarm-inference-'));
const base = 'http://127.0.0.1:18081/api';
let cookie = '';
const fetch = (url, options = {}) => globalThis.fetch(url, {...options, headers: {...options.headers, ...(cookie ? {Cookie: cookie} : {})}});
const server = spawn(process.execPath, ['platform/replit/artifacts/api-server/dist/index.mjs'], {
  cwd: root, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'],
  env: { ...process.env, PORT: '18081', DATABASE_PATH: join(directory, 'test.sqlite'), UPLOAD_DIRECTORY: join(directory, 'uploads') },
});
server.stderr.on('data', data => process.stderr.write(data));
try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { ready = (await fetch(`${base}/scans`)).status === 401; } catch {}
    if (ready) break;
    await new Promise(r => setTimeout(r, 250));
  }
  assert.ok(ready, 'API started');
  const credentials = {email: 'test@example.com', password: 'test-password-123456'};
  const json = body => ({headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const registration = await fetch(`${base}/auth/register`, {method: 'POST', ...json(credentials)});
  assert.equal(registration.status, 200);
  cookie = registration.headers.get('set-cookie').split(';')[0];
  assert.equal((await fetch(`${base}/auth/me`)).status, 200);
  const created = await fetch(`${base}/scans`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ crop: 'Cotton', latitude: 20, longitude: 75, affectedAreaPercentage: 20 }) });
  assert.equal(created.status, 201);
  const scan = await created.json();
  const firstCookie = cookie;
  const second = await fetch(`${base}/auth/register`, {method: 'POST', ...json({email: 'other@example.com', password: credentials.password})});
  cookie = second.headers.get('set-cookie').split(';')[0];
  assert.deepEqual(await (await fetch(`${base}/scans`)).json(), []);
  assert.equal((await fetch(`${base}/scans/${scan.id}`)).status, 404);
  assert.equal((await fetch(`${base}/scans/${scan.id}`, {method: 'DELETE'})).status, 404);
  assert.equal((await fetch(`${base}/auth/logout`, {method: 'POST'})).status, 204);
  assert.equal((await fetch(`${base}/auth/me`)).status, 401);
  cookie = firstCookie;
  assert.equal((await fetch(`${base}/account/feedback`, {method: 'POST', ...json({message: 'Test feedback'})})).status, 201);
  assert.equal((await fetch(`${base}/scans/${scan.id}/analysis`, { method: 'POST' })).status, 503);
  const image = await readFile(resolve(root, 'data/raw/cotton_sar_cld/Cotton Leaf Disease Detection Dataset/Original Dataset/Bacterial Blight/BBC00001.jpg'));
  const form = new FormData();
  form.append('image', new Blob([image], { type: 'image/jpeg' }), 'leaf.jpg');
  assert.equal((await fetch(`${base}/scans/${scan.id}/image`, { method: 'POST', body: form })).status, 200);
  assert.equal((await fetch(`${base}/scans/${scan.id}/analysis`)).status, 404);
  const start = Date.now();
  const response = await fetch(`${base}/scans/${scan.id}/analysis`, { method: 'POST' });
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  assert.equal(result.mode, 'model');
  assert.equal(result.candidates.length, 3);
  assert.equal(result.candidates[0].condition, 'Bacterial blight');
  assert.ok(result.candidates.every(c => Number.isFinite(c.confidence) && c.confidence >= 0 && c.confidence <= 1));
  assert.equal(result.severity, 'moderate');
  assert.equal((await (await fetch(`${base}/scans/${scan.id}`)).json()).status, 'completed');
  assert.deepEqual(await (await fetch(`${base}/scans/${scan.id}/analysis`)).json(), result);
  assert.equal((await fetch(`${base}/scans/missing/analysis`, { method: 'POST' })).status, 404);
  assert.ok((await readdir(join(directory, 'uploads'))).some(name => name.endsWith('.analysis.json')));
  assert.equal((await fetch(`${base}/account`, {method: 'DELETE', ...json({password: 'wrong'})})).status, 403);
  assert.equal((await fetch(`${base}/account`, {method: 'DELETE', ...json({password: credentials.password})})).status, 204);
  assert.equal((await fetch(`${base}/auth/me`)).status, 401);
  const login = await fetch(`${base}/auth/login`, {method: 'POST', ...json(credentials)});
  assert.equal(login.status, 401);
  const otherLogin = await fetch(`${base}/auth/login`, {method: 'POST', ...json({email: 'other@example.com', password: credentials.password})});
  cookie = otherLogin.headers.get('set-cookie').split(';')[0];
  assert.equal((await fetch(`${base}/scans/${scan.id}`)).status, 404);
  assert.equal((await fetch(`${base}/scans/${scan.id}/analysis`)).status, 404);
  assert.deepEqual(await readdir(join(directory, 'uploads')), []);
  console.log(JSON.stringify({ passed: true, inferenceSeconds: (Date.now() - start) / 1000, candidates: result.candidates, testDirectory: directory }, null, 2));
} finally { server.kill(); }
