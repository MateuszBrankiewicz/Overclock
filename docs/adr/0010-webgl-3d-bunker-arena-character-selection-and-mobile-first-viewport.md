# 10. WebGL 3D Bunker Arena Character Selection and Mobile-First Viewport

Date: 2026-11-11

## Status

Accepted

<!--
Allowed values (validated by scripts/check-docs.sh):
  Proposed | Accepted | Rejected | Deprecated | Superseded by [NNNN](NNNN-title.md)
Optional extra line: "Amends [0002](0002-technology-stack-and-modular-monolith.md)".
-->

## Context and Problem Statement

The initial gameplay interface in `OperatingTable.tsx` used a vertical stack of flat 2D panels with a single CSS `rotateX(20deg)` transform on the central table div. Reviewing the interface against product goals exposed three major UX and technical limitations:

1. **Flat Visual Presentation ("Paper-Craft" Limitation):** CSS 3D transforms only tilt flat DOM rectangles. They cannot render volumetric 3D operator rigs seated around a table, real-time point/spot lighting, cast shadows, metallic PBR reflections on PCB traces, or a first-person camera that pans toward active opponents and zooms into the central high-voltage capacitor cylinder.
2. **Lack of Player Identity & Character Selection:** Players were represented solely as text nicknames inside flat boxes (`OpponentSeats.tsx`), lacking selectable Cyber-Rig operator avatars with idle, bluff, card-throw, and electrocution animations around the table.
3. **Broken Mobile Ergonomics (Vertical Scroll Fatigue):** Stacking the header, room bar, 3 opponent boxes, 300px table, turn banner, telemetry, and wrapped card hand exceeded 1,350px in height. Mobile players had to scroll vertically during live 15-second turns instead of operating within a locked `100dvh` thumb-friendly arena.

## Decision Drivers

* **Visceral 3D Immersion:** Deliver a genuine 3D underground bunker table (inspired by *Buckshot Roulette* and *Inscryption*) with volumetric lighting, camera choreography, 3D character rigs, parabolic 3D card flights, and a 3D rotating 6-chamber dielectric revolver/capacitor.
* **Instant Load Time (Zero External Mesh Bloat):** Preserve the zero-asset-download advantage from the PCB card design by constructing 3D characters, the operating table, PCB packets, and the capacitor cylinder procedurally in code using Three.js geometries, canvas textures, and PBR materials.
* **60 FPS Mobile Performance & Touch Ergonomics:** Fit the entire active match into a single `100dvh` viewport on smartphones with adaptive device pixel ratio (`dpr={[1, 1.5]}`), arched card fan, swipe-up-to-transmit touch gestures, and thumb-zone action buttons.
* **Deterministic Testability:** Ensure JSDOM/Vitest component tests run without WebGL context crashes via clean capability detection and fallback rendering.

## Considered Options

1. **Option 1: Pure CSS 3D Transforms (`preserve-3d`) + SVG Sprites:**
   - *Pros:* Zero new npm packages.
   - *Cons:* Looks flat and sparse ("cardboard cutouts"), lacks real dynamic lighting/shadows, and cannot support true 3D camera POV transitions or volumetric character rigs.
2. **Option 2: Heavy External 3D Asset Pipeline (Blender `.glb` + Texture Maps):**
   - *Pros:* High polygon detail.
   - *Cons:* Multi-megabyte downloads, long initial loading screens on mobile networks, and high GPU memory pressure.
3. **Option 3: Procedural WebGL 3D Engine (`three` + `@react-three/fiber` + `@react-three/drei`) with Hybrid 2D Mobile-First HUD (Chosen):**
   - *Pros:* True 3D spatial scene with dynamic lights, shadows, camera choreography, and procedural Cyber-Rig characters seated around the table; zero external `.glb` download latency; crisp HTML/Tailwind HUD overlay for mobile readability and touch controls.

## Decision Outcome

Chosen Option: **Option 3**, introducing a procedural Three.js / React Three Fiber 3D Bunker Arena paired with a locked `100dvh` mobile-first HUD and Cyber-Rig character selection.

