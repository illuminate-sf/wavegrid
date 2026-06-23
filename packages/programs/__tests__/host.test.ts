import { Host } from '../src/index';

describe('Host', () => {
  it('exports BPP constant', () => {
    expect(Host.BPP).toBe(3);
  });

  it('fullRuns returns a single run covering W*H', () => {
    const runs = Host.fullRuns(7, 7);
    expect(runs).toEqual([[0, 49]]);
  });

  it('fullRuns for non-square grid', () => {
    const runs = Host.fullRuns(10, 5);
    expect(runs).toEqual([[0, 50]]);
  });

  it('rectRuns returns H runs of length w', () => {
    const runs = Host.rectRuns(10, 10, 2, 3, 4, 2);
    expect(runs.length).toBe(2);
    expect(runs[0]).toEqual([3 * 10 + 2, 4]); // y=3, x0=2, len=4
    expect(runs[1]).toEqual([4 * 10 + 2, 4]); // y=4, x0=2, len=4
  });

  it('countOwned sums run lengths', () => {
    expect(Host.countOwned([[0, 10], [20, 5]])).toBe(15);
    expect(Host.countOwned([[0, 49]])).toBe(49);
    expect(Host.countOwned([])).toBe(0);
  });
});
