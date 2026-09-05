# CypherRoll 3D Master Prompt
## Dice + Rocket · Gradients · Event Color Logic · Blender/Sketchfab Frames · UI Non-Overlap · Loopholes & Fixes

> **How to use:** Paste the **MASTER PROMPT** section into Blender / Sketchfab prep / AI asset tooling. Keep this file as the single source of truth for materials, animation frames, and React UI zoning.
> **Status:** PLAN ONLY until you accept applying code/material changes in the repo.

---

## 0. Critical Bug Found (Must Fix First)

### Issue: Roll result hides the dice
In `DiceGame.tsx`, when a roll finishes (e.g. **1.14**), the result callout is:

```tsx
absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
```

That places the big number **dead-center on top of the 3D dice**. The dice and the number fight for the same screen real estate. On win/loss, the glass card (`bg-emerald-950/80` / `bg-rose-950/80`) visually buries the mesh.

### Crash is mostly OK
Crash puts the multiplier at `top-4` (header zone), so the rocket stays visible. **Dice must copy that zoning pattern.**

### Required layout rule (non-negotiable)
```
┌─────────────────────────────────────┐
│  [TITLE / BADGES]                   │  ← HUD zone A (top)
│                                     │
│         ┌───────────┐               │
│         │  3D DICE  │               │  ← Stage zone B (center, FULLY CLEAR)
│         │  ONLY     │               │
│         └───────────┘               │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ WINNER / BUST · 1.14        │    │  ← Result zone C (below mesh, or side rail)
│  └─────────────────────────────┘    │
│  [SLIDER]                           │  ← Controls zone D (bottom)
└─────────────────────────────────────┘
```

**Both must always be visible. Never stack HUD text on the mesh centroid.**

---

## 1. Gradient Material Spec (NO BLACK)

Black / near-black is **banned**: `#000000`, `#05070e`, `#070a12`, `#0a0f1d`, `#0e1424`, `#450a0a`.

### 1.1 CypherDice — PBR gradients (Blender ColorRamp / Sketchfab gradient maps)

| Slot | Role | Hex stops (gradient left → right) | Metallic | Roughness | Emission |
|------|------|-----------------------------------|----------|-----------|----------|
| **Body Base** | Face metal | `#475569` → `#334155` → `#64748B` | 0.92 | 0.14 | 0 |
| **Body Rim Catch** | Bevel highlight | `#64748B` → `#94A3B8` | 0.85 | 0.10 | 0 |
| **Circuit Edge** | Edge glow lines | `#00F0FF` → `#38BDF8` → `#22D3EE` | 0.40 | 0.18 | strength 6–12 |
| **Pips** | Dots | `#F59E0B` → `#FBBF24` → `#FDE68A` | 0.88 | 0.08 | `#FBBF24` @ 8 |
| **Scene Clear** | Backdrop (React) | `#1E293B` solid OR soft vignette `#1E293B`→`#334155` | — | — | — |

**Blender node tip:** Principled BSDF Base Color ← ColorRamp (Fac from *Pointiness* or *Layer Weight / Facing*) so edges catch lighter slate and faces stay mid-slate — reads as premium metal, never flat black.

### 1.2 CypherCrash Rocket — PBR gradients

| Slot | Role | Hex stops | Metallic | Roughness | Emission |
|------|------|-----------|----------|-----------|----------|
| **Hull** | Fuselage | `#64748B` → `#475569` → `#94A3B8` | 0.94 | 0.16 | 0 |
| **Panel lines** | Panel seams | `#94A3B8` → `#CBD5E1` | 0.90 | 0.12 | 0 |
| **Nose** | Cockpit cone | `#8B5CF6` → `#A78BFA` → `#C4B5FD` | 0.80 | 0.12 | `#A78BFA` @ 6–10 |
| **Fins** | Stabilizers | `#7C3AED` → `#8B5CF6` | 0.75 | 0.15 | `#8B5CF6` @ 4 |
| **Dock ring** | Launchpad torus | `#00F0FF` → `#22D3EE` | 0.30 | 0.20 | `#00F0FF` @ 8–14 |
| **Outer flame** | Plasma cone | `#FF6B2E` → `#FF4500` → `#FBBF24` | 0.05 | 0.08 | `#FF6B2E` @ 14–20 |
| **Inner core** | Hot core | `#FFFFFF` → `#FEF3C7` | 0 | 0 | `#FFFFFF` @ 20 |
| **Stars** | Field points | `#38BDF8` → `#7DD3FC` | — | — | — |
| **Sparks** | Exhaust | `#FFB800` → `#FDE68A` | — | — | — |

