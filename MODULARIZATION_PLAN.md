# Wavegrid — Dump Modularization Plan

## What's in the dump

The `dump/` is a working system with three major subsystems that are **not yet in** the wavegrid package structure:

| Dump path | What it does | Current state |
|-----------|-------------|---------------|
| `agent/engine.mjs` + `sandbox-prelude.js` | **QuickJS sandbox** that evaluates untrusted JS pattern code; exposes a `ctx` API (setHSV, fill, fade, noise, polar, uv, etc.) and returns a flat RGB framebuffer per frame. CPU/memory/stack limits. | Standalone `.mjs`, no types, hardcoded 7x7. |
| `agent/safety.mjs` | **Safety limiter** — brightnessCap + flash/slew rate cap applied to every frame before output. Sandbox cannot bypass. | 17 lines, pure function. |
| `agent/agent.mjs` | **Agent runtime** — dials OUT to a cloud relay over WSS, handles commands (`loadPattern`, `arm`, `disarm`, `setSpeed`, `setParam`, `solid`, `blackout`, `setZone`), runs the engine tick loop at configurable FPS, routes output to a swappable sink. | Monolithic 91-line script. |
| `agent/sinks.mjs` | **Output sinks**: `LocalUiSink` (HTTP+WS canvas viewer), `OscSink` (BEYOND livecontrol over raw UDP, diff-based, burst-guarded, arm-gated). | OscSink duplicates/diverges from `@wavegrid/osc`'s BeyondOscOutput. |
| `agent/mapper.mjs` + `mapper.html` | **Zone-to-grid mapper** — HTTP server for calibrating which BEYOND zone index corresponds to which grid cell. Flash-to-identify via OSC. Persists `mapping.json`. | Self-contained, coupled to agent. |
| `droplet/relay.js` | **Cloud relay** — token-gated WSS for the agent, cookie-session login, serves pattern gallery UI (inline HTML), forwards commands to the connected agent. | Monolithic 541-line file, UI is template strings. |
| `droplet/host.js` + `programs.js` | **Distributed Animation Program runtime** — `host.js` implements a render-set/framebuffer ABI (runs, halo, coords, blit). `programs.js` is a library of ~58 named programs using `defineProgram()`. UMD (works in browser + Node + QuickJS). | Completely separate from wavegrid's scenes/animations. |
| `tools/simulator.html` | **Browser program simulator** — runs host.js programs at 7x7 or 100x100 with dual render-set stitching. | Standalone HTML. |

## Key architectural insight: two pattern systems

The dump has **two** completely independent pattern/animation authoring systems:

1. **Snippet patterns** (`sandbox-prelude.js` ctx API) — lightweight JS snippets with `render(ctx)`. The `ctx` gives you `setHSV(i, h, s, v)`, `fill()`, `fade()`, `noise()`, `polar()`, `uv()`, `xy()`, timing (`t`, `dt`, `beat`, `beatPhase`), params. Runs in QuickJS sandbox with CPU/mem limits. Used by the relay UI's inline `<script type="text/plain">` blocks.

2. **Program library** (`host.js` ABI) — heavier, coordinate-based system with render sets, runs, halo regions, 1-D framebuffers, checkpoint/restore. Used by `programs.js` (58 programs). Designed for distributed rendering across multiple nodes.

Both produce the same output: a flat `COUNT * 3` RGB framebuffer. The relay UI bridges them by wrapping programs in a snippet-compatible `init()/render()` shim before shipping to the agent.

## Proposed new packages

### 1. `@wavegrid/patterns` (new package)
**What:** The pattern sandbox engine + the snippet `ctx` API + safety limiter.

Source from:
- `agent/engine.mjs` → `src/engine.ts` — QuickJS sandbox host
- `agent/sandbox-prelude.js` → `src/prelude.js` (stays JS, injected into sandbox)
- `agent/safety.mjs` → `src/safety.ts`

Key changes:
- TypeScript with proper interfaces (`PatternEngine`, `PatternMeta`, `RenderContext`, `SafetyConfig`)
- Make grid dimensions configurable (currently hardcoded `COLS=7, ROWS=7, COUNT=49`)
- Export the `ctx` API type so pattern authors get autocomplete
- The `buildCtx` from prelude should be specced as an interface in TS even though it runs in the sandbox
- Tests: load a pattern, render N frames, verify framebuffer output + safety limiting

### 2. `@wavegrid/programs` (new package)
**What:** The program library (the 58 animation programs + the host ABI runtime).

Source from:
- `droplet/host.js` → `src/host.ts` — `createNode`, `fullRuns`, `rectRuns`, render-set materialization
- `droplet/programs.js` → `src/programs.ts` — the 58 `defineProgram()` entries

Key changes:
- Convert from UMD to TypeScript ESM (keep a UMD build output for browser compatibility)
- Type the ABI interfaces: `RenderContext`, `ProgramFactory`, `NodeInstance`, `Run`
- Programs remain pure functions — no changes to the rendering math
- Export individual programs by name for tree-shaking
- Add the flag definitions as data (currently inline in relay.js)

### 3. `@wavegrid/agent` (new package)
**What:** The agent runtime that connects to a relay, runs pattern code in the sandbox, and dispatches to output sinks.

Source from:
- `agent/agent.mjs` → `src/agent.ts` — the main runtime
- `agent/sinks.mjs` → `src/sinks/` — `LocalUiSink`, `OscSink`

