# Walkthrough History - Pocket Kingdom

## 2026-04-16 15:33 - Enemy Base Camp & Frontier Expansion
Implemented the **Enemy Command Camp** at `x=5000` with a "Void" aesthetic and a new **Sentinel/Guard AI** system.
- **Key Features**: High HP (1000) base, leashing guard AI, and ruined-state persistence.
- **Result**: Players now have a mid-game objective and predictable enemy defense zones.

---

## 2026-04-16 15:33 - Mobile Optimized Version
Created a dedicated touch-friendly version of the game in the `Mobile/` directory.
- **Key Features**: Glassmorphic D-Pad/Action overlays, Fullscreen API support, and a "Start Kingdom" gesture-lock bypass.
- **Result**: The game is now fully playable on landscape mobile devices.

---

## 2026-04-16 15:33 - Stretchable Graphics Support
Solved the issue of buildings and trees "floating" or "sinking" during window resize events.
- **Key Features**: Global `_realignVerticalContent` delta-shifting system.
- **Result**: The kingdom remains perfectly anchored to the ground no matter how much the browser window is stretched or resized.

---

## 2026-04-16 15:33 - Unified Contextual Controls (v2.1)
Consolidated all game interactions into a contextual "1, 2, 3" system and streamlined the mobile HUD.
- **Key Features**: Tap/Hold to sell resources, context-sensitive upgrades, a 3x3 touch grid on mobile, and fully synchronized in-game UI labels.
- **Result**: Reduced button bloat, faster economy management, and clear, uniform interaction prompts across the game.

---

## 2026-04-16 15:47 - Mobile UI Refinement
Refined the mobile touch interface for better ergonomics and visibility.
- **Key Features**: Smaller, low-profile numerical buttons (1, 2, 3) moved to the bottom row, and widened D-Pad separation for movement.
- **Result**: Cleaner game screen with less obstruction and a more natural thumb position for movement and contextual actions.

---

## 2026-04-16 15:54 - Sell All Animation Restoration
Restored the circular "loading cycle" feedback for resource selling.
- **Key Features**: Visual progress bar over the Resource Shop when keys 1, 2, or 3 are held.
- **Result**: Immediate visual confirmation for the "Sell All" action, restoring the intuitive feel of the bulk-selling mechanic.

---

## 2026-04-16 23:27 - Refugee Shop Hiring Restored
Restored functionality to the Refugee Shop after it was broken during the contextual control migration.
- **Key Features**: Proximity-based detection for the `refugeShop` and re-activation of keys 1 and 2 for recruitment.
- **Result**: Players can once again expand their population by hiring Workers and Hunters at the camp.

---

## 2026-04-16 23:38 - HUD Resource Label Correction
Aligned the HUD text with the actual backend resource costs for building walls.
- **Key Features**: Updated the controls bar from `30G` to `30 Wood`.
- **Result**: Reduced player confusion by providing accurate cost information for basic defenses.

---

## 2026-04-16 23:45 - Portal Spawn Grounding & Mobile ESC
Enhanced the aesthetic of enemy arrivals and added critical accessibility for mobile players.
- **Key Features**: Enemies now spawn directly at ground level in the camp portal. Added a virtual ESC button side-by-side with the mobile fullscreen toggle.
- **Result**: Spawning feels organic and immersive rather than like a technical glitch, and mobile players can now access the pause menu without a keyboard.

---

## 2026-04-16 23:55 - Enemy Camp Buff & Retaliation
Buffed the Enemy Camp to 5,000 HP and added a randomized reinforcement mechanic (2x Minions, 1x Archer every 3-5 hits).
- **Key Features**: Hit-counting reinforcement logic, corrected HP labels, and stationary guard wave-exclusion.
- **Result**: The final objective is now a significantly more challenging and reactive combat puzzle.

---

## 2026-04-17 00:15 - Town Alarm & Kingdom Defense AI
Introduced a town-wide security system and enabled enemies to attack infrastructure.
- **Key Features**: Ringing alarm bell [2], civilian sanctuary logic for workers/hunters, and expanded enemy targeting for Farms/Barracks.
- **Result**: Added a new layer of tactical management and defensive vulnerability to the kingdom.

---

## 2026-04-17 00:45 - UI Standardization & Save Stability
Standardized HP bars and resolved critical state issues with the Town upgrade.
- **Key Features**: Compact 60px/120px building HP bars, mobile-optimized HUD layout, and save/load maxHP synchronization.
- **Result**: Cleaner world UI and robust game state persistence.

---

## 2026-04-17 16:00 - Oak Crusader Trebuchet & Siege Workshop (v3.0)
Integrated the fully animated **Oak Crusader** trebuchet siege engine into the main game world.

### New Building: Siege Workshop (x=290)
- Heavy timber frame with stone foundations and a **swinging iron hook** hoist (animated).
- "⚙ SIEGE WORKSHOP" sign on the facade.
- Proximity menu: `[1] Hire Trebuchet — 150 Gold + 20 Wood`.

### New Unit: Oak Crusader Trebuchet
- **HP**: 250 | **Attack**: 120 (splash, 80px radius on impact) + 2/tick while rolling.
- **Repair**: `[H]` + 10 Wood restores 60 HP per use.
- **State Machine**: `idle → cocking → charging → release → follow` for the full ballistic sequence.
- **Controls** (context-sensitive when player is within 100px):
  - `[1]` Forward (45 px/s, wheel rotates forward, soldier pushes).
  - `[2]` Retreat (35 px/s, wheel rotates backward, soldier pulls).
  - `[3]` Launch — triggers the full cocking + charge + whip sequence.
- **Crew**: Embedded soldier renderer with posture changes per state (push lean, pull lean, idle rest).

### New Projectile: SiegeRock
- Launched from precise sling-tip position using a **nested 2D rotation matrix** (`_getSlingTip`).
- Downward steep trajectory; bounces once with 15% energy restitution, then transitions to **rolling mode**.
- Rolling: decelerates via exponential drag (`Math.pow(0.5, dt)`), emits dust particles, deals continuous damage.
- **Impact**: 15 dust particles + sfx on first ground contact.

### Code Architecture
- `SiegeRock` extends the `arrows` array (shares the same draw/update pipeline).
- `_healAll` replaces `_healSoldier` — now checks trebuchet proximity first (10 Wood), then falls back to wheat-healing for organic units.
- `nearTrebuchet` proximity variable added in `World.update` — gates `Digit1/2/3` context to siege controls when within 100px.