---

## 2. Event → Color Change Map (Logic-Locked)

These colors must change **with game state**, not randomly. Drive them from the same enums the React canvas already uses.

### 2.1 Dice phases (`DiceCanvas`)

| Phase | Trigger | Body gradient | Edge / circuit | Pips | Lights | Shockwave |
|-------|---------|---------------|----------------|------|--------|-----------|
| **IDLE** | `!isRolling && lastWon === null` | slate steel (default) | `#00F0FF`→`#38BDF8` | gold gradient | cyan rim `#00F0FF` | opacity 0 |
| **KINETIC_TUMBLE** | `isRolling === true` | slightly brighter slate pulse | `#FFB800`→`#F59E0B` | gold + boost emit | gold key `#FFB800` | 0 |
| **JACKPOT_VICTORY** | `lastWon === true` | slate + green rim wash | `#10B981`→`#34D399` | gold stays | emerald `#10B981` | emerald ring expands |
| **RAID_OVERLOAD** | `lastWon === false` | slate + rose tint on edges | `#EF4444`→`#F87171` | gold stays (or dim 20%) | rose `#EF4444` | 0 |

### 2.2 Rocket phases (`CrashRocketCanvas`)

| Phase | Trigger | Hull | Nose | Dock | Flame outer | Flame core | Key/rim lights |
|-------|---------|------|------|------|-------------|------------|----------------|
| **LAUNCHPAD** | `gameState === 'IDLE'` | steel slate | violet | cyan breathe | cyan pilot `#00F0FF` | small white | cyan + violet |
| **IGNITION** | `STARTING` | steel | violet + amber wash | `#FFB800` max emit | `#FFB800`→`#FF4500` | grow | amber + orange |
| **ATMOSPHERIC** | `FLYING && mult < 2` | steel | violet | hidden | `#00F0FF` | white | cyan + violet |
| **STRATOSPHERE** | `FLYING && 2–5` | steel + gold rim | violet→gold tint | hidden | `#FFB800`→`#FF4500` | white | gold + orange |
| **NEBULA_WARP** | `FLYING && 5–15` | steel + magenta rim | violet→magenta | hidden | `#EC4899`→`#8B5CF6` | white | pink + blue `#3B82F6` |
| **SUPERNOVA** | `FLYING && ≥15` | steel + white strobe | bright violet | hidden | `#FFFFFF` strobe `#FF4500` | max white | white / cyan |
| **DETONATION** | `CRASHED` | tumbling | dim | hidden | scale→0 | scale→0 | `#EF4444`↔`#F87171` (**never** `#450a0a`) |

---

## 3. Blender / Sketchfab Frame Plan (Animation ↔ Logic)

Assume **24 fps** for Blender actions. Sketchfab: use animation clips / material variants named exactly as below so React can map clips later (or bake stills + drive color in Three.js).

### 3.1 Dice — Action clips

| Clip name | Frames | Duration | Motion | Material keys |
|-----------|--------|----------|--------|---------------|
| `dice_idle` | 0–48 | 2.0s loop | slow orbit yaw +0.2°, float Y ±2cm | Edge=CYAN |
| `dice_tumble` | 0–24 | 1.0s (or loop while waiting API) | high angular velocity on XYZ; motion blur OK | Edge=GOLD, Emit↑ |
| `dice_settle_win` | 0–36 | 1.5s | decelerate to readable face; soft bounce; pulse scale 1.0→1.06→1.0 | Edge=EMERALD; shockwave frames 6–36 |
| `dice_settle_loss` | 0–24 | 1.0s | hard stop + micro shudder; slight sink | Edge=ROSE; pip emit −20% |

**Face-settle rule (logic):** After tumble, settle orientation is **cosmetic only**. True outcome is the float `0.00–99.99` from HMAC — **do not** map pip face to roll number. Showing a literal die face as “the answer” is a **fairness loophole** (see §5).

### 3.2 Rocket — Action clips

| Clip name | Frames | Duration | Motion | Material keys |
|-----------|--------|----------|--------|---------------|
| `rocket_launchpad` | 0–48 | 2.0s loop | hover ±3cm; dock ring emit sine | Flame cyan small |
| `rocket_ignition` | 0–36 | 1.5s loop | high-freq shudder ±2cm; particles | Dock+flame AMBER |
| `rocket_atmospheric` | 0–∞ driven by mult | live | climb Y with mult; wobble | Flame CYAN |
| `rocket_strato` | live | live | faster climb; longer flame | Flame GOLD |
| `rocket_nebula` | live | live | star streaks speed↑ | Flame MAGENTA |
| `rocket_supernova` | live | live | camera micro-shake | Flame WHITE strobe |
| `rocket_detonation` | 0–48 | 2.0s | tumble + fall; shockwave expand | Lights ROSE; flame off @ frame 4 |