Key changes:
- TypeScript, proper types for config, commands, sinks
- Import `@wavegrid/patterns` for the engine
- Import `@wavegrid/osc` for OSC output instead of the hand-rolled `OscSink` (or adapt `OscSink` into `@wavegrid/osc` since it has features the existing `BeyondOscOutput` lacks: diff-based sending, burst guard, arm gate, alpha take/release)
- The command protocol (`loadPattern`, `arm`, `disarm`, `setSpeed`, etc.) should be a typed interface
- Config from JSON file (already `config.json`)

### 4. `@wavegrid/mapper` (new package)
**What:** Zone-to-grid calibration tool.

Source from:
- `agent/mapper.mjs` → `src/mapper.ts`
- `agent/mapper.html` → `src/mapper.html` (or a simple static asset)

Key changes:
- TypeScript
- Decouple from agent — should be usable standalone or embedded
- Typed `MappingConfig` interface
- Flash-to-identify via OSC (import from `@wavegrid/osc`)

### 5. `@wavegrid/cloud-relay` (new package)
**What:** The cloud relay server + web UI.

Source from:
- `droplet/relay.js` → `src/relay.ts` + `src/ui/` — separate the relay logic from the inline HTML

Key changes:
- TypeScript
- Separate the relay WebSocket logic (token auth, agent socket, command forwarding) from the UI
- The UI pattern gallery (80+ tiles with live previews, flags, programs) could become a lightweight static build that imports `@wavegrid/programs`
- Auth (cookie sessions, login) stays simple but gets types

## Changes to existing packages

### `@wavegrid/osc` — absorb the OscSink improvements
The dump's `OscSink` has capabilities the current `BeyondOscOutput` lacks:
- **Diff-based sending** — only sends changed channels (BEYOND drops bursts). Current `BeyondOscOutput` diffs at the cannon level; `OscSink` diffs at the channel level with a configurable threshold.
- **Burst guard** (`maxPerFlush`) — caps OSC messages per frame to avoid overwhelming BEYOND.
- **Arm gate** — won't emit until explicitly armed.
- **Alpha take/release** — sends `alpha=255` to take a zone, `alpha=0` to release it.
- **Raw UDP** — hand-rolls OSC float encoding (no `node-osc` dependency). Lighter, fewer allocations.

Recommendation: Add these features to `BeyondOscOutput` (or create a `BeyondLivecontrolOutput` variant) rather than keeping two implementations.

### `@wavegrid/receiver` — new "sandbox" mode
The existing receiver operates in **pass-through mode** (WebSocket in → LP filter → output adapter). The agent introduces a fundamentally different mode: **sandbox mode** (receive pattern code → run it locally → output).

Options:
1. **Add sandbox mode to receiver** — the receiver already has the adapter pattern. A new `SandboxInputAdapter` could accept `loadPattern` commands (from a relay or direct) and produce `CannonState[]` frames by running the pattern engine internally.
2. **Keep agent separate** — the agent (`@wavegrid/agent`) remains its own thing, since it has different concerns (outbound WSS to relay, arm/disarm, command protocol).

Recommendation: Option 2 — keep them separate. The receiver is a stateless pipe; the agent is a stateful pattern executor. They share output adapters via `@wavegrid/osc`.

## Dependency graph (proposed)

```
@wavegrid/patterns      (QuickJS sandbox, ctx API, safety)
    ↑
@wavegrid/programs      (58 animation programs, host ABI)
    ↑
@wavegrid/agent         (runtime: connects to relay, runs patterns, outputs to sinks)
    ├── @wavegrid/patterns
    ├── @wavegrid/osc    (for BEYOND/FB4 output)
    └── @wavegrid/mapper (optional, for calibration)

@wavegrid/cloud-relay   (the droplet: relay server + web UI)
    └── @wavegrid/programs (for pattern gallery previews + bundling)

@wavegrid/simulator     (existing, unchanged)
@wavegrid/receiver      (existing, unchanged — uses @wavegrid/osc)
@wavegrid/relay         (existing — the simple WS relay, different from cloud-relay)
@wavegrid/ui            (existing Next.js UI, unchanged)
@wavegrid/webgl         (existing 3D viewer, unchanged)
```

## Suggested implementation order

1. **`@wavegrid/patterns`** — extract the sandbox engine first, since it's the core new capability and has no wavegrid dependencies. Add tests.
2. **`@wavegrid/programs`** — extract the program library. Can be developed in parallel with patterns since they're independent (programs only need the host ABI, not the sandbox).
3. **Update `@wavegrid/osc`** — absorb the OscSink improvements (diff, burst guard, arm gate).
4. **`@wavegrid/agent`** — wire it up: imports patterns + osc, replaces the dump agent.
5. **`@wavegrid/mapper`** — extract the calibration tool.
6. **`@wavegrid/cloud-relay`** — extract the droplet relay + UI (biggest refactor, lowest priority since the existing `dump/droplet/relay.js` works).

## Open questions

- Should `@wavegrid/programs` ship as a single bundle or as individual pattern files?
- Should the cloud relay UI be a proper Next.js/React app (like `@wavegrid/ui`) or stay as a lightweight inline HTML approach?
- The dump's `OscSink` uses raw UDP (`dgram`) without `node-osc`. Should we drop the `node-osc` dependency in `@wavegrid/osc` in favor of hand-rolled encoding?
- The flag data (50+ country flag definitions) is currently inline in `relay.js`. Should it be its own data file in `@wavegrid/programs` or `@wavegrid/patterns`?
