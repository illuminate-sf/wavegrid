# @illuminate/canvas

Artist-facing creative canvas for the 7×7 Illuminate installation. This is a creative instrument for **painting the sky with light** — not a technical control panel.

## Design Philosophy

- No technical language, no projector numbers, no OSC concepts
- Everything is fluid, playful, and expressive
- Feels like Procreate or TouchDesigner, not a lighting console
- Optimized for iPad touch interaction

## Modes

- **Paint** — Choose a color, touch/drag cannons to paint them
- **Gradient** — Pick colors, drag to create live gradients
- **Brush** — Adjustable size with soft falloff
- **Energy** — Single intensity slider for live performance
- **Scenes** — Visual color swatches, tap to apply
- **Motion** — Draw paths, light animates along them
- **Symmetry** — Mirror, radial, and kaleidoscope tools

## Usage

```sh
pnpm dev
# → http://localhost:3001
```

Connects to the simulator backend via WebSocket for state synchronization.
