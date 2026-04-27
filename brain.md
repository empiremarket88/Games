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
  - **Oak Crusader** -> Hired at the Siege Workshop (x=290) for 150 Gold + 20 Wood.
- **Healing**: Player uses `Wheat` resource to heal injured units via proximity-based interaction (`[H]` key).
- **Trebuchet Repair**: `[H]` near a damaged trebuchet consumes 10 Wood and restores 60 HP (priority over wheat-healing).
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
- **Nested Rotation Matrix for Sling Tip** (`_getSlingTip`): When a secondary body (sling) is attached to a rotating primary body (trebuchet arm), the sling's own rotation must be composed on top of the arm's world rotation. Use a full 2D rotation matrix application for both the local offset and the final world-space transform. Skipping this causes a "second bounce" artifact where the projectile spawns offset from the visual sling tip.

### 3. Polish & Immersion
- **Spawning Vectors**: Initializing grounded units at `world.groundY - offset` instead of `0` (sky) creates an immersive "exiting building" effect. Combining this with a `spawnWalkTimer` makes recruitment feel like a natural part of the world rather than a game event.
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
- **Commodity AI Loop**: Specialized units (Hunters/Workers) should utilize a state-driven prioritized search. Hunters specifically prioritize Threats (Enemies) -> Opportunities (Wildlife) -> Commodities (Dropped Meat). Implementing a "Return Threshold" (e.g., carrying 3 meat) prevents units from roaming too far into dangerous territory.
- **Constructor Initialization Order (Silent Crash Bug)**: When a constructor references `this.X` before `this.X` is assigned, JavaScript throws a `TypeError: Cannot read properties of undefined`. This crash is *silent* to the user — UI buttons appear unresponsive because the function that should run on click (`_initGame`) crashes internally before completing. **Rule**: Never reference `this.entity.property` inside a constructor before that entity is created. Use the known hardcoded value (e.g., `1150` for outpost X) or restructure the initialization order.
- **Duplicate Class Method Bug**: Defining the same method twice inside a JS class body (e.g., `_toGameOver()`) silently overwrites the earlier definition. Worse, depending on placement, it can corrupt the class prototype and cause seemingly unrelated methods to fail. **Rule**: Always search for duplicate method names (`Select-String '_methodName' app.js`) when debugging unexpected class behavior.

## 📱 Mobile Architecture (v2.0 - Mobility Update)

### 1. Input Virtualization (Touch-to-Key Bridge)
To support mobile controls without rewriting game logic, a "Virtual Input" layer was implemented.
- **Key Bridge**: The `Input` class was extended with `externalKeys{}` and a `setKey(code, state)` method.
- **Simulated Triggers**: Mobile buttons use `touchstart/touchend` to trigger `setKey`, which updates the same state used by the `KeyboardEvent` listeners.
- **Benefit**: This allows the game's movement and building logic to remain platform-agnostic.

### 2. Gesture-Locked APIs (Fullscreen & Audio)
Modern mobile browsers (like Chrome) block `AudioContext` and `requestFullscreen` until a user gesture occurs.
- **Bootstrapper Pattern**: A "Start Game" overlay (modal) provides the necessary gesture. Clicking "Enter Kingdom" simultaneously initializes the `SoundFX` context and enters the `Fullscreen` API.
- **Orientation Lock**: CSS media queries (`orientation: portrait`) are used to display rotation hints, as programmatic orientation locking is inconsistent across mobile browsers.

### 3. Responsive Scaling & UI
- **Viewport Fit**: Using `viewport-fit=cover` in the meta tag ensures the game fills the screen on devices with notches (Safe Areas).
- **Glassmorphic Controls**: UI buttons use `backdrop-filter: blur()` and semi-transparent backgrounds to maintain visibility of the game world while providing large hit-boxes for thumbs.

## 🏰 Enemy Infrastructure & AI

