import dgram from 'dgram';

import { createRawOscSink } from '../src/raw-osc-sink';

let portCounter = 19900;
function nextPort() { return portCounter++; }

interface ReceivedMsg {
  address: string;
  value: number;
}

function parseOscFloat(buf: Buffer): { address: string; value: number } {
  let end = buf.indexOf(0);
  const address = buf.slice(0, end).toString('ascii');
  // Skip to end of padded address
  const addrPadded = Math.ceil((end + 1) / 4) * 4;
  // Skip type tag string (",f\0\0" = 4 bytes)
  const valueOffset = addrPadded + 4;
  const value = buf.readFloatBE(valueOffset);
  return { address, value };
}

function createUdpReceiver(port: number): Promise<{
  messages: ReceivedMsg[];
  close: () => Promise<void>;
}> {
  return new Promise((resolve) => {
    const messages: ReceivedMsg[] = [];
    const server = dgram.createSocket('udp4');
    server.on('message', (msg) => {
      try {
        messages.push(parseOscFloat(msg));
      } catch { /* skip malformed */ }
    });
    server.bind(port, '127.0.0.1', () => {
      resolve({
        messages,
        close: () => new Promise<void>((res) => { server.close(); setTimeout(res, 50); }),
      });
    });
  });
}

describe('createRawOscSink', () => {
  it('does not send when not armed', async () => {
    const port = nextPort();
    const receiver = await createUdpReceiver(port);
    const sink = createRawOscSink({ host: '127.0.0.1', port, count: 4 });

    sink.present([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255]);
    await new Promise(r => setTimeout(r, 100));

    expect(receiver.messages.length).toBe(0);
    sink.close();
    await receiver.close();
  });

  it('sends OSC when armed', async () => {
    const port = nextPort();
    const receiver = await createUdpReceiver(port);
    const sink = createRawOscSink({ host: '127.0.0.1', port, count: 2 });

    sink.arm();
    // pixel 0: red (255,0,0), pixel 1: green (0,255,0)
    sink.present([255, 0, 0, 0, 255, 0]);
    await new Promise(r => setTimeout(r, 150));

    // Should have sent: Brightness, alpha, red for pixel 0; Brightness, alpha, green for pixel 1
    const addresses = receiver.messages.map(m => m.address);
    expect(addresses).toContain('/beyond/zone/0/livecontrol/alpha');
    expect(addresses).toContain('/beyond/zone/0/livecontrol/red');
    expect(addresses).toContain('/beyond/zone/1/livecontrol/alpha');
    expect(addresses).toContain('/beyond/zone/1/livecontrol/green');

    sink.close();
    await receiver.close();
  });

  it('diffs channels — skips unchanged values', async () => {
    const port = nextPort();
    const receiver = await createUdpReceiver(port);
    const sink = createRawOscSink({ host: '127.0.0.1', port, count: 1, thresh: 2 });

    sink.arm();
    // First frame: red pixel
    sink.present([200, 0, 0]);
    await new Promise(r => setTimeout(r, 100));
    const firstCount = receiver.messages.length;

    // Second frame: same value — should be diffed out
    sink.present([200, 0, 0]);
    await new Promise(r => setTimeout(r, 100));

    expect(receiver.messages.length).toBe(firstCount); // no new messages

    sink.close();
    await receiver.close();
  });

  it('sends changes when values differ beyond threshold', async () => {
    const port = nextPort();
    const receiver = await createUdpReceiver(port);
    const sink = createRawOscSink({ host: '127.0.0.1', port, count: 1, thresh: 2 });

    sink.arm();
    sink.present([200, 0, 0]);
    await new Promise(r => setTimeout(r, 100));
    const firstCount = receiver.messages.length;

    // Change red by more than threshold
    sink.present([100, 0, 0]);
    await new Promise(r => setTimeout(r, 100));

    expect(receiver.messages.length).toBeGreaterThan(firstCount);
    const newMsgs = receiver.messages.slice(firstCount);
    const redMsg = newMsgs.find(m => m.address.includes('/red'));
    expect(redMsg).toBeDefined();

    sink.close();
    await receiver.close();
  });

  it('releases zones when pixel goes dark', async () => {
    const port = nextPort();
    const receiver = await createUdpReceiver(port);
    const sink = createRawOscSink({ host: '127.0.0.1', port, count: 1, thresh: 2 });

    sink.arm();
    sink.present([200, 100, 50]);
    await new Promise(r => setTimeout(r, 100));
    const firstCount = receiver.messages.length;

    // Go dark
    sink.present([0, 0, 0]);
    await new Promise(r => setTimeout(r, 100));

    const releaseMsgs = receiver.messages.slice(firstCount);
    const alphaMsg = releaseMsgs.find(m => m.address.includes('/alpha'));
    expect(alphaMsg).toBeDefined();
    expect(alphaMsg!.value).toBe(0);

    sink.close();
    await receiver.close();
  });

  it('respects maxPerFlush burst guard', async () => {
    const port = nextPort();
    const receiver = await createUdpReceiver(port);
    // count=10 zones but maxPerFlush=5 — only first few zones should send
    const sink = createRawOscSink({ host: '127.0.0.1', port, count: 10, maxPerFlush: 5 });

    sink.arm();
    const fb = new Array(30).fill(200); // all bright
    sink.present(fb);
    await new Promise(r => setTimeout(r, 150));

    // Should have been capped at ~5 messages
    expect(receiver.messages.length).toBeLessThanOrEqual(6); // small margin

    sink.close();
    await receiver.close();
  });

  it('releaseAll sends alpha=0 for all zones', async () => {
    const port = nextPort();
    const receiver = await createUdpReceiver(port);
    const sink = createRawOscSink({ host: '127.0.0.1', port, count: 3 });

    sink.arm();
    sink.present([200, 100, 50, 200, 100, 50, 200, 100, 50]);
    await new Promise(r => setTimeout(r, 100));

    receiver.messages.length = 0; // clear
    sink.releaseAll();
    await new Promise(r => setTimeout(r, 100));

    const alphaMessages = receiver.messages.filter(m => m.address.includes('/alpha'));
    expect(alphaMessages.length).toBe(3);
    for (const msg of alphaMessages) {
      expect(msg.value).toBe(0);
    }

    sink.close();
    await receiver.close();
  });

  it('disarm releases and stops sending', async () => {
    const port = nextPort();
    const receiver = await createUdpReceiver(port);
    const sink = createRawOscSink({ host: '127.0.0.1', port, count: 1 });

    sink.arm();
    expect(sink.armed).toBe(true);
    sink.present([200, 100, 50]);
    await new Promise(r => setTimeout(r, 100));
    const countAfterArm = receiver.messages.length;
    expect(countAfterArm).toBeGreaterThan(0);

    sink.disarm();
    expect(sink.armed).toBe(false);
    await new Promise(r => setTimeout(r, 50));
    const countAfterDisarm = receiver.messages.length;

    // Should have sent release messages
    expect(countAfterDisarm).toBeGreaterThan(countAfterArm);

    // Further presents should not send
    sink.present([255, 255, 255]);
    await new Promise(r => setTimeout(r, 100));
    expect(receiver.messages.length).toBe(countAfterDisarm);

    sink.close();
    await receiver.close();
  });

  it('uses custom zoneMap', async () => {
    const port = nextPort();
    const receiver = await createUdpReceiver(port);
    // Map grid index 0 → zone 42
    const sink = createRawOscSink({ host: '127.0.0.1', port, count: 1, zoneMap: [42] });

    sink.arm();
    sink.present([200, 100, 50]);
    await new Promise(r => setTimeout(r, 100));

    const addresses = receiver.messages.map(m => m.address);
    expect(addresses.some(a => a.includes('/zone/42/'))).toBe(true);
    expect(addresses.every(a => !a.includes('/zone/0/'))).toBe(true);

    sink.close();
    await receiver.close();
  });
});
