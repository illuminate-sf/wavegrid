import { Receiver } from '../src/receiver';
import { createStubBridge } from '../src/osc';

describe('Receiver', () => {
  it('should create with default config', () => {
    const r = new Receiver();
    expect(r.status).toBe('reconnecting');
    expect(r.fallbackActive).toBe(false);
  });

  it('should return output state with 49 cannons', () => {
    const r = new Receiver();
    const state = r.getOutputState();
    expect(state).toHaveLength(49);
    expect(state[0]).toHaveProperty('h');
    expect(state[0]).toHaveProperty('s');
    expect(state[0]).toHaveProperty('b');
  });

  it('should accept custom config', () => {
    const bridge = createStubBridge();
    const r = new Receiver({
      simulatorUrl: 'ws://example.com:9999',
      alpha: 0.03,
      fallbackDelay: 5000,
      bridge
    });
    expect(r.status).toBe('reconnecting');
    const state = r.getOutputState();
    expect(state).toHaveLength(49);
  });
});