### 1. New Frontend Dependencies (Amends [ADR 0002](0002-technology-stack-and-modular-monolith.md))

Add the following packages to `frontend/package.json`:
* `three` and `@types/three`
* `@react-three/fiber`
* `@react-three/drei`

### 2. Selectable Cyber-Rig Operator Characters

Players can select from 4 procedural 3D Cyber-Rig archetypes before joining/creating a room and inside the Lobby:
* **`ghost` (`GHOST-01 // NETRUNNER`):** Sleek angular visor with animated LED matrix eyes, emerald/gold trim, stealth hood geometry.
* **`volt` (`VOLT-9 // HEAVY SPLICER`):** Industrial dielectric helmet with dual shoulder Tesla coils that arc with increasing intensity as `riskLevel` climbs from 1 to 6.
* **`proxy` (`PROXY-X // SYNTH-ANDROID`):** Translucent cranial dome exposing a pulsing neural core and cyan liquid-cooling tubes.
* **`null` (`NULL-404 // CORRUPTED BORG`):** Asymmetric CRT faceplate with scanline static, crimson optic lens, and glitch jitter animations.

Each seat around the 3D table renders its operator rig with state-driven animations:
* **Idle & Breathing:** Subtle torso breathing, head tracking toward the `activePlayerId` seat.
* **Card Transmission:** Mechanical arm extension and parabolic 3D card flight from the player's seat Position `(x, y, z)` into the central bus stack.
* **Call Trace (`BluffCheck`):** Camera zooms to the table center, overhead spotlight turns crimson/amber, and a laser diagnostic beam scans the revealed 3D cards as they flip `180deg` in 3D space.
* **High-Voltage Discharge (`VoltageTest`):** A 3D 6-chamber dielectric cylinder rises at the center of the table, spins with physical momentum, and fires a 3D electric arc toward the tested seat. On overload, the character rig sparks, slumps in blackout, and emits rising particle smoke.

### 3. Mobile-First Viewport Architecture (`100dvh`)

* **Full-Screen Arena Layout:** During active room states, the game switches to a locked `h-[100dvh] overflow-hidden` layout on mobile and desktop with the 3D WebGL Canvas filling the background stage and a pointer-safe 2D HUD overlay on top.
* **Interactive Camera & Parallax:** Touch-drag on the upper stage or mouse movement gently orbits/tilts the 3D POV camera so mobile players can inspect opponents' rigs, risk coils, and hand counts around the table, alongside quick camera-focus pills (`Overview`, `Table`, `Opponents`).
* **Arched Card Fan & Touch Gestures:** The player's hand is arranged in an ergonomic arched fan at the bottom of the screen. Cards support tap-to-select, swipe-up / drag-to-table transmission, and optional haptic feedback (`navigator.vibrate`).

### Enforcement

1. **Documentation & ADR Linting:** `bash scripts/check-docs.sh` validates ADR numbering, status synchronization in `docs/adr/README.md`, and link integrity.
2. **Type Safety & Zero `any`:** `npm run typecheck` and `npm run lint` enforce strict TypeScript types across all Three.js scene components, character rig configurations, and Zustand store slices without `@ts-ignore` or `any`.
3. **Automated Vitest Suite:** Component tests in `frontend/src/features/game/components/` verify character selection, mobile HUD controls, and graceful WebGL fallback rendering in headless JSDOM environments via `bash scripts/verify.sh --fast`.

## Consequences

### Positive

* Delivers a genuine 3D tabletop atmosphere with dynamic lighting, volumetric character presence, and cinematic animations on both desktop and mobile browsers.
* Eliminates mobile vertical scrolling during matches through a dedicated `100dvh` hybrid 3D/HUD layout.
* Zero external 3D model files required — 100% procedural meshes keep bundle loading fast and deterministic.

### Negative

* Increases frontend JS bundle size due to `three` runtime (mitigated by code-splitting/procedural geometry without heavy external asset loaders).
* Requires a WebGL capability check so headless test runners (JSDOM) and restricted browsers cleanly render the fallback stage.
