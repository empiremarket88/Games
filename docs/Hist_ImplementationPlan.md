# Implementation Plan History - Pocket Kingdom

## 2026-04-16 15:33 - Mobile Optimized Version
Create a dedicated mobile-friendly interface for the game in a new `Mobile/` directory.

### Proposed Changes
- **Mobile Directory**: New folder for mobile assets.
- **mobile.html**: Specialized index with viewport-fit and touch control overlays.
- **mobile.css**: Glassmorphic touch-button styles and landscape layout.
- **app.js**: Input class update to support `setKey()` from virtual buttons.
- **mobile.js**: Bridge script for Fullscreen API and touch-to-key mapping.

---

## 2026-04-16 15:33 - Stretchable Graphics Support (Responsive Alignment)
Address the issue where buildings and trees "disappear" or become misaligned when the browser window is resized.

### Proposed Changes
- **World Class**: Added `lastGroundY` tracking.
- **Vertical Re-alignment**: Implemented `_realignVerticalContent(dy)` to shift every entity (Buildings, Units, Trees) when the ground level changes.
- **Game.resize()**: Ensure canvas resizing triggers the realignment hook.

---

## 2026-04-16 15:33 - Unified Contextual Controls (v2.1)
Overhaul the interaction system to use a simplified "1, 2, 3" keyboard mapping and streamline the mobile HUD.

### Proposed Changes
- **Contextual 1, 2, 3**:
    - **Shops**: 1 (Wood), 2 (Wheat), 3 (Meat). Tap to sell 1, Hold to sell all.
    - **Upgrades**: 1 triggers Farm/Town upgrades when nearby.
    - **Recruitment**: 1/2 for Soldier/Archer or Worker/Hunter.
- **Mobile UI**: Added virtual 1, 2, 3 row; removed redundant "Upgrade" and "Town" buttons.
- **UI Label Sync**: Updated all in-game text prompts (Shop, Buildings, HUD) to use the new numerical keys.
- **Legacy Cleanup**: Removed T, U, Y mappings.

---

## 2026-04-16 15:47 - Mobile UI Refinement
Refine the mobile interface ergonomics based on usability feedback.

### Proposed Changes
- **Ergonomics**: Repositioned the numerical row (1, 2, 3) to the bottom of the action grid.
- **Scaling**: Reduced the size of the numerical buttons to minimize screen obstruction.
- **Movement Fix**: Increased the gap and adjusted the alignment of the D-Pad movement buttons for better thumb separation.

---

## 2026-04-16 15:54 - Sell All Animation Restoration
Restore visual feedback for the contextual "Hold to Sell All" action.

### Proposed Changes
- **World.draw()**: Re-implemented the circular progress bar over the Resource Shop.
- **Variable Mapping**: Connected the animation logic to the new `digit1Hold`, `digit2Hold`, and `digit3Hold` variables.
- **Clamping**: Ensured the animation handles the "trigger lock" state (-999) correctly by clamping displayed progress.

---

## 2026-04-16 23:27 - Refugee Shop Interaction Fix
Restore the ability to hire workers and hunters from the Refugee Shop using contextual number keys.

### Proposed Changes
- **World.constructor**: Added `hiringRefuge` state variable initialization.
- **World.update**: Implemented a 60px proximity check for the `refugeShop` and assigned it to `hiringRefuge`.
- **Logic Mapping**: Re-enabled the `Digit1` (Worker) and `Digit2` (Hunter) triggers when standing near the refuge camp.

---

## 2026-04-16 23:38 - Wood Wall Cost Label Sync
Update HUD and documentation to reflect the actual resource requirement for the Wood Wall.

### Proposed Changes
- **HUD (app.js)**: Changed "B Wall(30G)" to "B Wall(30 Wood)" in the bottom controls bar.
- **Documentation**: Sync the info comment at the top of the file and corrected the Barrack cost label.

---

## 2026-04-16 23:45 - Enemy Spawn Grounding & ESC Button
Improve immersion by refining enemy portal behavior and enhancing mobile accessibility.

### Proposed Changes
- **Enemy Spawning**: 
    - Updated `Enemy` and `EnemyArcher` constructors to initialize at `world.groundY - 60` (ground level).
    - Adjusted `_spawnWave` to center spawn packets at the camp portal (`this.enemyCamp.x`) instead of the sky.
