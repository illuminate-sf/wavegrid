'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Relay hook — connects to the cloud relay for commands and to the
 * agent viewer for real-time framebuffer display.
 *
 * Commands go via HTTP POST to /api/command on the relay.
 * Framebuffer comes via binary WebSocket from the agent viewer.
 */

export interface RelayConfig {
  /** Relay URL (http://host:3000). Used for login + command API. */
  relayUrl: string;
  /** Agent viewer WS URL (ws://host:8090). Receives RGB framebuffer. */
  viewerUrl: string;
}

export interface AgentCommand {
  action: string;
  [key: string]: unknown;
}

export function useRelay(config: RelayConfig) {
  const [connected, setConnected] = useState(false);
  const [agentConnected, setAgentConnected] = useState(false);
  const [framebuffer, setFramebuffer] = useState<Uint8Array | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Connect to agent viewer WS for framebuffer
  useEffect(() => {
    const ws = new WebSocket(config.viewerUrl);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      // Reconnect after delay
      setTimeout(() => {
        if (wsRef.current === ws) wsRef.current = null;
      }, 2000);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) {
        setFramebuffer(new Uint8Array(e.data));
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [config.viewerUrl]);

  // Poll relay status
  useEffect(() => {
    const check = () => {
      fetch(`${config.relayUrl}/api/status`)
        .then(r => r.json())
        .then(d => setAgentConnected(!!d.agent))
        .catch(() => setAgentConnected(false));
    };
    check();
    statusTimerRef.current = setInterval(check, 3000);
    return () => {
      if (statusTimerRef.current) clearInterval(statusTimerRef.current);
    };
  }, [config.relayUrl]);

  // Send command to relay
  const sendCommand = useCallback(async (cmd: AgentCommand) => {
    try {
      await fetch(`${config.relayUrl}/api/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(cmd)
      });
    } catch {
      // ignore — agent may be disconnected
    }
  }, [config.relayUrl]);

  // Convenience: load a pattern
  const loadPattern = useCallback((code: string, speed?: number) => {
    return sendCommand({ action: 'loadPattern', code, speed: speed ?? 1 });
  }, [sendCommand]);

  // Convenience: solid color (RGB)
  const solidColor = useCallback((r: number, g: number, b: number) => {
    return sendCommand({ action: 'solid', r, g, b });
  }, [sendCommand]);

  // Convenience: set single zone RGB
  const setZone = useCallback((zone: number, r: number, g: number, b: number) => {
    return sendCommand({ action: 'setZone', zone, r, g, b });
  }, [sendCommand]);

  // Convenience: stop / blackout
  const stop = useCallback(() => {
    return sendCommand({ action: 'stopPattern' });
  }, [sendCommand]);

  return {
    connected,
    agentConnected,
    framebuffer,
    sendCommand,
    loadPattern,
    solidColor,
    setZone,
    stop
  };
}