**Sketchfab import checklist**
1. Download model → apply CypherRoll materials (replace default blacks).
2. Name meshes: `Hull`, `Nose`, `Fin_*`, `Nozzle`, `FlameOuter`, `FlameInner`, `DockRing`.
3. Create material slots matching table §1.
4. Export GLB with embedded materials; keep Draco if under budget.
5. Do **not** rely on Sketchfab baked black albedo — reassign Base Color ramps in Blender before export.

---

## 4. UI Zoning Plan (Dice + Rocket) — Both Always Visible

### 4.1 Dice (FIX)
| Zone | Placement | Content |
|------|-----------|---------|
| A Top HUD | `absolute top-2 inset-x-0` | badges only (already in panel header) |
| B Stage | center, `min-h-[260px]`, **no overlays on centroid** | `DiceCanvas` only |
| C Result dock | `absolute bottom-3 left-1/2 -translate-x-1/2` **OR** right rail `right-3 top-1/2` | `WINNER/BUST` + `1.14` + optional target |
| D Controls | below stage (existing slider) | roll under slider |

**Recommended:** Result dock **bottom-center above slider**, with `pointer-events-none`, translucent panel that does **not** cover >15% of canvas height. Dice stays fully readable above it.

Alternative (premium): Result as a **side pill** on the right of the canvas (like a HUD readout), never over the mesh.

### 4.2 Crash (keep / refine)
| Zone | Placement | Content |
|------|-----------|---------|
| A Top HUD | `top-4` center | countdown / `2.45×` (already correct) |
| B Stage | center clear | rocket mesh |
| C Crash banner | optional bottom dock on CRASHED only | `CRASHED @ Xx` duplicate for accessibility |

---

## 5. Loopholes Found → Solutions

| # | Loophole / Bug | Why it hurts | Solution |
|---|----------------|--------------|----------|
| L1 | Result overlay centered on dice | Number (1.14) hides 3D object | Move result to bottom dock / side rail (§4) |
| L2 | Near-black body materials | Looks cheap; melts into OLED bg | Slate steel gradients (§1); ban black hex list |
| L3 | Crash strobe `#450a0a` | Reads as black flash | Use `#F87171` dim phase |
| L4 | Dice face ≠ roll value | Players may think pip count = outcome → trust break | Label UI: “Outcome is HMAC float, not pip face”; settle animation cosmetic only |
| L5 | `setIsRolling(false)` in both `setTimeout` and `finally` | Race: tumble ends early before reveal | Keep rolling true until timeout reveal; remove premature `finally` clear or gate it |
| L6 | GLB from Sketchfab may ignore runtime `edgeMat` | Procedural edge colors won’t tint Sketchfab mesh | Either: (a) traverse GLB and remap materials on phase change, or (b) drive emissive on named materials `CircuitEdge` / `Hull` |
| L7 | Transparent result card still occludes | Backdrop blur blocks mesh | Non-overlap zoning; or `mix-blend` + no full-bleed card on center |
| L8 | Win shockwave expands across whole view | Can wash out dice | Cap wave scale; keep result dock outside wave origin |
| L9 | Tor / no-WebGL 2D fallback also uses dark slate boxes | Inconsistent with “no black” | Align 2D fallback borders to slate `#334155` / cyan / gold |
| L10 | Flame + sparks + stars overdraw | Performance drop on weak GPUs | Cap particle counts; reduce when `document.hidden` |
| L11 | Sketchfab license / attribution | Legal risk if redistributed | Keep license file; credit in FAQ/footer if required |
| L12 | Camera lookAt center + big HUD | HUD and mesh collide in depth perception | Camera slight upward bias; HUD outside frustum center |

---

## 6. MASTER PROMPT (Copy-Paste)

