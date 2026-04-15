# Project Brain - Pocket Kingdom

This document serves as a repository of technical knowledge, patterns, and skills developed during the Pocket Kingdom game expansion.

## Core Architecture

### 1. Entity-Component Pattern
The game uses a class-based system for all entities (Units, Enemies, Buildings, Projectiles).
- **Update Loop**: `update(dt)` handles physics, AI, and state timers.
- **Draw Loop**: `draw(ctx, cam)` handles rendering. It uses the `cam` object to translate world coordinates to screen space.
- **Hit Feedback**: The `applyHitGlow` and `triggerHitGlow` functions provide visual feedback without expensive filters, using pulse math.

### 2. World Coordinate System
- Ground level is defined by `world.groundY`.
- Units and structures are positioned relative to this baseline.
- Physics uses a standard `vx`, `vy` system with gravity (`1200 * dt`).

## Graphics Parity System

One of the key technical achievements was the 1:1 graphics preview tool.
- **Logic Injection**: `preview_graphic_overall.html` imports `app.js` directly.
- **Mock Dependencies**: A `MockWorld` object is passed to constructors to satisfy dependencies (like `this.world.enemies`) without requiring the full game state.
- **Loop Protection**: `app.js` was modified to only start the main loop if `#gameCanvas` is visible and exists, allowing it to be used as a library for the preview.

## Visual Design Patterns

### 1. Procedural Animation
- **Walking**: Sine-wave based "bobbing" (`Math.abs(Math.sin(time * frequency)) * amplitude`).
- **Swinging**: Arcs driven by `attackTimer` and `Math.sin(p * Math.PI)` for smooth forward-and-back motions.
- **Flipping**: Using `ctx.scale(-1, 1)` and `ctx.translate(width, 0)` for horizontal mirroring of sprites.

### 2. Environment & Deco
- **Layering**: Clouds (background) -> Decorations (grass/flowers) -> Buildings -> Units -> Projectiles (foreground).
- **Dynamic Deco**: Randomly generated `Decoration` objects to fill the "negative space" of the ground layer.
- **Organic Redrawing**: Moving from simple geometric placeholders (triangles) to layered clusters of primitives (arcs/ellipses) for trees and environment to create a more organic aesthetic.

## Game Mechanics

## Hero & Unit Skills

### 1. Flame Hammer (Charged Attack)
- **Charging Mechanic**: A hold-to-charge system requiring 1.0s of maintained input (`KeyE`).
- **Logic**: Managed via `hammerChargeTimer` in `Character.update`. At threshold, triggers an `action` state and instantiates a `HeroFireball`.
- **UI Feedback**: A dynamic horizontal progress bar drawn below the player's feet (`sy + 58`), using `hsl` color shifting to indicate charge completion.
- **Weapon Visuals**: Uses `chargeRatio` to multiply the `pulse` intensity of the hammer head's lava cracks and increase the frequency of ember particles.

### 2. Specialized Projectiles (HeroFireball)
- **Targeting**: Specifically iterates through the `world.enemies` array, contrasting with standard `Fireball` which targets the player's kingdom (100% DMG parity for enemies).
- **Aesthetics**: Features a trailing flame oscillation based on a sine-wave offset and a high-intensity radial gradient for the "impact" core.

### 3. Advanced Hiring & Deployment
- **Proximity-Based UI**: Removed redundant `[E]` prompts. UI appears automatically via proximity detection in `World.update`.
- **Direct Input**: Mapped hiring to `Digit1` and `Digit2` for instant recruitment.
- **Ground-Level Spawning**: Units initialize at `world.groundY - 60`. Combined with `spawnWalkTimer`, this creates an immersive "walking out of the door" animation.

## Game Mechanics

- **Hiring Flow**: 
  - Village NPCs (Refugees) -> Hired as Workers or Hunters at the Refuge Tent.
  - Soldiers/Archers -> Hired at the Barracks, initially assigned a `guardX` position 600-700 pixels into the defensive perimeter.
- **Healing**: Player uses `Wheat` resource to heal injured units via proximity-based interaction (`[H]` key).
- **Environmental Interaction**: 
  - Entities like `Bird` can be "tethered" to world objects like `ForegroundTree`.
  - Triggering global state changes (like chopping a tree) can signal these sub-entities to change states (e.g., from `perched` to `flyingAway`).

## Project Learnings & Bug Fix Lessons

### 1. Canvas State & Rendering Stability
- **Transform Safety**: In complex nested draws (like Hammer UI), `ctx.restore(); ctx.save();` logic is fragile. It is safer to use `ctx.save()` followed by `ctx.setTransform(1, 0, 0, 1, 0, 0)` to reset to screen-space coordinates and then explicitly `restore()` at the end of the sub-routine.
- **NaN Loop Protection**: A single `NaN` passed to a drawing function (like `fillText` or `arc`) can stall the entire `requestAnimationFrame` loop. Always ensure UI position variables are fully defined before use, especially when remapping layout coordinates.