- **Mobile UI**:
    - **mobile.html**: Added a virtual "ESC" button to the top utility bar.
    - **mobile.css**: Updated `#top-bar` to a flex-layout and added circular styling for the ESC button.

---

## 2026-04-16 23:55 - Enemy Camp Buff & Retaliation
Increase the difficulty of the Enemy Camp and add defensive reinforcements.

### Proposed Changes
- **HP Buff**: Increased camp HP from 1,000 to 5,000.
- **Retaliation**: Added `hitCounter` and randomized `hitsToSpawn` (3-5) to trigger 2x Minion + 1x Archer waves.
- **Label Fix**: Corrected hardcoded HP label to use `this.maxHp`.
- **Sentinel Exclusion**: Stationary camp guards no longer keep the Blood Moon active.

---

## 2026-04-17 00:15 - Town Alarm & Defense AI
Implement a player-triggered evacuation system and expand enemy targeting to buildings.

### Proposed Changes
- **Alarm Bell**: Press [2] near Town Hall for rhythmic alarm and swinging bell animation.
- **Shelter Behavior**: Workers/Hunters retreat to a safe zone on alarm.
- **Building Attacks**: Enemies target Farms/Barracks/Archers. Updated Arrow hitboxes for structures.
- **Town Buff**: Level 2 Outpost max HP set to 500.

---

## 2026-04-17 00:45 - UI/UX Polish & Save Fixes
Standardize visual feedback and resolve load-game state issues.

### Proposed Changes
- **HP Bar Standardization**: Friendly buildings (60px), Enemy Camp (120px).
- **HUD Layout**: Moved X/Y coordinates down to avoid mobile button overlap.
- **Save Fix**: Explicitly restore Outpost `maxHp` based on level during load sequence.
- **Alarm SFX**: Refined triple-beep "ding ding ding" rhythm.

---

## 2026-04-17 16:00 - Oak Crusader Siege Engine Integration (v3.0)
Port the fully refined trebuchet prototype into the main game engine with a dedicated Siege Workshop building.

### Goals
- HP: 250 | Attack: 120 splash | Cost: 150 Gold + 20 Wood
- Context-sensitive controls: `[1]` Forward, `[2]` Retreat, `[3]` Launch, `[H]` Repair (10 Wood)
- Siege Workshop at `x=290` with iron-hook aesthetic

### Proposed Changes

#### `app.js` — New Classes
- **`SiegeRock`**: Projectile with gravity, single-bounce physics, rolling drag, dust particles, and splash damage.
- **`Trebuchet`**: Siege unit with 7-state machine, embedded soldier renderer, wheel animation, and `_getSlingTip` rotation matrix for pixel-perfect launch origin.

#### `app.js` — `Shop` Class Extension
- Added `'siege'` type branch to `Shop.draw()`:
  - **Visual**: Stone foundations, timber pillars, X-brace facade, triangular roof, animated swinging iron hook with chain links.
  - **Menu**: Shows hire cost and stats when player is within 60px.

#### `app.js` — `World` Class
- **Constructor**: Added `this.siegeShop = new Shop(this, 290, 'siege')` and `this.trebuchets = []`.
- **`update()`**: Added `nearTrebuchet` proximity detection; gates `Digit1/2/3` to trebuchet controls when within 100px. Added `nearSiegeShop` check for hiring via `[1]`.
- **`_healAll()`**: New method replaces `_healSoldier`. Checks trebuchet proximity first (10 Wood), then falls back to wheat-healing for organic units.
- **`_hireTrebuchet()`**: Deducts 150 Gold + 20 Wood, spawns `Trebuchet` at shop x+80, plays hire SFX.
- **`draw()`**: Renders `siegeShop` and `trebuchets` array in the entity pass.
- **`_realignVerticalContent()`**: Extended to include `siegeShop` and `trebuchets`.

### Verification
- Navigate to x=290 → Siege Workshop with iron hook renders correctly.
- Approach with 150G + 20W, press [1] → Trebuchet spawns.
- Stand within 100px of trebuchet → [1][2][3] context-switch to siege controls.
- Press [3] → Cocking → Charging (creak) → Release whip → Rock launches downward → Rolls and damages enemies.
- Press [H] with 10 Wood near damaged trebuchet → HP restored, green particles.
