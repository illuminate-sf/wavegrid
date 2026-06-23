/**
 * Relay client — persistent WebSocket connection to the cloud relay
 * with exponential backoff reconnection.
 */

import WebSocket from 'ws';

import type { AgentCommand } from './types';

export interface RelayClientConfig {
  /** WebSocket URL to the relay (wss://host/agent?token=...). */
  url: string;
  /** Initial reconnect delay in ms. Default 3000. */
  initialBackoff?: number;
  /** Maximum reconnect delay in ms. Default 15000. */
  maxBackoff?: number;
  /** Connection timeout in ms. Default 12000. */
  connectTimeout?: number;
  /** Heartbeat interval in ms. Default 15000. */
  heartbeatInterval?: number;
  /** Called when a command is received. */
  onCommand: (cmd: AgentCommand) => void;
  /** Called on log events. */
  onLog?: (msg: string) => void;
}

export interface RelayClient {
  /** Connect to the relay (starts reconnect loop). */
  connect(): void;
  /** Disconnect and stop reconnecting. */
  disconnect(): void;
  /** Whether the client is currently connected. */
  readonly connected: boolean;
}

export function createRelayClient(config: RelayClientConfig): RelayClient {
  const url = config.url;
  const initialBackoff = config.initialBackoff ?? 3000;
  const maxBackoff = config.maxBackoff ?? 15000;
  const connectTimeout = config.connectTimeout ?? 12000;
  const heartbeatInterval = config.heartbeatInterval ?? 15000;
  const onCommand = config.onCommand;
  const log = config.onLog ?? console.log;

  let ws: WebSocket | null = null;
  let backoff = initialBackoff;
  let stopped = false;
  let hbTimer: ReturnType<typeof setInterval> | null = null;

  function doConnect(): void {
    if (stopped) return;

    const safeUrl = url.replace(/token=[^&]+/, 'token=…');
    log(`connecting to relay: ${safeUrl}`);

    const socket = new WebSocket(url);
    ws = socket;
    let settled = false;

    const giveUp = setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        try { socket.terminate(); } catch { try { socket.close(); } catch { /* ignore */ } }
      }
    }, connectTimeout);

    socket.on('open', () => {
      clearTimeout(giveUp);
      backoff = initialBackoff;
      log('connected to relay');
    });

    socket.on('message', (data: WebSocket.Data) => {
      let cmd: AgentCommand;
      try {
        cmd = JSON.parse(data.toString());
      } catch {
        return;
      }
      onCommand(cmd);
    });

    socket.on('close', () => {
      clearTimeout(giveUp);
      if (settled) return;
      settled = true;
      if (hbTimer) { clearInterval(hbTimer); hbTimer = null; }
      ws = null;
      if (!stopped) {
        const d = backoff;
        backoff = Math.min(Math.round(backoff * 1.5), maxBackoff);
        log(`relay closed; reconnecting in ${d}ms`);
        setTimeout(doConnect, d);
      }
    });

    socket.on('error', (e: Error) => {
      log(`ws error: ${e.message}`);
      try { socket.close(); } catch { /* ignore */ }
    });

    hbTimer = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.ping();
      } else if (hbTimer) {
        clearInterval(hbTimer);
        hbTimer = null;
      }
    }, heartbeatInterval);
  }

  return {
    connect(): void {
      stopped = false;
      backoff = initialBackoff;
      doConnect();
    },

    disconnect(): void {
      stopped = true;
      if (hbTimer) { clearInterval(hbTimer); hbTimer = null; }
      if (ws) {
        try { ws.close(); } catch { /* ignore */ }
        ws = null;
      }
    },

    get connected(): boolean {
      return ws !== null && ws.readyState === WebSocket.OPEN;
    }
  };
}
