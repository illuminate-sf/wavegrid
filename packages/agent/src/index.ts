/**
 * @wavegrid/agent — the agent runtime for wavegrid.
 *
 * Connects to the cloud relay, runs JavaScript patterns in a QuickJS
 * sandbox, and dispatches rendered frames to output sinks.
 */

// Types
export type {
  AgentCommand,
  AgentConfig,
  OscConfig,
  RuntimeState,
  Sink
} from './types';

// Command handler & render loop
export type { CommandHandlerDeps, RenderLoop } from './command-handler';
export { createCommandHandler, createRenderLoop } from './command-handler';

// Relay client
export type { RelayClient, RelayClientConfig } from './relay-client';
export { createRelayClient } from './relay-client';

// Sinks
export type { LocalUiSinkConfig } from './local-ui-sink';
export { createLocalUiSink } from './local-ui-sink';
