import http from 'http';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { startMapper } from '../src/mapper';

function fetch(url: string, opts: { method?: string; body?: string } = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: opts.method ?? 'GET',
      headers: opts.body ? { 'content-type': 'application/json' } : {},
    }, (res) => {
      let body = '';
      res.on('data', (d: string) => body += d);
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

describe('startMapper', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'mapper-test-'));
  const mappingPath = join(tmpDir, 'mapping.json');
  const htmlPath = join(tmpDir, 'mapper.html');
  const port = 19850;

  writeFileSync(htmlPath, '<html><body>Test Mapper</body></html>');

  let mapper: ReturnType<typeof startMapper>;

  beforeAll((done) => {
    mapper = startMapper({
      port,
      mappingPath,
      htmlPath,
      targets: { pc2: { host: '127.0.0.1', port: 9999 } },
      rows: 3,
      cols: 3,
    });
    // Wait for server to be ready
    mapper.server.on('listening', done);
  });

  afterAll(() => {
    mapper.close();
    try { unlinkSync(mappingPath); } catch { /* ignore */ }
    try { unlinkSync(htmlPath); } catch { /* ignore */ }
  });

  it('serves HTML at /', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/`);
    expect(res.status).toBe(200);
    expect(res.body).toContain('Test Mapper');
  });

  it('serves HTML at /map', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/map`);
    expect(res.status).toBe(200);
    expect(res.body).toContain('Test Mapper');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/unknown`);
    expect(res.status).toBe(404);
  });

  it('GET /api/mapping returns default mapping', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/mapping`);
    expect(res.status).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.rows).toBe(3);
    expect(data.cols).toBe(3);
    expect(data.cells).toHaveLength(9);
    expect(data.cells[0].name).toBe('A1');
    expect(data.cells[8].name).toBe('C3');
  });

  it('creates mapping.json on disk if missing', () => {
    expect(existsSync(mappingPath)).toBe(true);
    const data = JSON.parse(readFileSync(mappingPath, 'utf8'));
    expect(data.rows).toBe(3);
    expect(data.cols).toBe(3);
  });

  it('POST /api/mapping saves new mapping', async () => {
    const custom = {
      rows: 3,
      cols: 3,
      cells: [{ pos: 0, row: 0, col: 0, index: 42, name: 'X1', target: 'pc2' }],
    };
    const res = await fetch(`http://127.0.0.1:${port}/api/mapping`, {
      method: 'POST',
      body: JSON.stringify(custom),
    });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body).ok).toBe(true);

    const saved = JSON.parse(readFileSync(mappingPath, 'utf8'));
    expect(saved.cells[0].index).toBe(42);
    expect(saved.cells[0].name).toBe('X1');
  });

  it('POST /api/mapping rejects bad data', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/mapping`, {
      method: 'POST',
      body: JSON.stringify({ noCell: true }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/command with flashZone returns ok', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/command`, {
      method: 'POST',
      body: JSON.stringify({ action: 'flashZone', index: 0, target: 'pc2', ms: 200 }),
    });
    expect(res.status).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.ok).toBe(true);
    expect(data.until).toBeGreaterThan(Date.now() - 1000);

    // Wait for flash to end
    await new Promise(r => setTimeout(r, 300));
  });

  it('loadMapping() returns stored data', () => {
    const m = mapper.loadMapping();
    expect(m.rows).toBe(3);
    expect(m.cols).toBe(3);
    expect(Array.isArray(m.cells)).toBe(true);
  });
});
