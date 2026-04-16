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
