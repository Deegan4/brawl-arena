# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

Single-file HTML5 canvas fighting game (Smash-Bros-style 1v1, vs CPU or local 2P) with a 4-character roster, selectable stages, item pickups, and stock/time match modes. No build system, no package manager, no test suite. The entire game — markup, styles, and logic — lives in [BRAWL ARENA.html](BRAWL ARENA.html) (~1610 lines). `maxresdefault.jpg` is unused art reference. GitHub remote: <https://github.com/Deegan4/brawl-arena>.

## Running / Iterating

Open the HTML file directly in a browser — there is no build step or dev server.

```sh
open "BRAWL ARENA.html"           # macOS default browser
# or serve locally if testing mobile devtools:
python3 -m http.server 8000
```

Mobile touch controls auto-activate when `matchMedia('(hover: none) and (pointer: coarse)')` matches or UA contains a mobile token. To test the mobile path on desktop, use Chrome devtools device emulation.

### Validation

After any non-trivial edit:

```sh
node .claude/skills/playtest/scripts/parse-check.mjs   # syntax-checks the <script> block
```

The PostToolUse hook in `.claude/settings.json` runs the same check automatically on every Edit/Write to `BRAWL ARENA.html` and blocks with a parse error message if the script no longer parses.

## Architecture

Everything is one IIFE inside `<script>` at the bottom of the HTML. Section banner comments (`// ---------- X ----------`) mark the major regions and are the primary navigation aid — preserve them when editing.

Pipeline (top-down in the file):

