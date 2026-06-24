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
  createRoutedOutput,
  DEBUG_OSC,
  encodeBeyondMessages,
  encodeFB4Messages,
  FB4OscOutput,
  RoutedOscOutput} from './osc-adapters';
