/**
 * OSC bridge placeholder for BEYOND laser software.
 *
 * This module will eventually translate the receiver's HSB grid state
 * into OSC messages targeting BEYOND's laser control interface.
 *
 * For now it provides the interface and a console-based stub.
 */

import { CannonState } from './filter';

export interface OscConfig {
  host: string;
  port: number;
  /** OSC address prefix. Default "/beyond/laser" */
  prefix: string;
}

export interface OscBridge {
  send(grid: CannonState[]): void;
  close(): void;
}

/**
 * Create a stub OSC bridge that logs output to console.
 * Replace with real OSC implementation when BEYOND is connected.
 */
export function createStubBridge(): OscBridge {
  let frameCount = 0;
  return {
    send(_grid: CannonState[]) {
      frameCount++;
      // Log every 60th frame (~1 per second at 60fps) to avoid flooding
      if (frameCount % 60 === 0) {
        const sample = _grid[0];
        process.stdout.write(
          `\r  ◈ frame ${frameCount}  sample[0]: h=${sample.h.toFixed(1)} s=${sample.s.toFixed(1)} b=${sample.b.toFixed(1)}  `
        );
      }
    },
    close() {
      console.log('\n  ◈ OSC bridge closed');
    }
  };
}

/**
 * Create a real OSC bridge (future implementation).
 * Will use node-osc or similar to send UDP messages to BEYOND.
 */
export function createOscBridge(_config: OscConfig): OscBridge {
  console.log(`  ◈ OSC bridge configured: ${_config.host}:${_config.port}`);
  console.log('  ◈ (OSC not yet implemented — using stub)');
  return createStubBridge();
}
