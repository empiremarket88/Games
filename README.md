# 👑 Pocket Kingdom

### *Build small, Dream big.*

A high-fidelity, 2D side-scrolling strategy RPG built entirely with HTML5 Canvas and Vanilla Javascript. Defend your outpost, grow your economy, and survive the encroaching darkness.

## ✨ Key Features

### 🌪️ Dynamic World System
- **Parallax Environments**: Multi-layered backgrounds with clouds, stars, and distant mountain ranges.
- **Blood Moon Waves**: The moon turns red as enemy waves approach, signaling high-intensity survival rounds.
- **Meteor Showers**: Rare cosmic events where golden treasure falls from the sky—catch them to boost your economy!
- **Reactive Nature**: Procedurally animated trees that drop leaves when hit, and birds that fly away when their perch is disturbed.

### ⚔️ Legendary Arsenal
- **Weapon Progression**: Upgrade from humble Fists to the Axe, the Sword, and finally the **Legendary Flame Hammer**.
- **Charged Fireball Ability**: Hold the attack key for 1 second to charge the hammer, unleashing a devastating horizontal fireball that cleanses the forest of enemies.

### 👥 Advanced Unit Management
- **Soldiers & Archers**: Intelligent defensive units that follow your command or guard specific sectors of your kingdom.
- **Workers & Hunters**: Automated logistics units that chop wood, gather wheat, and hunt wildlife to fuel your expansion.
- **Natural Spawning**: Hired units walk out of their buildings with smooth transitional animations, rather than falling into the world.

### 🏗️ Base Building & Economy
- **Upgradeable Structures**: Build Barracks and Level 2 Farms to increase production and recruitment capabilities.
- **Dynamic Shops**: Visit the Forge to upgrade your gear or the Refugee Camp to hire workforce.
- **Resource Management**: Strategically balance Wood, Gold, Wheat, and Meat to survive.

## 🛠️ Technical Systems

- **Procedural Animation Engine**: All units and environmental objects use math-driven bobbing, swinging, and particle effects for a "hand-drawn" feel without heavy sprite assets.
- **Entity AI Component**: Modular AI allows units to switch between `Idle`, `Search`, `Work`, `Attack`, and `Follow` states dynamically.
- **Persistence Layer**: Automatic local storage system that saves every 8 seconds (Auto-Save), allowing you to "Continue" and "New Game" effortlessly from the Title Screen.
- **Real-time Graphics Parity**: A specialized preview tool ensures the game’s custom procedural graphics can be developed and validated in isolation.

## 🎮 Controls

| Action | Key |
| :--- | :--- |
| **Move** | `A` / `D` or `Arrow Keys` |
| **Run** | `Sprint (Shift/Ctrl)` + Move |
| **Attack / Interact** | `E` |
| **Charged Attack** | `Hold E (1s)` |
| **Command Units** | `R` (Toggle Follow/Guard) |
| **Build Woodblock** | `B` |
| **Build Barrack** | `V` |
| **Build Farm** | `F` |
| **Heal Units** | `H` (Needs 1 Wheat) |
| **Upgrade Town** | `T` (Inside Outpost) |
| **Quick Hire** | `1` or `2` (While near shop) |

---
*Developed by the Games freelance team - Mastering Procedural Strategy.*
