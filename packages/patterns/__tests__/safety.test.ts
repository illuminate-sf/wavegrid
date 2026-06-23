import { applySafety } from '../src/safety';

describe('applySafety', () => {
  it('applies brightness cap', () => {
    const fb = [255, 128, 64, 200, 100, 50];
    applySafety(fb, null, 1 / 60, { brightnessCap: 0.5, maxFlashHz: 0 });
    expect(fb[0]).toBeCloseTo(127.5);
    expect(fb[1]).toBeCloseTo(64);
    expect(fb[2]).toBeCloseTo(32);
    expect(fb[3]).toBeCloseTo(100);
    expect(fb[4]).toBeCloseTo(50);
    expect(fb[5]).toBeCloseTo(25);
  });

  it('does not modify when cap is 1', () => {
    const fb = [255, 128, 64];
    applySafety(fb, null, 1 / 60, { brightnessCap: 1, maxFlashHz: 0 });
    expect(fb).toEqual([255, 128, 64]);
  });

  it('clamps slew rate when maxFlashHz is set', () => {
    const prev = [0, 0, 0];
    const fb = [255, 255, 255];
    const dt = 1 / 60;
    const maxFlashHz = 2;
    applySafety(fb, prev, dt, { brightnessCap: 1, maxFlashHz });

    // maxStep = 255 * 2 * 2 * (1/60) = 17
    const maxStep = 255 * 2 * maxFlashHz * dt;
    expect(fb[0]).toBeCloseTo(maxStep);
    expect(fb[1]).toBeCloseTo(maxStep);
    expect(fb[2]).toBeCloseTo(maxStep);
  });

  it('clamps downward slew rate', () => {
    const prev = [200, 200, 200];
    const fb = [0, 0, 0];
    const dt = 1 / 60;
    const maxFlashHz = 2;
    applySafety(fb, prev, dt, { brightnessCap: 1, maxFlashHz });

    const maxStep = 255 * 2 * maxFlashHz * dt;
    expect(fb[0]).toBeCloseTo(200 - maxStep);
    expect(fb[1]).toBeCloseTo(200 - maxStep);
    expect(fb[2]).toBeCloseTo(200 - maxStep);
  });

  it('applies both cap and slew together', () => {
    const prev = [0, 0, 0];
    const fb = [255, 255, 255];
    const dt = 1 / 60;
    applySafety(fb, prev, dt, { brightnessCap: 0.5, maxFlashHz: 2 });

    // Cap applies first: 255 * 0.5 = 127.5
    // Then slew: maxStep = 255 * 2 * 2 * (1/60) = 17
    // 127.5 > 17, so clamped to 17
    const maxStep = 255 * 2 * 2 * dt;
    expect(fb[0]).toBeCloseTo(maxStep);
  });

  it('does nothing with no prev and no cap', () => {
    const fb = [100, 200, 50];
    applySafety(fb, null, 1 / 60, { brightnessCap: 1, maxFlashHz: 10 });
    expect(fb).toEqual([100, 200, 50]);
  });
});