```text
You are building CypherRoll casino 3D assets (Dice + Crash Rocket) for a Next.js + Three.js WebGL stage. Brand: Dark OLED Cyberpunk, but ZERO pure black materials. Style must feel premium metallic slate + neon accents.

FORBIDDEN BASE COLORS: #000000, #05070e, #070a12, #0a0f1d, #0e1424, #450a0a, or any albedo with RGB channel average < 40.

=== DICE MATERIALS (PBR gradients) ===
- Body: ColorRamp #475569 → #334155 → #64748B, Metallic 0.92, Roughness 0.14. Use Pointiness/Facing so edges catch #94A3B8.
- Circuit edges: emissive gradient #00F0FF → #38BDF8, emit strength 6–12.
- Pips: #F59E0B → #FBBF24 → #FDE68A, emissive #FBBF24 @ 8.
- Scene clear color in engine: #1E293B (not black).

=== ROCKET MATERIALS (PBR gradients) ===
- Hull: #64748B → #475569 → #94A3B8, Metallic 0.94, Roughness 0.16.
- Nose: #8B5CF6 → #A78BFA → #C4B5FD, emissive #A78BFA @ 6–10.
- Fins: #7C3AED → #8B5CF6.
- Dock ring: #00F0FF → #22D3EE, high emit.
- Outer flame: #FF6B2E → #FF4500 → #FBBF24, high emit.
- Inner flame core: #FFFFFF → #FEF3C7.
- Never use black hull paint from Sketchfab defaults — reassign all materials after import.

=== NAME MESHES EXACTLY ===
Dice: DiceBody, DicePip_*, DiceCircuitEdge
Rocket: Hull, Nose, Fin_*, Nozzle, FlameOuter, FlameInner, DockRing

=== ANIMATION CLIPS (24fps) TIED TO GAME LOGIC ===
Dice:
- dice_idle (loop): slow float + yaw; edge CYAN
- dice_tumble (while isRolling): fast XYZ spin; edge GOLD
- dice_settle_win: decelerate + bounce; edge EMERALD #10B981; optional shockwave
- dice_settle_loss: hard stop + shudder; edge ROSE #EF4444
IMPORTANT: Pip face orientation is COSMETIC ONLY. Real outcome is HMAC float 0.00–99.99 shown in UI HUD — do not imply pip count equals roll.

Rocket:
- rocket_launchpad: hover + cyan dock breathe
- rocket_ignition (STARTING): shudder; amber dock/flame
- rocket_atmospheric (FLYING <2x): cyan flame
- rocket_strato (2–5x): gold/orange flame
- rocket_nebula (5–15x): magenta/violet flame
- rocket_supernova (≥15x): white/orange strobe flame
- rocket_detonation (CRASHED): tumble+fall; flame off; lights #EF4444 ↔ #F87171 (NOT dark maroon)

=== UI NON-OVERLAP RULE (CRITICAL) ===
Never place the roll result number (e.g. 1.14) at the center of the dice canvas. Center is reserved for the 3D mesh only.
Dice result HUD must live in a bottom dock or right side rail so BOTH the dice and the number are fully visible.
Crash multiplier stays in top HUD (already correct).

=== DELIVERABLES ===
1) GLB exports: dice.glb, rocket.glb with embedded non-black PBR materials
2) Material variant notes per phase (idle/tumble/win/loss and launch/ignition/flight tiers/crash)
3) Clip list with frame ranges
4) Confirmation that no forbidden black hex is used in any albedo
```

---

## 7. Implementation Checklist (After You Accept)

### React / UI
- [ ] Move Dice result callout off center → bottom dock or right rail
- [ ] Ensure `z-index` + `pointer-events-none` so mesh interaction/visibility stays clean
- [ ] Fix rolling state race (`finally` vs `setTimeout`) so tumble lasts until reveal
- [ ] Replace scene backgrounds `#05070e` → `#1E293B`
- [ ] Replace dice body `#070a12` → slate gradient hexes
- [ ] Replace rocket hull `#0e1424` → steel slate hexes
- [ ] Replace crash dim strobe `#450a0a` → `#F87171`
- [ ] On GLB load: traverse and remap named materials for phase colors

### Blender / Sketchfab
- [ ] Import Sketchfab model → strip black materials
- [ ] Apply §1 ColorRamps
- [ ] Name meshes per §6
- [ ] Build clips per §3
- [ ] Export GLB → `public/assets/3d/`
- [ ] Verify in Three.js with phase toggles

---

## 8. Suggested Result Dock Copy (Dice)

```
┌──────────────────────────┐
│  WINNER!                 │
│  1.14  ·  under 50.00    │
│  +$19.80                 │
└──────────────────────────┘
```
Placed under the dice, above the slider — mesh fully visible above.

---

*Source refs: `components/3d/DiceCanvas.tsx`, `components/3d/CrashRocketCanvas.tsx`, `components/games/DiceGame.tsx`, `components/games/CrashGame.tsx`, `scripts/blender_export_assets.py`*