### 1. Enemy Command Camp (Objective-Based Design)
The enemy camp at `x=5000` serves as both a narrative waypoint and a mechanical anchor for waves.
- **Multi-Layered Visuals**: Uses a combination of `radialGradients` for "Charred Ground" and "Shadow Lanterns", while `ellipse` rotations create a swirling "Void Portal" effect.
- **Destruction Logic**: Transitions to a "Ruined" state with separate drawing paths for rubble, providing permanent visual progression once the mid-game objective is cleared.
- **Wave Anchoring**: Dynamically calculates `spawnX` based on the camp's health. If the camp is alive, enemies originate from the portal; if destroyed, they spawn from the world edge (`4000`).

### 2. Guard AI (Stationary Defense / Sentinel Pattern)
Implemented a "Return-to-Post" behavior for enemy units to prevent kiting exploits.
- **Property-Driven AI**: The `guardX` property allows a generic `Enemy` to behave as a sentinel.
- **Aggro Range**: Guards now have a detection limit. They will ignore targets (Player/Units/Outpost) unless they are within **450px**. This prevents guards from leaving their camp to chase distant players.
- **Logic**: If no target is within the 450px aggro range, the unit checks its current `x` against `guardX`. If the distance is >40px, it walks back to its post at 70% speed.
- **Benefit**: This creates distinct "Boss Mini-Zones" and prevents the game from becoming a global chase. Guards will stay tethered to their objective.

### 4. Stretchable Graphics (Vertical Realignment)
Handled the challenge of responsive resizing in a ground-based coordinate system.
- **Problem**: When the browser window is resized, `groundY` changes. Static objects (buildings/trees) normally stay at their original Y, causing them to float or disappear.
- **Solution**: Implemented a `lastGroundY` tracking system in the `World` update loop.
- **Realignment Hook**: If `groundY` changes, the engine triggers `_realignVerticalContent(dy)`. This method iterates through every active array (Units, Buildings, Trees, Items) and applies the vertical delta (`dy`) to their `y` coordinate.
- **Benefit**: This allows the game to be played fluently while stretching the window or switching between mobile device orientations without any visual glitches.

### 5. Retaliation & Wave Orchestration (v2.5)
The Enemy Command Camp is no longer a passive objective.
- **Hit-Counter Logic**: Implemented `hitCounter` and `hitsToSpawn` (randomized 3-5) logic. This triggers a "Retaliation Wave" (2x Minions, 1x Archer) whenever the camp is under player/soldier attack.
- **Defensive Guard Exclusion**: Initial camp guards are excluded from the `waveActive` check. This ensures the Blood Moon doesn't remain "active" forever due to stationary camp sentinels.

---

## 🛠 Project Roadmap & Versioning
- **v1.8**: Inferno Upgrade (Flame Hammer, Dialogue Polish).
- **v1.9**: Fauna & Frontiers (Hunter Unit, Meat Economy, Enemy Base Camp).
- **v2.1**: Control Unification (Contextual 1, 2, 3 Mapping, Streamlined Mobile UI).
- **v2.6**: Kingdom Security (Alarm Bell, Building Vulnerability, Defense AI Overhaul).
- **v3.0**: Siege Warfare (Oak Crusader Trebuchet, Siege Workshop, SiegeRock ballistics).

---

## 🏗 Key Patterns & Architecture

### 1. Contextual Unified Controls (v2.1 → v3.0)
Streamlined the game's interaction model by consolidating context-sensitive actions into the primary number keys (`1`, `2`, `3`).
- **Mapping Strategy**:
    - **Resource Shop**: `1` (Wood), `2` (Wheat), `3` (Meat). Tap for 1 unit, Hold(2s) for all units.
    - **Upgrade Zones**: `1` triggers Farm or Town updates.
    - **Recruitment**: `1` (Soldier/Worker/Trebuchet), `2` (Archer/Hunter).
    - **Trebuchet Control** (within 100px): `1` Forward, `2` Retreat, `3` Launch.
- **Priority Hierarchy**: Trebuchet proximity > Siege Shop > Sell Shop > Outpost > Farm > Barrack > Refuge.
- **Design Intent**: Reduces button bloat on mobile and keyboard travel on desktop.

