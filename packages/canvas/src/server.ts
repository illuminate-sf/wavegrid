import http from 'http';
import { WebSocket,WebSocketServer } from 'ws';

import { getCanvasHTML } from './ui';

const PORT = parseInt(process.env.PORT || '3001', 10);
const SIMULATOR_URL = process.env.SIMULATOR_URL || 'ws://localhost:3000';

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(getCanvasHTML());
});

const wss = new WebSocketServer({ server });

let simulatorWs: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function connectToSimulator() {
  try {
    simulatorWs = new WebSocket(SIMULATOR_URL);

    simulatorWs.on('open', () => {
      console.log('  ✦ Connected to simulator');
    });

    simulatorWs.on('message', (data) => {
      // Relay state from simulator to all canvas clients
      const msg = data.toString();
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(msg);
        }
      });
    });

    simulatorWs.on('close', () => {
      console.log('  ✦ Simulator disconnected, reconnecting...');
      scheduleReconnect();
    });

    simulatorWs.on('error', () => {
      scheduleReconnect();
    });
  } catch (_e) {
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToSimulator();
  }, 2000);
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    // Relay commands from canvas clients to simulator
    if (simulatorWs && simulatorWs.readyState === WebSocket.OPEN) {
      simulatorWs.send(raw);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ╭──────────────────────────────────────╮');
  console.log('  │   Illuminate · Canvas                 │');
  console.log('  │   painting the sky with light         │');
  console.log('  ╰──────────────────────────────────────╯');
  console.log('');
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  → Simulator: ${SIMULATOR_URL}`);
  console.log('');
  connectToSimulator();
});

export { server };
