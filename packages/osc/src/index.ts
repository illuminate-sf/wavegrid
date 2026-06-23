// Color conversion
export type { RGB } from './color';
export { hsbToRgb, hsbToRgb100, hsbToRgb255 } from './color';

// OSC adapters
export type {
  BeyondOscConfig,
  CannonRoute,
  CannonState,
  FB4OscConfig,
  OscMessage,
  OscTarget,
  OutputAdapter,
  RoutingConfig
} from './osc-adapters';
export {
  BeyondOscOutput,
  DEBUG_OSC,
  FB4OscOutput,
  RoutedOscOutput,
  createRoutedOutput,
  encodeBeyondMessages,
  encodeFB4Messages
} from './osc-adapters';

// Raw OSC sink — direct UDP, no node-osc dependency
export type { OscSinkHandle, RawOscSinkConfig } from './raw-osc-sink';
export { createRawOscSink } from './raw-osc-sink';
