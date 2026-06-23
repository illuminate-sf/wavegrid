/**
 * Cloud relay server — login UI + command relay to agents over WebSocket.
 *
 * The relay server:
 *   1. Authenticates browser users via password + cookie sessions
 *   2. Serves the pattern gallery UI
 *   3. Accepts agent connections via token-gated WSS
 *   4. Forwards commands from the browser to the agent
 *   5. Serves host.js + programs.js for the pattern gallery's live previews
 */

import http from 'http';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import type { RelayCommand, RelayServerConfig, RelayState } from './types';

function cookies(req: http.IncomingMessage): Record<string, string> {
  const o: Record<string, string> = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const i = c.indexOf('=');
    if (i > 0) o[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return o;
}

function body(req: http.IncomingMessage): Promise<string> {
  return new Promise(r => {
    let b = '';
    req.on('data', (d: string) => b += d);
    req.on('end', () => r(b));
  });
}

export interface RelayServerHandle {
  server: http.Server;
  state: RelayState;
  /** Send a command to the connected agent. Returns true if sent. */
  sendToAgent(cmd: RelayCommand): boolean;
  close(): void;
}

export function createRelayServer(config: RelayServerConfig = {}): RelayServerHandle {
  const port = config.port ?? 3000;
  const password = config.password ?? 'changeme';
  const agentToken = config.agentToken ?? 'changeme';
  const bindHost = config.host ?? '127.0.0.1';
  const log = config.log ?? console.log;

  let hostJs = '';
  let programsJs = '';
  if (config.hostJsPath) {
    try {
      const fs = require('fs');
      hostJs = fs.readFileSync(config.hostJsPath, 'utf8');
    } catch { /* ignore */ }
  }
  if (config.programsJsPath) {
    try {
      const fs = require('fs');
      programsJs = fs.readFileSync(config.programsJsPath, 'utf8');
    } catch { /* ignore */ }
  }

  const sessions = new Set<string>();
  let agent: WebSocket | null = null;
  let hbTimer: ReturnType<typeof setInterval> | null = null;

  const relayState: RelayState = {
    agentConnected: false,
    agentSeen: 0,
  };

  function sendToAgent(cmd: RelayCommand): boolean {
    if (agent && agent.readyState === WebSocket.OPEN) {
      agent.send(JSON.stringify(cmd));
      return true;
    }
    return false;
  }

  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url ?? '/', 'http://x');
    const ck = cookies(req);
    const authed = ck.sid ? sessions.has(ck.sid) : false;

    // Login routes (no auth required)
    if (u.pathname === '/login' && req.method === 'POST') {
      const p = new URLSearchParams(await body(req));
      if (p.get('pass') === password) {
        const sid = crypto.randomBytes(18).toString('hex');
        sessions.add(sid);
        res.setHeader('Set-Cookie', `sid=${sid}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`);
        res.writeHead(302, { Location: '/' });
        return res.end();
      }
      res.writeHead(302, { Location: '/login?e=1' });
      return res.end();
    }

    if (u.pathname === '/login' && req.method === 'GET') {
      res.setHeader('content-type', 'text/html');
      return res.end('<html><body><h1>Login</h1><form method=post action=/login><input name=pass type=password><button type=submit>Login</button></form></body></html>');
    }

    // Status API (no auth required)
    if (u.pathname === '/api/status') {
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({
        agent: relayState.agentConnected,
        seen: relayState.agentSeen,
      }));
    }

    // Serve host.js / programs.js (no auth required — used by previews)
    if (u.pathname === '/host.js') {
      res.setHeader('content-type', 'application/javascript');
      return res.end(hostJs);
    }
    if (u.pathname === '/programs.js') {
      res.setHeader('content-type', 'application/javascript');
      return res.end(programsJs);
    }

    // Everything else requires auth
    if (!authed) {
      res.writeHead(302, { Location: '/login' });
      return res.end();
    }

    if (u.pathname === '/' || u.pathname === '/patterns') {
      res.setHeader('content-type', 'text/html');
      return res.end('<html><body><h1>Pattern Gallery</h1><p>Patterns UI coming soon</p></body></html>');
    }

    if (u.pathname === '/map') {
      res.setHeader('content-type', 'text/html');
      return res.end('<html><body><h1>Zone Mapping</h1><p>Map UI coming soon</p></body></html>');
    }

    if (u.pathname === '/api/command' && req.method === 'POST') {
      let cmd: RelayCommand;
      try {
        cmd = JSON.parse(await body(req));
      } catch {
        res.writeHead(400);
        return res.end('{}');
      }
      res.setHeader('content-type', 'application/json');
      if (sendToAgent(cmd)) {
        return res.end(JSON.stringify({ ok: true }));
      }
      res.writeHead(503);
      return res.end(JSON.stringify({ ok: false, error: 'agent disconnected' }));
    }

    res.writeHead(404);
    res.end('not found');
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const u = new URL(req.url ?? '/', 'http://x');
    if (u.pathname !== '/agent' || u.searchParams.get('token') !== agentToken) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      if (agent) { try { agent.close(); } catch { /* ignore */ } }
      agent = ws;
      relayState.agentConnected = true;
      relayState.agentSeen = Date.now();
      log('agent connected');

      ws.on('message', () => { relayState.agentSeen = Date.now(); });
      ws.on('pong', () => { relayState.agentSeen = Date.now(); });
      ws.on('close', () => {
        if (agent === ws) {
          agent = null;
          relayState.agentConnected = false;
        }
        log('agent disconnected');
      });
    });
  });

  hbTimer = setInterval(() => {
    if (agent && agent.readyState === WebSocket.OPEN) {
      try { agent.ping(); } catch { /* ignore */ }
    }
  }, 15000);

  server.listen(port, bindHost, () => log(`relay listening on ${bindHost}:${port}`));

  return {
    server,
    state: relayState,
    sendToAgent,
    close(): void {
      if (hbTimer) { clearInterval(hbTimer); hbTimer = null; }
      if (agent) { try { agent.close(); } catch { /* ignore */ } agent = null; }
      sessions.clear();
      wss.close();
      server.close();
    },
  };
}