### 2. Town Security & Alarm Systems (v2.6)
Implemented the **Alarm Bell** to manage civilian safety during raids.
- **Trigger**: Key `2` when near the Town Hall (Level 2 Outpost). Features a rhythmic triple-beep ("ding ding ding").
- **Shelter Behavior**: `Worker` and `Hunter` units respond to `world.alarmActive` by switching to `walk_to_shelter` states.
- **Auto-Resumption**: Units reset to `idle` upon alarm deactivation, allowing standard AI loops to resume tree chopping or hunting.

### 3. Kingdom Defense AI (Building Vulnerability)
Enemies now treat infrastructure as tactical targets.
- **Expanded Targeting**: Enemies now include `Farms`, `Barracks`, and `Archers` in their search loops.
- **Projectile Collision**: `Arrow` physics were updated with wider **60px** collision radius for buildings.

### 4. UI Consistency & Precision
- **Standardized HP Bars**: Units (30px), Friendly Buildings (60px), Boss Objectives (120px).
- **Save/Load Integrity**: `maxHp` values are dynamically restored during `_loadGame` to prevent UI overflow bugs.
- **HUD Safeties**: Switched X/Y coordinate draw to `y=75` to clear mobile utility buttons.

### 5. Siege Unit Architecture (v3.0)
The `Trebuchet` class introduced a new pattern for **vehicle-class units** that are manually operated rather than AI-driven.
- **State Machine**: `idle → move/retreat → cocking → charging → release → follow`. States flow sequentially and cannot be interrupted mid-sequence.
- **Embedded Actor**: The crew soldier is rendered by `_drawSoldier()` directly inside `Trebuchet.draw()`, keeping the pusher visually attached to the machine.
- **Projectile Hand-off**: `_getSlingTip()` uses a nested 2D rotation matrix to compute the world-space coordinate of the sling's release point at the exact moment of launch — preventing the "second bounce" misalignment artifact.
- **Rolling Physics**: `SiegeRock` uses `Math.pow(0.5, dt)` exponential drag for deceleration that is frame-rate independent and physically plausible.
- **Unified Heal Dispatch**: `_healAll()` checks trebuchet proximity and resource type (Wood) first, then falls back to unit healing with Wheat.

## 🐉 Wyrmwing Procedural Animation (Dragon Preview)

### 1. Kinematics & Wing Anatomy
- **3D Sweep Illusion in 2D**: Instead of rigidly swinging a wing back and forth on a 2D plane, sweeping the wing's base angle from *up* to *down* across the Y-axis simulates 3D perspective foreshortening. Drawing the front wing *after* the body and the back wing *before* the body completes the illusion of the wings wrapping around the creature.
- **Dynamic Finger Spreading**: Binding the fan spread of the wing fingers to the `-Math.cos(phase)` of the flap cycle creates a realistic "air-catching" effect. Fingers spread wide on the downstroke to catch air and fold tightly on the upstroke to reduce drag.
- **Kinematic Ripple**: Offsetting the sine wave phase across the joints (shoulder -> elbow -> wrist -> fingers) creates a natural, organic whip-like motion, avoiding stiff, mechanical flapping.

### 2. Rendering & Aesthetics
- **Organic Joints**: Mechanical ball-and-socket joints look rigid. Replacing them with radial gradients that match the surrounding skin colors, combined with subtle offset crescent highlights, creates the appearance of natural, muscular joints.
- **Leathery Skin Gradients**: Replacing transparent fills with opaque radial gradients provides a deep, solid feel to wing membranes. `isFront` booleans can toggle opacity slightly to simulate light bleeding through the front wing vs the back wing.
- **Horizontal Flipping with Context**: Using `ctx.scale(-1, 1)` globally at the start of the `draw()` method is an elegant way to horizontally mirror a complex procedural creature without altering any of the local kinematic math or joint connections.

### 3. Dynamic Particle Systems
- **Orientation-Aware Particles**: When emitting particles inside a flipped context (`scale(-1, 1)`), physical velocities like `vx` visually invert. So a particle moving left (`vx < 0`) in code will correctly trail behind the dragon (visually right) when the dragon is horizontally flipped.
- **State-Driven Emmitters**: Tying particle emission and specific limb animations to a `fireCycle` timer creates cohesive multi-part actions (e.g., smoothly tilting the head down 45 degrees while simultaneously switching to fire-breath particle emission).