1. **Canvas setup** — DPR-aware sizing, rebinds on `resize` / `orientationchange`.
2. **World** — `GRAV`, `FLOOR_Y()`, and a `STAGES` table (Skyline/Towers/Battlefield). Each stage is a `layout(floorY, w, H)` function returning 4 platforms; `platforms()` dispatches to `STAGES[chosenStage]`. Vertical gaps are viewport-capped (`Math.min(absolutePx, H*frac)`) so layouts keep desktop spacing but compress on a short phone-landscape screen. `PLATS` is recomputed on resize/stage-change, so anything reading platform geometry must read `PLATS` each frame (don't cache). `chosenStage` is initialized to 0 before `safeGet` exists, then reassigned from storage — `STAGES`/`chosenStage` must stay defined before the first `platforms()` call to avoid a TDZ error.
3. **Input** — Inputs merge into two structs, `input.p1` and `input.p2`. Sources: keyboard (`keys` map), a virtual joystick (`touchVec`), the four touch buttons, and gamepad slots 0–3 (`gpFrame[0..3]`, polled once per frame at the top of `loop()` so subsequent reads in `updateFighter` are stable). The `_jPress`/`_aPress`/`_sPress` "edge" flags are set on press and consumed (`= false`) inside `updateFighter` — preserve this consume-on-read pattern when adding new inputs. In `'2p'` mode P1 ignores arrow keys so P2 can use them; that gate is at the top of the `control === 'p1'` branch.
4. **Characters & Fighter** — A `CHARACTERS` table (BOLT/TANK/NYX/EMBER) tunes `weight` (knockback resistance), `speed` (accel + cap), `jump` (velocity), and `power` (outgoing damage); 1.0 is the baseline the move table was tuned against. `chosen.{p1,p2}` (persisted) index into it and are set by the character-select modal. `makeFighter(opts)` takes `opts.char`, copies its color/headColor and stores `f.stats`; those stats feed movement, jump, `applyKnockback` (weight divides launch, power multiplies damage). `P1` and `P2` are the only two instances. P2 is dispatched as `updateFighter(P2, P2.isAI ? 'ai' : 'p2')` — the `control` arg switches input source inside `updateFighter`, so AI logic lives alongside player logic, not in a separate module. AI difficulty is `settings.difficulty` (`'easy' | 'normal' | 'hard'`) and tunes attack/jump/shield/grab probability, reach, and smash-threshold inside the `'ai'` branch.
5. **Combat data model (`MOVES`)** — 13 moves: 12 attacks (`jab`, `ftilt`/`utilt`/`dtilt`, `fsmash`/`usmash`/`dsmash`, `nair`/`fair`/`bair`/`uair`/`dair`) plus `grab` (`ignoreShield`/`grab` flags — beats shields, long recover makes a whiff punishable). Entries carry `startup/active/recover` frame timing, hitbox offsets (`dx`/`dy`/`w`/`h` relative to fighter center, mirrored by `facing` unless `bothSides`), launch angle (auto-mirrored by `facing`), damage, base knockback, and KB scaling. `selectMove()` picks an attack from current `mx`/`my` and `onGround`; `grab` is chosen explicitly (shield + light attack on the ground), not by `selectMove`. `hitboxFor()` and `applyHits()` both read this table. The `balance-reviewer` subagent in `.claude/agents/` reads it to flag outliers.
   - **Defensive/movement mechanics** live in `updateFighter`, not `MOVES`: double-jump (`f.jumps`), fast-fall (hold down airborne → `vy` jumps to 22), and a dodge system fired on the shield-press edge (`f._shieldPrev`) + direction — grounded roll/spot-dodge and neutral air-dodge, each setting `f.dodgeTimer` + i-frames (`f.invul`). `dodgeTimer > 0` zeroes `canControl` and blocks `applyKnockback`. Combos: `applyHits` increments `attacker.combo`/`comboTimer` on each landed hit and announces at 3+.
6. **Effects / Audio** — Three independent capped pools share the draw loop: `spark()` → `particles[]` (debris), `pushRing()` → `rings[]` (expanding stroked impact circles, attacker-tinted via `hexToRgba`), and `pushGhost()` → `trailGhosts[]` (semi-transparent silhouette streaks dropped during heavy knockback). Each pool has a hard cap (`RING_MAX`, `GHOST_MAX`) enforced inside its push helper, and all three are cleared in `startGame()`. Audio is a lazy WebAudio synth (`audioInit()` is called from the Start button click to satisfy autoplay policy); `tone()` and `noise()` are fire-and-forget. Master gain is scaled by `settings.sfxVol` and live-updates via `applySfxVol()`.
6.5. **Items** — `items[]` holds pickups spawned during play (gated by `settings.items`). `updateItems()` (called each non-hitstop frame) spawns on a timer, applies gravity + one-way platform landing, despawns, and resolves pickup on fighter overlap via `applyItem`: `heart` heals −30%, `star` grants ~5s invul, `bomb` is an AoE launch hitting everyone in radius (including the grabber). `drawItems()` renders them between platforms and fighters.
7. **Game state** — `gameState` is `'menu' | 'playing' | 'end'`; a separate `paused` boolean gates fighter updates while the pause modal is open (the canvas still redraws each frame). `gameMode` (`'cpu' | '2p'`) decides whether P2 is AI or human. `settings.matchType` is `'stock'` or `'time'`: stock decrements `f.stocks` on KO and ends at 0; time runs a `timeLeft` countdown with endless respawns, scores `f.koCount`, and resolves via `endTimeMatch()`. All of `gameMode`, `chosen`, `chosenStage`, and the `settings` blob persist via `safeGet`/`safeSet` localStorage wrappers (raw `localStorage` can throw in sandboxed previews — always go through the wrappers). The HUD is plain DOM (`#pct1`, `#stocks1`, `#timer`, etc.) updated each frame by `refreshHud()` (shows the clock + KO counts in time mode), not drawn on the canvas. The `settings` object (stocks, difficulty, matchType, timeLimit, items, SFX volume, shake, hitbox debug) feeds `makeFighter`, `doShake`, the AI block, items, and the audio master gain.
8. **Physics** — `landOnPlatforms(f, prevY)` does swept top-of-platform collision using the previous frame's Y; if you change movement integration, also update what's passed as `prevY`. `applyKnockback(target, dmg, angle, base, scaling, attacker, ignoreShield)` is the smash-style percent-scaled launch formula: damage scales by `attacker.stats.power`, launch divides by `target.stats.weight`, `ignoreShield` lets grabs bypass shields, and it early-returns when the target has `invul` or `dodgeTimer`. It also spawns the impact ring (tinted by `attacker.color`), so pass the attacker through. `hitboxFor()` returns the active attack AABB; `applyHits()` is called twice per frame (P1→P2, P2→P1).
9. **Draw** — Order matters and is layered for visual punch: parallax background (`drawStars`/`drawClouds`/moon, all offset by `bgParallax(depth)` which tracks the fighters' average X) → platforms → items → trail ghosts (behind fighters) → fighters → particles → impact rings (above particles) → flash overlay. Screen shake is applied via `ctx.translate(shx, shy)` around the whole world draw, inside a `save`/`restore`. `drawFighter()` layers cosmetic-only animation on top of the AABB: idle breathing/arm sway when calm+grounded (`attackTimer === 0 && hitstun === 0 && onGround && knockoutAnim === 0`), a hit-react tilt + white flash scaled from `hitstun`/`vx`, and a torso `damageTint(color, pct)` that shifts toward orange as percent climbs. None of these change `f.x/f.y/f.w/f.h`. `bgParallax`, `drawStars`, and `drawFighter` all guard against `P1`/`P2` being undefined so the background still renders on the menu/end screens.
10. **Main loop** — Single `requestAnimationFrame(loop)` chain. `hitStop` freezes updates (not draws) for impact frames; `shake` and `flashTimer` decay each frame.

### Coordinate / scaling notes

- Logical coordinates are CSS pixels; `ctx.setTransform(DPR, …)` in `resize()` is what makes the canvas crisp. Don't multiply by `DPR` manually when drawing.
- Most layout constants are viewport-relative (`W*0.35`, `H*0.78`). When adding entities, keep them relative so the game stays playable across phone/desktop without a resize handler.

### Input edge-trigger pattern

Press-once actions (jump, attack, smash) use a paired `keys[...] && !prev` style via the `_jPress` flag set in keyboard/button handlers and cleared inside `updateFighter`. Continuous actions (movement, shield hold) read the live state directly. Mirror this split when extending controls.

## Project automation

- **Hook** — `.claude/settings.json` runs `.claude/scripts/post-edit-parse-check.mjs` after every `Edit`/`Write`/`MultiEdit`. The hook only acts when the edited path ends in `BRAWL ARENA.html`; on parse failure it blocks with a `{decision:"block", …}` message so the editing session self-corrects before reload.
- **Skill** — `/playtest` (defined in `.claude/skills/playtest/SKILL.md`) wraps the parse-check plus a headless Chromium screenshot. Output goes to gitignored `.claude/skills/playtest/out/`.
- **Subagent** — `balance-reviewer` (`.claude/agents/balance-reviewer.md`) reads the `MOVES` table and flags outliers (off-envelope damage/KB, frame-budget mismatches, misplaced `spike` flags). Read-only.
- **MCP servers** — `.mcp.json` declares Playwright and GitHub MCPs at project scope. They're picked up when Claude Code starts in this repo (with `enableAllProjectMcpServers: true` in `settings.json`).