### 2. Physics-Visual Parity
- **The "Leading Edge" Rule**: When animating swings (like the King's axe), the blade must stay on the leading edge of the rotation. Misalignment causes "handle-hitting," where it looks like the unit misses even if the collision box overlaps.
- **Animation Syncing**: The `actionTimer` should dictate the visual progress (0→1) of a swing to ensure the frame-data and the visual "impact" happen simultaneously. Standardizing on a 0.5s duration for heavy attacks provides a consistent "weight" to the weapon.

### 3. Polish & Immersion
- **Spawning Vectors**: Initializing grounded units at `world.groundY - offset` instead of `0` (sky) creates an immersive "exiting building" effect. Combining this with a `spawnWalkTimer` makes recruitement feel like a natural part of the world rather than a game event.
- **Input Streamlining**: Transitioning from interaction gates (like `[E] to open menu`) to proximity-based triggers makes gameplay feel significantly faster. User experience is greatly improved when players can perform actions (like hiring or selling) with a single keypress once within range.


## ⚔️ Recent Features (v1.8 - Inferno Upgrade)
- **Flame Hammer (Hybrid Attack)**: A tiered weapon system.
  - **Single Tap**: Fast melee strike / tree-chopping action.
  - **Hold (1.0s)**: "Inferno Focus" state. Launches a `HeroFireball` (75 DMG) that tracks enemies.
- **Inferno Graphics**:
  - Pulsing additive-blended aura (`lighter` mode).
  - Procedural "Flame Licks" and upward heat embers.
- **NPC Social System**:
  - Proximity detection allows NPCs to face each other and discuss Kingdom affairs.
  - Expanded dialogue including "Hammer Hints" and the "Stinis Developer" joke.
  - Polished rounded speech bubbles with tails.
- **Improved Recruitment**: Soldiers [1] and Archers [2] are now hired exclusively via number keys to prevent accidental E-action gold expenditure.

### 4. General Architecture & Safety
- **Tool Selection**: Standard Canvas API shapes (`ellipse`, `arc`, `roundRect`) remain more performant and flexible for chibi-style graphics than heavy texture loading.
- **Particle Logic**: Using a `type` parameter in the `Particle` class allows for varying physics (e.g., sine-wave fluttering for leaves vs. gravity for wood chips) without bloating the codebase with new classes.
- **Coordinate Consistency**: Standardizing on a `cam.x` offset for all world-space drawing is critical for parallax stability.
- **Preventing "Bracket Overflow"**: In deeply nested structures (like weapon animations), an extra `}` can prematurely close a method, leading to a dangling `else` syntax error. This fails the entire script, often manifesting as a blank or corrupted screen. **CRITICAL**: Always perform a manual bracket count (Open vs Close) after any edit to the `draw` routine.
- **Hybrid Input Detection**: When implementing "Tap vs Hold" mechanics, avoid triggering actions on the `keydown` event. Instead, move the "Tap" logic to the `keyup` (or `justReleased`) event. This allows the system to distinguish between a short press (melee) and a sustained hold (charge) without unwanted initial actions.
- **Coordinate Space Discipline**: When refactoring UI such as speech bubbles or progress bars, ensure they are rendered *inside* the entity's translated coordinate block. Drawing them after a `ctx.restore()` will cause them to render at the screen origin (top-left) instead of following the entity.
- **Articulated Actor Pattern**: For animals or units with multi-jointed limbs, use a recursive or structured `_drawLeg` helper. Always define species-specific `yOffset` variables to manage varying leg lengths across different actors (e.g., Deer vs. Rabbit) to ensure they all stand correctly on the ground plane.
- **Constructor Initialization Order (Silent Crash Bug)**: When a constructor references `this.X` before `this.X` is assigned, JavaScript throws a `TypeError: Cannot read properties of undefined`. This crash is *silent* to the user — UI buttons appear unresponsive because the function that should run on click (`_initGame`) crashes internally before completing. **Rule**: Never reference `this.entity.property` inside a constructor before that entity is created. Use the known hardcoded value (e.g., `1150` for outpost X) or restructure the initialization order.
- **Duplicate Class Method Bug**: Defining the same method twice inside a JS class body (e.g., `_toGameOver()`) silently overwrites the earlier definition. Worse, depending on placement, it can corrupt the class prototype and cause seemingly unrelated methods to fail. **Rule**: Always search for duplicate method names (`Select-String '_methodName' app.js`) when debugging unexpected class behavior.
