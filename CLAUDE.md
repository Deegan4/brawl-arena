# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

Single-file HTML5 canvas fighting game (Smash-Bros-style 1v1 vs CPU). No build system, no package manager, no tests. The entire game — markup, styles, and logic — lives in [BRAWL ARENA.html](BRAWL ARENA.html) (~850 lines). `maxresdefault.jpg` is unused art reference.

## Running / Iterating

Open the HTML file directly in a browser — there is no build step or dev server.

```sh
open "BRAWL ARENA.html"           # macOS default browser
# or serve locally if testing mobile devtools:
python3 -m http.server 8000
```

Mobile touch controls auto-activate when `matchMedia('(hover: none) and (pointer: coarse)')` matches or UA contains a mobile token. To test the mobile path on desktop, use Chrome devtools device emulation.

## Architecture

Everything is one IIFE inside `<script>` at the bottom of the HTML. Section banner comments (`// ---------- X ----------`) mark the major regions and are the primary navigation aid — preserve them when editing.

Pipeline (top-down in the file):

1. **Canvas setup** — DPR-aware sizing, rebinds on `resize` / `orientationchange`.
2. **World** — `GRAV`, `FLOOR_Y()`, `platforms()` returns 4 platforms relative to viewport. `PLATS` is recomputed on resize, so anything reading platform geometry must read `PLATS` each frame (don't cache).
3. **Input** — Three independent input sources merge into one `input.p1` struct: keyboard (`keys` map), a virtual joystick (`touchVec` from `#stick`/`#knob` pointer math), and the four touch buttons. The `_jPress`/`_aPress`/`_sPress` "edge" flags are set on press and consumed (`= false`) inside `updateFighter` — preserve this consume-on-read pattern when adding new inputs, otherwise actions will repeat every frame.
4. **Fighter** — `makeFighter()` is the canonical fighter shape; `P1` and `P2` are the only two instances. AI is just `updateFighter(P2, 'ai')` — the `control` arg switches input source inside `updateFighter`, so AI logic lives alongside player logic, not in a separate module.
5. **Effects / Audio** — `spark()` pushes into shared `particles[]`. Audio is a lazy WebAudio synth (`audioInit()` is called from the Start button click to satisfy autoplay policy); `tone()` and `noise()` are fire-and-forget.
6. **Game state** — `gameState` is `'menu' | 'playing' | 'end'`. `startGame()` / `endGame()` toggle DOM overlays (`#center`, `#touch`) and reset fighters. The HUD is plain DOM (`#pct1`, `#stocks1`, etc.) updated each frame by `refreshHud()`, not drawn on the canvas.
7. **Physics** — `landOnPlatforms(f, prevY)` does swept top-of-platform collision using the previous frame's Y; if you change movement integration, also update what's passed as `prevY`. `applyKnockback()` is the smash-style percent-scaled launch formula. `hitboxFor()` returns the active attack AABB; `applyHits()` is called twice per frame (P1→P2, P2→P1).
8. **Draw** — Order matters: background → platforms → fighters → particles → flash overlay. Screen shake is applied via `ctx.translate(shx, shy)` around the whole world draw, inside a `save`/`restore`.
9. **Main loop** — Single `requestAnimationFrame(loop)` chain. `hitStop` freezes updates (not draws) for impact frames; `shake` and `flashTimer` decay each frame.

### Coordinate / scaling notes

- Logical coordinates are CSS pixels; `ctx.setTransform(DPR, …)` in `resize()` is what makes the canvas crisp. Don't multiply by `DPR` manually when drawing.
- Most layout constants are viewport-relative (`W*0.35`, `H*0.78`). When adding entities, keep them relative so the game stays playable across phone/desktop without a resize handler.

### Input edge-trigger pattern

Press-once actions (jump, attack, smash) use a paired `keys[...] && !prev` style via the `_jPress` flag set in keyboard/button handlers and cleared inside `updateFighter`. Continuous actions (movement, shield hold) read the live state directly. Mirror this split when extending controls.
