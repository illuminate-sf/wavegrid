/**
 * Types for the wavegrid agent runtime.
 */

/** Agent configuration loaded from config.json or environment. */
export interface AgentConfig {
  /** WebSocket URL to the cloud relay (includes token). */
  relayUrl: string;
  /** Frames per second for the render loop. Default 60. */
  fps?: number;
  /** Beats per minute for pattern timing. Default 120. */
  bpm?: number;
  /** Pattern playback speed multiplier. Default 1. */
  speed?: number;
  /** Safety limiter: brightness ceiling 0..1. Default 1. */
  brightnessCap?: number;
  /** Safety limiter: max flash rate in Hz, 0=unlimited. Default 12. */
  maxFlashHz?: number;
  /** Whether OSC output is armed (live to hardware). Default false. */
  armed?: boolean;
  /** Output sink type. Default 'ui'. */
  sink?: 'osc' | 'ui';
  /** Local UI viewer port. Default 8090. */
  uiPort?: number;
  /** OSC configuration (when sink='osc'). */
  osc?: OscConfig;
  /** Enable zone mapper server. Default true. */
  mapper?: boolean;
  /** Mapper server port. Default 8091. */
  mapperPort?: number;
  /** Number of grid cells. Default 49. */
  count?: number;
}

/** OSC output configuration. */
export interface OscConfig {
  host?: string;
  port?: number;
  zoneMap?: number[] | null;
  scale?: number;
  thresh?: number;
  maxPerFlush?: number;
  targets?: Record<string, { host: string; port: number }>;
}

/** A command received from the relay. */
export interface AgentCommand {
  action: string;
  code?: string;
  params?: Record<string, unknown>;
  speed?: number;
  name?: string;
  value?: unknown;
  zone?: number;
  r?: number;
  g?: number;
  b?: number;
  [key: string]: unknown;
}

/** Runtime state for the agent's render loop. */
export interface RuntimeState {
  fps: number;
  bpm: number;
  speed: number;
  brightnessCap: number;
  maxFlashHz: number;
  armed: boolean;
}

/** Output sink interface — present a frame, release all, close. */
export interface Sink {
  kind?: string;
  present(fb: number[]): void;
  releaseAll?(): void;
  clientCount?(): number;
  close?(): void;
}
