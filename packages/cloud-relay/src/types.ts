/**
 * Types for the cloud relay server.
 */

/** Configuration for the relay server. */
export interface RelayServerConfig {
  /** HTTP port. Default 3000. */
  port?: number;
  /** Login password for the UI. Default 'changeme'. */
  password?: string;
  /** Token for agent WebSocket authentication. Default 'changeme'. */
  agentToken?: string;
  /** Bind address. Default '127.0.0.1'. */
  host?: string;
  /** Path to host.js source file (for shipping to agents). */
  hostJsPath?: string;
  /** Path to programs.js source file (for shipping to agents). */
  programsJsPath?: string;
  /** Logger. */
  log?: (msg: string) => void;
}

/** Relay server state. */
export interface RelayState {
  /** Whether an agent is currently connected. */
  agentConnected: boolean;
  /** Last time the agent was seen (ms since epoch). */
  agentSeen: number;
}

/** A command to forward to the agent. */
export interface RelayCommand {
  action: string;
  code?: string;
  params?: Record<string, unknown>;
  speed?: number;
  [key: string]: unknown;
}
