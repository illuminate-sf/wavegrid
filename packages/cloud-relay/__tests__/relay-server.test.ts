import http from 'http';
import WebSocket from 'ws';
import { createRelayServer } from '../src/relay-server';

const PORT = 19860;
const AGENT_TOKEN = 'test-token-123';
const PASSWORD = 'secret';

function fetch(
  url: string,
  opts: { method?: string; body?: string; headers?: Record<string, string>; followRedirect?: boolean } = {},
): Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: opts.method ?? 'GET',
      headers: opts.headers ?? (opts.body ? { 'content-type': 'application/json' } : {}),
    }, (res) => {
      let body = '';
      res.on('data', (d: string) => body += d);
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body, headers: res.headers }));
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

describe('createRelayServer', () => {
  let relay: ReturnType<typeof createRelayServer>;

  beforeAll((done) => {
    relay = createRelayServer({
      port: PORT,
      password: PASSWORD,
      agentToken: AGENT_TOKEN,
      host: '127.0.0.1',
      log: () => {},
    });
    relay.server.on('listening', done);
  });

  afterAll(() => {
    relay.close();
  });

  it('redirects unauthenticated requests to /login', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  it('serves login page at /login', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/login`);
    expect(res.status).toBe(200);
    expect(res.body).toContain('Login');
  });

  it('rejects wrong password', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/login`, {
      method: 'POST',
      body: 'pass=wrong',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login?e=1');
  });

  it('accepts correct password and sets session cookie', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/login`, {
      method: 'POST',
      body: `pass=${PASSWORD}`,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
    expect(res.headers['set-cookie']).toBeDefined();
    const cookie = Array.isArray(res.headers['set-cookie'])
      ? res.headers['set-cookie'][0]
      : res.headers['set-cookie'];
    expect(cookie).toContain('sid=');
  });

  it('/api/status returns agent status', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/status`);
    expect(res.status).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.agent).toBe(false);
  });

  it('serves /host.js and /programs.js', async () => {
    const hostRes = await fetch(`http://127.0.0.1:${PORT}/host.js`);
    expect(hostRes.status).toBe(200);
    const progRes = await fetch(`http://127.0.0.1:${PORT}/programs.js`);
    expect(progRes.status).toBe(200);
  });

  it('returns 404 for unknown routes (when authed)', async () => {
    // First login to get a cookie
    const loginRes = await fetch(`http://127.0.0.1:${PORT}/login`, {
      method: 'POST',
      body: `pass=${PASSWORD}`,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    const cookie = Array.isArray(loginRes.headers['set-cookie'])
      ? loginRes.headers['set-cookie'][0]
      : loginRes.headers['set-cookie'];
    const sid = cookie?.split(';')[0] ?? '';

    const res = await fetch(`http://127.0.0.1:${PORT}/nonexistent`, {
      headers: { cookie: sid },
    });
    expect(res.status).toBe(404);
  });

  describe('agent WebSocket', () => {
    it('rejects agent connections with wrong token', (done) => {
      const ws = new WebSocket(`ws://127.0.0.1:${PORT}/agent?token=wrong`);
      let settled = false;
      const finish = () => { if (!settled) { settled = true; done(); } };
      ws.on('error', finish);
      ws.on('close', finish);
    });

    it('accepts agent connections with correct token', (done) => {
      const ws = new WebSocket(`ws://127.0.0.1:${PORT}/agent?token=${AGENT_TOKEN}`);
      ws.on('open', () => {
        expect(relay.state.agentConnected).toBe(true);
        ws.close();
      });
      ws.on('close', () => {
        // Need a small delay for the state to update
        setTimeout(() => {
          expect(relay.state.agentConnected).toBe(false);
          done();
        }, 50);
      });
    });

    it('forwards commands to the agent', (done) => {
      const ws = new WebSocket(`ws://127.0.0.1:${PORT}/agent?token=${AGENT_TOKEN}`);
      ws.on('open', () => {
        const sent = relay.sendToAgent({ action: 'loadPattern', code: 'test' });
        expect(sent).toBe(true);
      });
      ws.on('message', (data) => {
        const cmd = JSON.parse(data.toString());
        expect(cmd.action).toBe('loadPattern');
        expect(cmd.code).toBe('test');
        ws.close();
        done();
      });
    });

    it('sendToAgent returns false when no agent connected', () => {
      // Close any existing agent connection first
      relay.close();
      relay = createRelayServer({
        port: PORT + 1,
        password: PASSWORD,
        agentToken: AGENT_TOKEN,
        host: '127.0.0.1',
        log: () => {},
      });
      const sent = relay.sendToAgent({ action: 'test' });
      expect(sent).toBe(false);
      relay.close();
      // Restore original for afterAll
      relay = createRelayServer({
        port: PORT,
        password: PASSWORD,
        agentToken: AGENT_TOKEN,
        host: '127.0.0.1',
        log: () => {},
      });
    });
  });
});
