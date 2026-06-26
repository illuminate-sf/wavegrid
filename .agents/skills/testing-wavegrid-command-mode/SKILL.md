---
name: testing-wavegrid-command-mode
description: Test wavegrid command-mode fixes end-to-end. Covers unit tests, adversarial fix verification, WebSocket integration tests, and build/lint checks. Use when verifying receiver or server command-mode changes.
---

# Testing Wavegrid Command Mode

## Overview

Wavegrid uses a command-relay architecture: the server relays lightweight commands to receivers, which compute animations locally at 60fps. Testing command-mode changes requires verifying both receiver-side logic (unit tests) and server-side relay behavior (integration tests via WebSocket).

## Devin Secrets Needed

None — all testing runs locally without external credentials.

## Prerequisites

```bash
cd /home/ubuntu/repos/wavegrid
pnpm install
pnpm -r run build
```

Build must succeed before integration tests (server needs compiled JS in `dist/`). The `ws` module is installed in `packages/server/node_modules/`, not at the workspace root — run integration test scripts from `packages/server/` or adjust require paths.

## Phase 1: Unit Tests

```bash
pnpm -r run test
```

Key test files:
- `packages/receiver/__tests__/command-engine.test.ts` — command handler + tick loop tests
- `packages/receiver/__tests__/receiver.test.ts` — full receiver integration (WebSocket, OSC)
- `packages/server/__tests__/grid.test.ts` — grid math
- `packages/server/__tests__/scenes.test.ts` — scene application

Expected: ~134 tests across all packages. All must pass.

## Phase 2: Adversarial Verification

For each fix being tested, temporarily revert the source change, run tests, and confirm they **fail**. This proves the tests actually catch the bug. Then restore the fix.

Tips:
- Focus on tests that verify *behavioral output* (e.g., actual hue values from animations), not just internal state (e.g., tick counter values). Tick counter tests might pass regardless of evaluation order.
- For animation tick-order bugs, test the actual rendered output (e.g., rainbow hue at tick=0 should be 0, not 1.5) rather than the tick counter value.
- The `tickCommandMode` function in `command-engine.ts` is the core receiver tick loop — most animation/paint bugs manifest here.

## Phase 3: WebSocket Integration Tests

The `ws` module is only available in `packages/server/node_modules/`. Integration test scripts must be run from that directory:

```bash
cd packages/server
node integration-test.js
```

Integration test pattern:
1. Start server on a non-default port: `PORT=4998 node dist/server.js &`
2. Connect WebSocket client(s)
3. Send commands, capture responses
4. Verify command actions match expected format

Key things to verify:
- **Keepalive**: Server sends `{action: 'keepalive'}` every ~2s (120 frames at 60fps). It must NOT re-send `{action: 'setAnimation'}` which would reset the receiver's tick counter.
- **Clear**: Must send `{action: 'clear'}` not `{action: 'stop'}`. `clear` resets the scene on the receiver; `stop` only stops animation.
- **Paint after animation**: After a cannon/selection paint command, `currentAnimation` must be null. Verified by observing that the next keepalive sends `{action: 'keepalive'}` not `{action: 'setAnimation'}`.

## Phase 4: Build & Lint

```bash
pnpm -r run build
pnpm -r run lint
```

Both must pass with exit code 0. Lint may produce warnings (not errors).

## Common Pitfalls

- **`ws` module not found at workspace root**: The monorepo hoists some deps but `ws` lands in `packages/server/node_modules/`. Run integration scripts from `packages/server/` or use a full path require.
- **Port conflicts**: If a previous server is still running, integration tests will fail with `EADDRINUSE`. Use `fuser -k <port>/tcp` to kill (note: `lsof` might not be available on all VMs).
- **Keepalive timing**: The keepalive fires every 120 frames (~2s at 60fps). Wait at least 3-5 seconds in integration tests to capture keepalive messages.
- **Animation tick evaluation order matters**: The receiver must increment `state.tick` AFTER evaluating the animation, not before. The behavioral difference is subtle (1.5 degree hue offset on rainbow) but causes visible glitches on physical lasers.

## CI

CI runs two jobs:
- `build-and-test` (Linux) — full build + all tests
- `build-windows` — receiver build on Windows (`pnpm run build:receiver`)

Both must pass. Never assume a CI failure is preexisting — investigate every failure.
