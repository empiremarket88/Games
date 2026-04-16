// ─── INFO ─────────────────────────────────────────────────────────────────────
//  KINGDOM DEMAKE  —  Complete Game
//  Controls: A/D Move │ Ctrl Sprint │ E Interact/Attack │ R Toggle Follow/Guard
//            B Wood Wall(30G) │ V Build Barrack(300G) │ F Build Farm(100G)
//            U Upgrade nearest Farm(150G) │ H Heal soldier with wheat
//  Goal: Protect your outpost. Survive the night waves. Upgrade to a Town!
// ══════════════════════════════════════════════════════════════════════════════

// ─── SOUND ───────────────────────────────────────────────────────────────────
class SoundFX {
    constructor() { this.ctx = null; }
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    beep(freq, type, dur, vol, delay = 0) {
        if (!this.ctx) return;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
        g.gain.setValueAtTime(vol, this.ctx.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + dur);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(this.ctx.currentTime + delay);
        o.stop(this.ctx.currentTime + delay + dur);
    }
    playChop() { this.beep(120, 'square', 0.12, 0.25); this.beep(80, 'square', 0.08, 0.15, 0.06); }
    playCoin() { this.beep(880, 'sine', 0.05, 0.10); this.beep(1320, 'sine', 0.12, 0.10, 0.06); }
    playHit() { this.beep(100, 'sawtooth', 0.10, 0.30); }
    playHurt() { this.beep(200, 'sawtooth', 0.20, 0.40); this.beep(150, 'sawtooth', 0.15, 0.30, 0.10); }
    playRepair() { this.beep(440, 'triangle', 0.30, 0.20); }
    playBuild() { this.beep(300, 'square', 0.05, 0.15); this.beep(450, 'square', 0.10, 0.15, 0.07); }
    playPickup() { this.beep(1100, 'sine', 0.08, 0.10); this.beep(1500, 'sine', 0.06, 0.08, 0.05); }
    playHire() { this.beep(660, 'sine', 0.08, 0.10); this.beep(990, 'sine', 0.15, 0.10, 0.09); }
    playHeal() { this.beep(523, 'sine', 0.10, 0.15); this.beep(659, 'sine', 0.10, 0.12, 0.08); this.beep(784, 'sine', 0.15, 0.12, 0.16); }
}
const sfx = new SoundFX();

function triggerHitGlow(entity, duration = 0.22) {
    if (!entity) return;
    entity.hurtTimer = Math.max(entity.hurtTimer || 0, duration);
}

function applyHitGlow(ctx, entity, glowRgb = '255,255,255') {
    if (!entity || !entity.hurtTimer || entity.hurtTimer <= 0) return;
    const pulseBase = Math.min(1, entity.hurtTimer / 0.22);
    const pulse = pulseBase * (0.82 + Math.abs(Math.sin((entity.time || 0) * 30)) * 0.18);
    // Disabling expensive filters for performance
    // ctx.shadowColor = `rgba(${glowRgb}, ${0.95 * pulse})`;
    // ctx.shadowBlur = 14 + pulse * 16;
    // ctx.filter = `brightness(${1.12 + pulse * 0.28}) saturate(${1.04 + pulse * 0.2})`;
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
class Input {
    constructor() {
        this.keys = {}; this.pressed = {}; this.released = {};
        this.externalKeys = {}; // track touch/virtual buttons
        window.addEventListener('keydown', e => {
            sfx.init();
            if (!this.keys[e.code]) this.pressed[e.code] = true;
            this.keys[e.code] = true;
            // Only prevent default for game-related keys to allow browser shortcuts
            if(['KeyA','KeyD','KeyW','KeyS','Space','KeyE','KeyR','KeyB','KeyV','KeyF','KeyU','KeyH','KeyT','ArrowLeft','ArrowRight','ControlLeft','ControlRight'].includes(e.code)) e.preventDefault();
        });
        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
            this.released[e.code] = true;
        });
    }
    setKey(code, isPressed) {
        sfx.init();
        if (isPressed && !this.externalKeys[code]) this.pressed[code] = true;
        if (!isPressed && this.externalKeys[code]) this.released[code] = true;
        this.externalKeys[code] = isPressed;
    }
    isDown(c) { return !!this.keys[c] || !!this.externalKeys[c]; }
    justPressed(c) { if (this.pressed[c]) { this.pressed[c] = false; return true; } return false; }
    justReleased(c) { if (this.released[c]) { this.released[c] = false; return true; } return false; }
}

// ─── CAMERA ──────────────────────────────────────────────────────────────────
class Camera {
    constructor(game) { this.game = game; this.x = 0; }
    update(player) {
        const tx = player.x - this.game.canvas.width / 2 + 15;
        this.x += (tx - this.x) * 0.06;
    }
}

// ─── PARTICLE ─────────────────────────────────────────────────────────────────
class Particle {
    constructor(x, y, color, vx, vy, type = 'pixel') {
        this.x = x; this.y = y;
        this.vx = vx !== undefined ? vx : (Math.random() - 0.5) * 150;
        this.vy = vy !== undefined ? vy : -Math.random() * 200 - 80;
        this.life = 1.0; this.color = color;
        this.type = type;
        this.time = Math.random() * Math.PI * 2;
    }
    update(dt) {
        if (this.type === 'leaf' || this.type === 'petal') {
            const drag = this.type === 'petal' ? 0.94 : 0.98;
            const flutter = this.type === 'petal' ? 70 : 40;
            const grav = this.type === 'petal' ? 80 : 200;
            this.vy = (this.vy + grav * dt) * drag;
            this.x += (this.vx + Math.sin(this.time * 6) * flutter) * dt;
            this.y += this.vy * dt;
            this.time += dt;
            this.life -= dt * (this.type === 'petal' ? 0.4 : 0.6);
        } else {
            this.vy += 500 * dt; this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt * 2;
        }
    }
    draw(ctx, cam) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        const sx = this.x - cam.x;
        if (this.type === 'leaf' || this.type === 'petal') {
            ctx.translate(sx, this.y);
            ctx.rotate(Math.sin(this.time * 4) * 0.5 + (this.type === 'petal' ? this.time * 2 : 0));
            const size = this.type === 'petal' ? 4 : 6;
            ctx.fillRect(-size / 2, -size / 2, size, size);
        } else {
            ctx.fillRect(sx, this.y, 6, 6);
        }
        ctx.restore();
    }
}

// ─── BIRD ─────────────────────────────────────────────────────────────────────
class Bird {
    constructor(world, tree) {
        this.world = world;
        this.tree = tree;
        // Random perch position: left, mid, or right
        this.perchOffsetX = (Math.random() - 0.5) * 60;
        this.x = tree.x + this.perchOffsetX;
        this.y = tree.y - tree.height;
        this.state = 'perched'; // 'perched', 'flying'
        this.vx = 0; this.vy = 0;
        this.time = Math.random() * 10;
        this.wingPos = 0;
        this.dead = false;
        this.color = ['#333', '#555', '#444'][Math.floor(Math.random() * 3)];
    }
    takeOff() {
        if (this.state === 'perched') {
            this.state = 'flying';
            // Varied angles focused upward
            this.vx = (Math.random() - 0.5) * 300;
            this.vy = -250 - Math.random() * 150;
        }
    }
    update(dt) {
        this.time += dt;
        if (this.state === 'perched') {
            if (this.tree.dead) { this.takeOff(); return; }
            this.x = this.tree.x + this.perchOffsetX;
            const shake = this.tree.hitAnimation > 0 ? Math.sin(this.tree.hitAnimation * 50) * 5 : 0;
            this.x += shake;
            this.y = this.tree.y - this.tree.height - 5;
        } else {
            this.vy -= 150 * dt; // continue flying up
            this.vx += (Math.random() - 0.5) * 50 * dt;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.wingPos = Math.sin(this.time * 25);
            if (this.y < -500 || Math.abs(this.x) > 10000) this.dead = true;
        }
    }
    draw(ctx, cam) {
        const sx = this.x - cam.x;
        ctx.save();
        ctx.translate(sx, this.y);
        ctx.fillStyle = this.color;
        // Body
        ctx.beginPath(); ctx.ellipse(0, 0, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
        // Wings
        const wY = this.state === 'perched' ? 2 : this.wingPos * 6;
        ctx.beginPath();
        ctx.moveTo(-4, 0); ctx.lineTo(-8, -wY);
        ctx.moveTo(4, 0); ctx.lineTo(8, -wY);
        ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
    }
}

// ─── GROUND ITEM (wheat / coin) ──────────────────────────────────────────────
class GroundItem {
    constructor(world, x, y, type, value) {
        this.world = world; this.x = x; this.y = y;
        this.type = type; // 'wheat' | 'coin' | 'log' | 'bigcoin'
        this.value = value !== undefined ? value : 1;
        this.bob = Math.random() * Math.PI * 2;
        this.time = 0; this.picked = false;
    }
    update(dt) { this.time += dt; }
    draw(ctx, cam) {
        if (this.picked) return;
        const sx = this.x - cam.x;
        const sy = this.y + Math.sin(this.time * 3 + this.bob) * 4;
        ctx.save();
        if (this.type === 'log') {
            // Wooden log on ground
            ctx.fillStyle = '#6b3a1f';
            ctx.fillRect(sx, sy + 4, 22, 9);
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(sx + 1, sy + 5, 20, 7);
            // End grain rings
            ctx.fillStyle = '#5c2d0e';
            ctx.beginPath(); ctx.ellipse(sx + 1, sy + 8, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#7a3a15';
            ctx.beginPath(); ctx.ellipse(sx + 21, sy + 8, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#5c2d0e'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('LOG', sx + 11, sy + 0); ctx.textAlign = 'left';
        } else if (this.type === 'wheat') {
            // Wheat stalk
            ctx.strokeStyle = '#c8a000'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(sx + 8, sy + 14); ctx.lineTo(sx + 8, sy); ctx.stroke();
            ctx.beginPath(); // clear stroke path
            ctx.fillStyle = '#f5c842';
            ctx.beginPath(); ctx.ellipse(sx + 8, sy - 4, 5, 9, -0.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sx + 14, sy - 4, 5, 9, 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#a87c00';
            ctx.beginPath(); ctx.ellipse(sx + 11, sy - 8, 4, 8, 0, 0, Math.PI * 2); ctx.fill();
        } else if (this.type === 'bigcoin') {
            // Big 100G meteor coin — glowing, pulsing
            const pulse = 1 + Math.sin(this.time * 6) * 0.12;
            ctx.save();
            ctx.translate(sx + 14, sy + 14);
            ctx.scale(pulse, pulse);
            const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 14);
            grad.addColorStop(0, '#fff8a0'); grad.addColorStop(0.5, '#ffd700'); grad.addColorStop(1, '#c8a000');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ff8c00'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = '#7a4800'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('100G', 0, 4); ctx.textAlign = 'left';
            ctx.restore();
        } else if (this.type === 'meat') {
            // Meat drop
            ctx.fillStyle = '#c8102e'; ctx.fillRect(sx - 4, sy - 6, 12, 8);
            ctx.fillStyle = '#f0f0f0'; ctx.fillRect(sx + 8, sy - 4, 3, 4); // bone end
            ctx.fillStyle = '#ff4444'; ctx.fillRect(sx - 2, sy - 4, 6, 4); // highlight
        } else {
            // Coin
            ctx.fillStyle = '#ffd700';
            ctx.beginPath(); ctx.arc(sx + 8, sy + 8, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#c8a000';
            ctx.beginPath(); ctx.arc(sx + 8, sy + 8, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffd700'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('G', sx + 8, sy + 11); ctx.textAlign = 'left';
        }
        ctx.restore();
    }
}

// ─── METEOR ─────────────────────────────────────────────────────────────────────
class Meteor {
    constructor(world, isBig) {
        this.world = world;
        const W = world.game.canvas.width;
        this.isBig = !!isBig;
        // Start high up and to the right of screen (world coords)
        this.x = world.game.player.x + W * 0.5 + Math.random() * W;
        this.y = -150 - Math.random() * 200;
        this.vx = -(300 + Math.random() * 200);
        this.vy = (400 + Math.random() * 200);
        if (this.isBig) {
            // Big meteor: targeted toward outpost
            const tx = world.outpost.x;
            const ty = world.groundY - 60;
            const dist = Math.sqrt((tx - this.x) ** 2 + (ty - this.y) ** 2) || 1;
            const spd = 600;
            this.vx = ((tx - this.x) / dist) * spd;
            this.vy = ((ty - this.y) / dist) * spd;
        }
        this.trail = [];
        this.dead = false;
    }
    update(dt) {
        if (this.dead) return;
        // Store trail
        this.trail.unshift({ x: this.x, y: this.y });
        if (this.trail.length > 18) this.trail.pop();
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        // Hit ground
        if (this.y >= this.world.groundY - 20) {
            this.dead = true;
            // Impact particles
            for (let i = 0; i < 18; i++) this.world.particles.push(new Particle(this.x, this.world.groundY - 20, this.isBig ? '#ffd700' : '#ff6600'));
            if (this.isBig) {
                // Drop a big 100G coin near outpost
                const dropX = this.world.outpost.x + (Math.random() - 0.5) * 60;
                this.world.groundItems.push(new GroundItem(this.world, dropX, this.world.groundY - 18, 'bigcoin', 100));
                sfx.playCoin();
            }
        }
    }
    draw(ctx, cam) {
        if (this.dead) return;
        const size = this.isBig ? 8 : 4;
        // Draw trail
        for (let i = 0; i < this.trail.length; i++) {
            const a = (1 - i / this.trail.length) * 0.7;
            ctx.globalAlpha = a;
            ctx.fillStyle = this.isBig ? '#ffcc00' : '#ffaa44';
            const ts = size * (1 - i / this.trail.length);
            ctx.beginPath(); ctx.arc(this.trail[i].x - cam.x, this.trail[i].y, ts, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // Draw head
        if (this.isBig) {
            const hg = ctx.createRadialGradient(this.x - cam.x, this.y, 0, this.x - cam.x, this.y, 12);
            hg.addColorStop(0, '#fff'); hg.addColorStop(0.4, '#ffd700'); hg.addColorStop(1, 'rgba(255,100,0,0)');
            ctx.fillStyle = hg;
            ctx.beginPath(); ctx.arc(this.x - cam.x, this.y, 12, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(this.x - cam.x, this.y, size, 0, Math.PI * 2); ctx.fill();
        }
    }
}

// ─── WOOD BLOCK ───────────────────────────────────────────────────────────────
class WoodBlock {
    constructor(world, x) {
        this.world = world; this.x = x; this.y = world.groundY - 48;
        this.w = 36; this.h = 48; this.maxHp = 60; this.hp = 60;
        this.dead = false; this.hitTimer = 0;
    }
    takeDamage(dmg) {
        this.hp -= dmg; this.hitTimer = 0.15; sfx.playHit();
        if (this.hp <= 0) {
            this.dead = true;
            for (let i = 0; i < 8; i++) this.world.particles.push(new Particle(this.x + 18, this.y, '#8b4513'));
        }
    }
    update(dt) { if (this.hitTimer > 0) this.hitTimer -= dt; }
    draw(ctx, cam) {
        if (this.dead) return;
        const sx = this.x - cam.x;
        ctx.save();
        if (this.hitTimer > 0) ctx.translate(Math.sin(this.hitTimer * 60) * 3, 0);
        ctx.fillStyle = '#8b4513'; ctx.fillRect(sx, this.y, this.w, this.h);
        ctx.strokeStyle = '#5c2e00'; ctx.lineWidth = 2;
        for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(sx, this.y + i * 13); ctx.lineTo(sx + this.w, this.y + i * 13); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(sx + this.w / 2, this.y); ctx.lineTo(sx + this.w / 2, this.y + this.h); ctx.stroke();
        ctx.beginPath();

        // --- Improved HP Bar ---
        const hpY = this.y + this.h + 5;
        const hpRatio = this.hp / this.maxHp;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx, hpY, this.w, 6);
        ctx.fillStyle = hpRatio > 0.5 ? '#00f5ff' : hpRatio > 0.25 ? '#ffaa00' : '#ff0054';
        ctx.fillRect(sx, hpY, this.w * hpRatio, 6);
        ctx.strokeStyle = 'white'; ctx.lineWidth = 1; ctx.strokeRect(sx, hpY, this.w, 6);

        ctx.restore();
    }
}

// ─── DECORATION ──────────────────────────────────────────────────────────────
class Decoration {
    constructor(world, x, type) {
        this.world = world; this.x = x; this.y = world.groundY + Math.random() * 6 - 3;
        this.type = type; // 'grass', 'flower'
        this.color = type === 'grass' ? '#3d5e3a' : ['#ffafcc', '#ff595e', '#ffca3a', '#fb6f92', '#8338ec'][Math.floor(Math.random() * 5)];
        this.size = type === 'grass' ? 6 + Math.random() * 10 : 12 + Math.random() * 6;
        this.state = 'bud';
        this.stateTimer = 5 + Math.random() * 20;
        this.time = Math.random() * 10;
        this.swaySpeed = 1.2 + Math.random() * 0.8;
    }
    update(dt) {
        this.time += dt;
        if (this.type === 'flower') {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                if (this.state === 'bud') { this.state = 'blooming'; this.stateTimer = 8; }
                else if (this.state === 'blooming') { this.state = 'open'; this.stateTimer = 30 + Math.random() * 50; }
                else if (this.state === 'open') { this.state = 'faded'; this.stateTimer = 16 + Math.random() * 24; }
                else { this.state = 'bud'; this.stateTimer = 40 + Math.random() * 80; }
            }
            // Petal drop chance in open state
            if (this.state === 'open' && Math.random() < 0.007) {
                this.world.particles.push(new Particle(this.x, this.y - this.size, this.color, (Math.random() - 0.5) * 40, -Math.random() * 20, 'petal'));
            }
        }
    }
    draw(ctx, cam) {
        const sx = this.x - cam.x;
        if (sx < -100 || sx > ctx.canvas.width + 100) return;
        const sway = Math.sin(this.time * this.swaySpeed) * 3;
        ctx.save();
        ctx.translate(sx, this.y);
        if (this.type === 'grass') {
            ctx.strokeStyle = this.color; ctx.lineWidth = 1.8;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(sway, -this.size / 2, sway, -this.size);
            ctx.moveTo(0, 0); ctx.quadraticCurveTo(-sway, -this.size / 2, -sway, -this.size * 0.7);
            ctx.stroke();
        } else if (this.type === 'flower') {
            ctx.strokeStyle = '#2d4c1e'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(sway, -this.size / 2, sway, -this.size); ctx.stroke();
            ctx.translate(sway, -this.size);
            if (this.state === 'bud') {
                ctx.fillStyle = '#4a7c2c'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
            } else {
                let s = this.state === 'blooming' ? 0.3 + (1 - this.stateTimer / 4) * 0.7 : (this.state === 'open' ? 1 : 0.7);
                ctx.scale(s, s);
                ctx.fillStyle = this.color;
                if (this.state === 'faded') ctx.globalAlpha = 0.5;
                for (let i = 0; i < 5; i++) {
                    ctx.rotate((Math.PI * 2) / 5);
                    ctx.beginPath(); ctx.ellipse(4, 0, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
                }
                ctx.fillStyle = '#ffea00'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.restore();
    }
}

class Ladybug {
    constructor(world, deco) {
        this.world = world;
        this.deco = deco;
        // Float near the decoration
        this.offsetX = (Math.random() - 0.5) * 15;
        this.offsetY = -Math.random() * deco.size;
        this.x = deco.x + this.offsetX;
        this.y = deco.y + this.offsetY;
        this.time = Math.random() * 10;
        this.vx = 0; this.vy = 0;
    }
    update(dt) {
        this.time += dt;
        // Tiny crawling vibration
        this.x = this.deco.x + this.offsetX + Math.sin(this.time * 2) * 2;
        this.y = this.deco.y + this.offsetY + Math.cos(this.time * 3) * 1;
    }
    draw(ctx, cam) {
        const sx = this.x - cam.x;
        ctx.fillStyle = '#c00'; // Red
        ctx.beginPath(); ctx.ellipse(sx, this.y, 2.2, 1.8, 0, 0, Math.PI * 2); ctx.fill();
        // Spots
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(sx - 0.8, this.y - 0.5, 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + 0.8, this.y + 0.5, 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx, this.y, 0.4, 0, Math.PI * 2); ctx.fill();
    }
}

// ─── FARM ─────────────────────────────────────────────────────────────────────
class Farm {
    constructor(world, x) {
        this.world = world; this.x = x; this.y = world.groundY;
        this.level = 1;
        this.timer = 0;
        this.time = 0;
        this.maxHp = 150; this.hp = 150;
        this.dead = false; this.hitTimer = 0;
    }
    takeDamage(dmg) {
        this.hp -= dmg; this.hitTimer = 0.15; sfx.playHit();
        if (this.hp <= 0) {
            this.dead = true;
            for (let i = 0; i < 15; i++) this.world.particles.push(new Particle(this.x, this.y - 30, '#5a3e1a'));
        }
    }
    update(dt) {
        this.time += dt; this.timer += dt;
        if (this.hitTimer > 0) this.hitTimer -= dt;
        const target = this.level === 1 ? 50 : 25;
        if (this.timer >= target) {
            this.timer = 0;
            // Drop wheat on the ground level
            this.world.groundItems.push(new GroundItem(this.world, this.x + (Math.random() - 0.5) * 60, this.world.groundY - 20, 'wheat'));
        }
    }
    draw(ctx, cam, player) {
        if (this.dead) return;
        const sx = this.x - cam.x, sy = this.y;
        ctx.save();
        if (this.hitTimer > 0) ctx.translate(Math.sin(this.hitTimer * 60) * 3, 0);
        const prog = this.timer / (this.level === 1 ? 50 : 25); // 0→1 over grow cycle
        // Field plot
        ctx.fillStyle = '#5a3e1a'; ctx.fillRect(sx - 50, sy - 5, 100, 5);
        // Fence posts
        ctx.fillStyle = '#8b4513';
        for (let i = -50; i <= 50; i += 20) { ctx.fillRect(sx + i, sy - 15, 4, 15); }
        ctx.fillRect(sx - 50, sy - 10, 100, 3);
        // Animated crop rows — wheat grows taller with progress (0→1)
        const maxStem = 18;  // max stem height in px
        const maxHead = 8;   // max head size in px
        for (let i = -40; i <= 30; i += 15) {
            const stemH = Math.max(1, Math.round(prog * maxStem));
            const headR = Math.max(1, Math.round(prog * maxHead * 0.5));
            const cx = sx + i + 2;
            // Stem
            const stemColor = `hsl(${80 + prog * 20},${60 - prog * 20}%,${20 + prog * 15}%)`;
            ctx.fillStyle = stemColor;
            ctx.fillRect(cx, sy - stemH, 3, stemH);
            // Head — only visible in latter half of growth
            if (prog > 0.45) {
                const alpha = Math.min(1, (prog - 0.45) * 5);
                ctx.globalAlpha = alpha;
                const headColor = prog > 0.8 ? '#e8c840' : '#a8c840';
                ctx.fillStyle = headColor;
                ctx.beginPath();
                ctx.ellipse(cx + 1, sy - stemH - headR, headR * 0.7, headR, -0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
        // HP bar (Small red/yellow/green)
        ctx.fillStyle = '#400'; ctx.fillRect(sx - 40, sy - 52, 80, 4);
        const hpRatio = this.hp / this.maxHp;
        ctx.fillStyle = hpRatio > 0.5 ? '#0c0' : hpRatio > 0.25 ? '#f5a623' : '#e00';
        ctx.fillRect(sx - 40, sy - 52, 80 * hpRatio, 4);

        // Level indicator
        ctx.fillStyle = this.level === 2 ? '#f5c842' : '#ccc';
        ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`Farm Lv${this.level} (${this.level === 1 ? 50 : 25}s)`, sx, sy - 60);
        // Progress bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(sx - 40, sy - 40, 80, 6);
        ctx.fillStyle = prog > 0.8 ? '#f5c842' : '#8ab000'; ctx.fillRect(sx - 40, sy - 40, 80 * prog, 6);
        ctx.textAlign = 'left';
        ctx.restore();

        // Prompt
        if (Math.abs(this.x - player.x) < 70) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(sx - 80, sy - 85, 160, 20);
            ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
            if (this.level === 1) ctx.fillText('Upgrade Farm 50 Wood [U]', sx, sy - 71);
            else ctx.fillText('Max level!', sx, sy - 71);
            ctx.textAlign = 'left';
        }
    }
}

// ─── ARROW ────────────────────────────────────────────────────────────────────
class Arrow {
    constructor(world, x, y, tx, ty, isEnemy = false) {
        this.world = world;
        this.x = x; this.y = y;
        this.dead = false; this.age = 0;
        this.dmg = 25;
        this.isEnemy = isEnemy;
        const dx = tx - x, dy = ty - y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 420;
        this.vx = (dx / len) * speed;
        this.vy = (dy / len) * speed;
    }
    update(dt) {
        this.age += dt;
        if (this.age > 3) { this.dead = true; return; }
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 60 * dt; // gentle gravity arc
        if (this.isEnemy) {
            const targets = [this.world.game.player, ...this.world.soldiers, ...this.world.workers, ...this.world.archers, ...this.world.hunters, this.world.outpost];
            for (const t of targets) {
                if (!t || t.dead) continue;
                if (Math.abs(t.x - this.x) < 30 && (t === this.world.outpost || Math.abs(t.y - this.y) < 50)) {
                    t.takeDamage(15);
                    this.dead = true; return;
                }
            }
        } else {
            for (const e of this.world.enemies) {
                if (e.dead) continue;
                if (Math.abs(e.x - this.x) < 28 && Math.abs(e.y - this.y) < 45) {
                    e.takeDamage(this.dmg);
                    this.dead = true; return;
                }
            }
        }
    }
    draw(ctx, cam) {
        if (this.dead) return;
        const sx = this.x - cam.x;
        const angle = Math.atan2(this.vy, this.vx);
        ctx.save();
        ctx.translate(sx, this.y); ctx.rotate(angle);
        ctx.fillStyle = '#8b4513'; ctx.fillRect(-14, -1, 26, 2);
        ctx.fillStyle = '#bbb';
        ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(12, -3); ctx.lineTo(12, 3); ctx.fill();
        ctx.fillStyle = '#c8a000';
        ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-8, -4); ctx.lineTo(-6, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-8, 4); ctx.lineTo(-6, 0); ctx.fill();
        ctx.restore();
    }
}

// ─── FIREBALL ─────────────────────────────────────────────────────────────────
class Fireball {
    constructor(world, x, y, tx, ty) {
        this.world = world;
        this.x = x; this.y = y;
        this.dead = false; this.age = 0;
        this.dmg = 50;
        const dx = tx - x, dy = ty - y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 250;
        this.vx = (dx / len) * speed;
        this.vy = (dy / len) * speed;
    }
    update(dt) {
        this.age += dt;
        if (this.age > 4) { this.dead = true; return; }
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        const targets = [...this.world.farms, ...this.world.barracks, this.world.outpost, this.world.game.player, ...this.world.soldiers, ...this.world.archers, ...this.world.workers, ...this.world.hunters];
        for (const t of targets) {
            if (!t || t.dead) continue;
            const dist = Math.abs(t.x - this.x);
            const range = t === this.world.outpost ? 60 : 40;
            if (dist < range && (Math.abs(t.y - this.y) < 60 || t.hp !== undefined)) {
                t.takeDamage(this.dmg);
                for (let i = 0; i < 15; i++) this.world.particles.push(new Particle(this.x, this.y, '#ff4400'));
                this.dead = true; return;
            }
        }
    }
    draw(ctx, cam) {
        if (this.dead) return;
        const sx = this.x - cam.x;
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath(); ctx.arc(sx, this.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff0000';
        ctx.beginPath(); ctx.arc(sx, this.y, 5, 0, Math.PI * 2); ctx.fill();
    }
}

// ─── HERO FIREBALL ────────────────────────────────────────────────────────────
class HeroFireball {
    constructor(world, x, y, facingRight) {
        this.world = world;
        this.x = x; this.y = y;
        this.dead = false; this.age = 0;
        this.dmg = 75; // Powerful hero attack
        this.vx = facingRight ? 450 : -450;
        this.vy = 0;
        this.facingRight = facingRight;
    }
    update(dt) {
        this.age += dt;
        if (this.age > 2.5) { this.dead = true; return; }
        this.x += this.vx * dt;

        // Embers trail
        if (Math.random() < 0.4) {
            this.world.particles.push(new Particle(this.x, this.y + (Math.random() - 0.5) * 10, '#ffaa00', -this.vx * 0.2, (Math.random() - 0.5) * 40));
        }

        for (const e of this.world.enemies) {
            if (e.dead) continue;
            const dist = Math.abs(e.x - this.x);
            if (dist < 40 && Math.abs(e.y - this.y) < 60) {
                e.takeDamage(this.dmg);
                // Explosion effect
                for (let i = 0; i < 12; i++) {
                    this.world.particles.push(new Particle(this.x, this.y, '#ff4400', (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300));
                }
                this.dead = true; return;
            }
        }
    }
    draw(ctx, cam) {
        if (this.dead) return;
        const sx = this.x - cam.x;
        ctx.save();
        // Outer glow
        const g = ctx.createRadialGradient(sx, this.y, 0, sx, this.y, 15);
        g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#ffcc00'); g.addColorStop(1, 'rgba(255,68,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(sx, this.y, 15, 0, Math.PI * 2); ctx.fill();

        // Inner core
        ctx.fillStyle = '#ff4400';
        ctx.beginPath(); ctx.arc(sx, this.y, 6, 0, Math.PI * 2); ctx.fill();

        // Flame tail oscillations
        const t = this.world.game ? this.world.game.lastTime / 1000 : 0;
        ctx.fillStyle = '#ffaa00';
        for (let i = 0; i < 3; i++) {
            const offX = (this.facingRight ? -1 : 1) * (10 + i * 8);
            const offY = Math.sin(t * 20 + i) * 6;
            ctx.beginPath(); ctx.arc(sx + offX, this.y + offY, 5 - i, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

// ─── LASER BEAM ──────────────────────────────────────────────────────────────
class LaserBeam {
    constructor(world, x, y, tx, ty) {
        this.world = world;
        this.x = x; this.y = y;
        this.tx = tx; this.ty = ty;
        this.dead = false; this.age = 0;
        this.maxAge = 0.6; // duration of the beam
        this.dmg = 60;
        this.hasHit = false;
        sfx.beep(800, 'sawtooth', 0.1, 0.2); // laser fire sound
    }
    update(dt) {
        this.age += dt;
        if (this.age > this.maxAge) { this.dead = true; return; }

        // Damage once per beam
        if (!this.hasHit) {
            this.hasHit = true;
            // Check along segments of the beam for intersection
            const targets = [...this.world.farms, ...this.world.barracks, ...this.world.woodBlocks, this.world.outpost, this.world.game.player, ...this.world.soldiers, ...this.world.archers, ...this.world.workers, ...this.world.hunters];

            // Simple line-circle intersection estimate or just check proximity to the line
            for (const t of targets) {
                if (!t || t.dead) continue;
                const distToLine = this._distPointToLine(t.x, t.y || this.world.groundY - 30);
                const range = (t === this.world.outpost) ? 80 : 40;
                if (distToLine < range) {
                    t.takeDamage ? t.takeDamage(this.dmg) : (t.hp -= this.dmg);
                    for (let i = 0; i < 5; i++) this.world.particles.push(new Particle(t.x, (t.y || this.world.groundY - 30), '#00f5ff'));
                }
            }
        }
    }
    _distPointToLine(px, py) {
        const x1 = this.x, y1 = this.y, x2 = this.tx, y2 = this.ty;
        const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq != 0) param = dot / len_sq;
        let xx, yy;
        if (param < 0) { xx = x1; yy = y1; }
        else if (param > 1) { xx = x2; yy = y2; }
        else { xx = x1 + param * C; yy = y1 + param * D; }
        const dx = px - xx, dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    draw(ctx, cam) {
        if (this.dead) return;
        const sx = this.x - cam.x, sy = this.y;
        const stx = this.tx - cam.x, sty = this.ty;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const alpha = Math.sin((this.age / this.maxAge) * Math.PI);

        // Outer Glow
        ctx.strokeStyle = '#00f5ff';
        ctx.lineWidth = 15 * alpha;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.5 * alpha;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(stx, sty); ctx.stroke();

        // Inner Core
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4 * alpha;
        ctx.globalAlpha = 1.0 * alpha;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(stx, sty); ctx.stroke();

        // Impact Sparks
        if (this.age < 0.2) {
            ctx.fillStyle = '#00f5ff';
            for (let i = 0; i < 3; i++) {
                ctx.beginPath(); ctx.arc(stx + (Math.random() - 0.5) * 20, sty + (Math.random() - 0.5) * 20, 4, 0, Math.PI * 2); ctx.fill();
            }
        }

        ctx.restore();
    }
}

// ─── ARCHER ───────────────────────────────────────────────────────────────────
class Archer {
    constructor(world, x) {
        this.world = world; this.x = x; this.y = world.groundY - 60;
        this.vx = 0; this.vy = 0;
        this.facingRight = true; this.time = 0;
        this.maxHp = 70; this.hp = 70;
        this.dead = false; this.following = false;
        this.guardX = x; this.shootCd = 0; this.state = 'idle';
        this.shootRange = 320; this.preferDist = 200;
        this.drawingBow = false; this.drawTimer = 0;
        this.dialogue = ''; this.dialogueTimer = 0; this.hurtTimer = 0;
        this.spawnWalkTimer = 1.5;
    }
    takeDamage(dmg) {
        this.hp -= dmg; triggerHitGlow(this); sfx.playHit();
        if (this.hp <= 0) this.dead = true;
    }
    update(dt, player) {
        this.time += dt;
        this.vy += 1200 * dt; this.y += this.vy * dt;
        if (this.y > this.world.groundY - 60) { this.y = this.world.groundY - 60; this.vy = 0; }
        if (this.shootCd > 0) this.shootCd -= dt;
        if (this.dialogueTimer > 0) this.dialogueTimer -= dt;
        if (this.hurtTimer > 0) this.hurtTimer -= dt;

        if (this.spawnWalkTimer > 0) {
            this.spawnWalkTimer -= dt;
            this.vx = 100; this.facingRight = true; this.state = 'walk';
            this.x += this.vx * dt;
            return;
        }

        let nearestEnemy = null, nearestDist = Infinity;
        for (const e of this.world.enemies) {
            if (e.dead) continue;
            const d = Math.abs(e.x - this.x);
            if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
        }
        if (nearestEnemy && nearestDist < this.shootRange) {
            const dir = Math.sign(nearestEnemy.x - this.x);
            this.facingRight = dir > 0;
            if (nearestDist < this.preferDist - 20) { this.vx = -dir * 100; this.state = 'walk'; }
            else if (nearestDist > this.preferDist + 20) { this.vx = dir * 100; this.state = 'walk'; }
            else { this.vx = 0; this.state = 'idle'; }
            this.drawingBow = true;
            this.drawTimer += dt;
            if (this.drawTimer > 1.0 && this.shootCd <= 0) {
                this.drawTimer = 0; this.shootCd = 1.8;
                this.world.arrows.push(new Arrow(this.world, this.x + 15, this.y + 10, nearestEnemy.x + 15, nearestEnemy.y + 20));
                const lines = ['Fire!', 'Take this!', 'Aim... loose!', 'For the realm!'];
                this.dialogue = lines[Math.floor(Math.random() * lines.length)]; this.dialogueTimer = 1.5;
            }
        } else {
            this.drawingBow = false; this.drawTimer = 0;
            if (this.following) {
                const dist = Math.abs(this.x - player.x);
                if (dist > 80) { const dir = Math.sign(player.x - this.x); this.vx = dir * 180; this.facingRight = dir > 0; this.state = 'walk'; }
                else { this.vx = 0; this.state = 'idle'; }
            } else {
                const distHome = Math.abs(this.x - this.guardX);
                if (distHome > 15) { const dir = Math.sign(this.guardX - this.x); this.vx = dir * 100; this.facingRight = dir > 0; this.state = 'walk'; }
                else { this.vx = 0; this.state = 'idle'; }
            }
        }
        this.x += this.vx * dt;
    }
    draw(ctx, cam) {
        if (this.dead) return;
        const sx = this.x - cam.x, sy = this.y;
        const bob = this.state === 'walk' ? Math.abs(Math.sin(this.time * 12)) * 3 : 0;
        ctx.save();
        applyHitGlow(ctx, this);
        ctx.translate(sx, sy - bob);
        if (!this.facingRight) { ctx.translate(30, 0); ctx.scale(-1, 1); }
        const ls = this.state === 'walk' ? Math.sin(this.time * 12) * 6 : 0;
        ctx.fillStyle = '#44301c'; ctx.fillRect(6 - ls, 42, 7, 16); ctx.fillRect(17 + ls, 42, 7, 16);
        ctx.fillStyle = '#1f150d'; ctx.fillRect(5 - ls, 56, 9, 4); ctx.fillRect(16 + ls, 56, 9, 4);
        ctx.fillStyle = '#5f4121'; ctx.fillRect(-1, 18, 6, 17);
        ctx.fillStyle = '#f2c6a3'; ctx.fillRect(0, 33, 5, 6);
        ctx.fillStyle = '#604622';
        ctx.beginPath();
        ctx.moveTo(4, 16); ctx.lineTo(26, 16); ctx.lineTo(30, 40); ctx.lineTo(24, 44); ctx.lineTo(6, 44); ctx.lineTo(0, 40); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#7f6034';
        ctx.beginPath();
        ctx.moveTo(11, 16); ctx.lineTo(19, 16); ctx.lineTo(22, 41); ctx.lineTo(8, 41); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#5a7c3a';
        ctx.beginPath();
        ctx.moveTo(6, -8); ctx.lineTo(24, -8); ctx.lineTo(26, 5); ctx.lineTo(4, 5); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#d4c28a'; ctx.fillRect(8, 23, 14, 3);
        ctx.fillStyle = '#50341d'; ctx.fillRect(4, 39, 22, 4);
        ctx.fillStyle = '#f2c6a3'; ctx.fillRect(12, 12, 6, 5);
        ctx.fillStyle = '#f5c9a8';
        ctx.beginPath(); ctx.ellipse(15, 2, 11, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4e6f33';
        ctx.beginPath();
        ctx.moveTo(6, 0); ctx.quadraticCurveTo(8, -11, 15, -12); ctx.quadraticCurveTo(24, -11, 25, 2); ctx.lineTo(24, 5); ctx.lineTo(6, 5); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#e2b18f';
        ctx.beginPath(); ctx.ellipse(7, 3, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2b1a0f'; ctx.fillRect(15, -1, 3, 2); ctx.fillRect(20, 0, 2, 2);
        ctx.save();
        ctx.translate(22, 18);
        if (this.drawingBow) {
            const drawFraction = Math.min(1, this.drawTimer / 1.0);
            ctx.rotate(-0.8 - drawFraction * 0.3);
        }
        ctx.fillStyle = '#654824'; ctx.fillRect(-3, 0, 8, 20);
        ctx.fillStyle = '#f2c6a3'; ctx.fillRect(-2, 20, 7, 7);
        ctx.strokeStyle = '#5c3010'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(6, 10, 20, -1.2, 1.2); ctx.stroke();
        ctx.beginPath();
        if (this.drawingBow) {
            const pull = Math.min(1, this.drawTimer / 1.0) * 12;
            ctx.strokeStyle = '#e8d8b0'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(22, -10); ctx.lineTo(10 + pull, 10); ctx.lineTo(22, 30); ctx.stroke();
            ctx.beginPath();
            if (this.shootCd <= 1.3) {
                ctx.fillStyle = '#8b4513'; ctx.fillRect(8 + pull, 8, 20, 2);
                ctx.fillStyle = '#bbb';
                ctx.beginPath(); ctx.moveTo(33 + pull, 9); ctx.lineTo(28 + pull, 6); ctx.lineTo(28 + pull, 12); ctx.fill();
            }
        } else {
            ctx.strokeStyle = '#e8d8b0'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(22, -10); ctx.lineTo(22, 30); ctx.stroke();
            ctx.beginPath();
        }
        ctx.restore();
        ctx.restore();
        // Follow/Guard label
        ctx.fillStyle = this.following ? '#00eeff' : '#ffcc44';
        ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(this.following ? '▶ FOLLOW' : '■ GUARD', sx + 15, sy - 32); ctx.textAlign = 'left';
        // HP bar
        ctx.fillStyle = '#004400'; ctx.fillRect(sx, sy - 20, 30, 4);
        const hpRatio = this.hp / this.maxHp;
        ctx.fillStyle = hpRatio > 0.5 ? '#00cc00' : hpRatio > 0.25 ? '#f5a623' : '#e00';
        ctx.fillRect(sx, sy - 20, hpRatio * 30, 4);
        if (this.hp < this.maxHp) {
            const player = this.world.game.player;
            if (Math.abs(this.x - player.x) < 70 && player.inventory.wheat > 0) {
                ctx.fillStyle = '#8f8'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('[H] Heal', sx + 15, sy - 42); ctx.textAlign = 'left';
            }
        }
        if (this.dialogueTimer > 0) {
            ctx.fillStyle = 'white'; ctx.fillRect(sx - 5, sy - 62, 100, 18);
            ctx.fillStyle = '#222'; ctx.font = '11px sans-serif';
            ctx.fillText(this.dialogue, sx, sy - 48);
        }
    }
}

// ─── FOREGROUND TREE (respawns after 30s) ────────────────────────────────────
class ForegroundTree {
    constructor(world, x) {
        this.world = world; this.x = x;
        // 10% variation on base height
        this.height = 140 + (Math.random() - 0.5) * 28;
        this.y = world.groundY;
        this.health = 3; this.dead = false;
        this.hitAnimation = 0; this.respawnTimer = 0;
        this.perchedBirds = [];
        this.chunkScale = 0.85 + Math.random() * 0.3; // Variation in foliage thickness
    }
    hit() {
        if (this.dead) return;
        this.health -= 1; this.hitAnimation = 0.2; sfx.playChop();
        // Wood bits
        for (let i = 0; i < 4; i++) this.world.particles.push(new Particle(this.x + 10, this.y - 40, '#8b4513'));
        // Leaf bits
        for (let i = 0; i < 8; i++) this.world.particles.push(new Particle(this.x + 10, this.y - this.height + 40, '#228b22', undefined, undefined, 'leaf'));

        // All birds fly away
        this.perchedBirds.forEach(b => b.takeOff());

        if (this.health <= 0) {
            this.dead = true; this.respawnTimer = 30;
            for (let i = 0; i < 5; i++) {
                const lx = this.x + (Math.random() - 0.5) * 80;
                this.world.groundItems.push(new GroundItem(this.world, lx, this.world.groundY - 16, 'log'));
            }
        }
    }
    update(dt) {
        if (this.hitAnimation > 0) this.hitAnimation -= dt;
        if (this.dead && this.respawnTimer > 0) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) { this.dead = false; this.health = 3; }
        }
    }
    draw(ctx, cam) {
        if (this.dead) return;
        const sx = this.x - cam.x;
        ctx.save();
        if (this.hitAnimation > 0) ctx.translate(Math.sin(this.hitAnimation * 50) * 5, 0);

        // Trunk (Bottom of tree)
        ctx.fillStyle = '#2b1a0d';
        ctx.fillRect(sx + 5, this.y - this.height, 10, this.height);

        // Roots/Base area
        ctx.fillStyle = '#1a0d00';
        ctx.fillRect(sx, this.y - 10, 20, 10);

        // Foliage Clusters
        const cs = this.chunkScale;
        ctx.fillStyle = '#2e8b57'; // SeaGreen
        const fy = this.y - this.height;
        ctx.beginPath(); ctx.arc(sx + 10, fy - 20, 45 * cs, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#228b22'; // ForestGreen (slightly deeper)
        ctx.beginPath(); ctx.arc(sx - 20, fy + 10, 35 * cs, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + 40, fy + 10, 35 * cs, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + 10, fy + 30, 40 * cs, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }
    drawStump(ctx, cam) {
        if (!this.dead) return;
        const sx = this.x - cam.x;
        ctx.fillStyle = '#1a0d00'; ctx.fillRect(sx, this.y - 15, 20, 15);
        ctx.fillStyle = '#d2b48c'; ctx.beginPath(); ctx.ellipse(sx + 10, this.y - 15, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
        if (this.respawnTimer > 0) {
            ctx.fillStyle = '#aaa'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(`🌱 ${Math.ceil(this.respawnTimer)}s`, sx + 10, this.y - 22); ctx.textAlign = 'left';
        }
    }
}

// ─── ENEMY ────────────────────────────────────────────────────────────────────
class Enemy {
    constructor(world, x, guardX = null) {
        this.world = world; this.x = x; this.y = 0;
        this.vx = 0; this.vy = 0; this.facingRight = false;
        this.time = 0; this.maxHp = 60; this.hp = 60;
        this.speed = 80; this.dead = false; this.attackCd = 0; this.hurtTimer = 0;
        this.coinDropped = false; this.attackTimer = 0;
        this.guardX = guardX;
    }
    takeDamage(dmg) {
        this.hp -= dmg; triggerHitGlow(this); sfx.playHit();
        /*
        if (Math.random() < 0.3) {
            this.x += (this.facingRight ? -1 : 1) * 35; // Knockback effect
            this.time -= 0.5; // Stun animation
        }
        */
        if (this.hp <= 0) { this.dead = true; this.die(this.world); }
    }
    _findTarget() {
        let best = null; let bestDist = Infinity;
        // Check player
        const pd = Math.abs(this.x - this.world.game.player.x);
        if (pd < bestDist) { bestDist = pd; best = { x: this.world.game.player.x, entity: this.world.game.player, type: 'player' }; }
        // Check soldiers
        for (const s of this.world.soldiers) {
            if (s.dead) continue;
            const d = Math.abs(this.x - s.x);
            if (d < bestDist) { bestDist = d; best = { x: s.x, entity: s, type: 'soldier' }; }
        }
        // Check workers
        if (this.world.workers) {
            for (const w of this.world.workers) {
                if (w.dead) continue;
                const d = Math.abs(this.x - w.x);
                if (d < bestDist) { bestDist = d; best = { x: w.x, entity: w, type: 'worker' }; }
            }
        }
        // Check hunters
        if (this.world.hunters) {
            for (const h of this.world.hunters) {
                if (h.dead) continue;
                const d = Math.abs(this.x - h.x);
                if (d < bestDist) { bestDist = d; best = { x: h.x, entity: h, type: 'hunter' }; }
            }
        }
        // Check wood blocks
        for (const b of this.world.woodBlocks) {
            if (b.dead) continue;
            if (Math.sign(b.x - this.x) === Math.sign(this.world.outpost.x - this.x)) {
                const d = Math.abs(this.x - b.x);
                if (d < bestDist) { bestDist = d; best = { x: b.x, entity: b, type: 'block' }; }
            }
        }
        if (this.guardX !== null) {
            // Guard behavior: only aggro if target is within 450px
            return (bestDist < 450) ? best : null;
        }

        // Roaming enemy behavior: target outpost if nothing else is closer than 320px
        if (bestDist > 320) {
            best = { x: this.world.outpost.x, entity: this.world.outpost, type: 'outpost' };
        }
        return best;
    }
    update(dt) {
        this.time += dt;
        this.vy += 1200 * dt; this.y += this.vy * dt;
        if (this.y > this.world.groundY - 60) { this.y = this.world.groundY - 60; this.vy = 0; }
        if (this.attackCd > 0) this.attackCd -= dt;
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        if (this.attackTimer > 0) this.attackTimer -= dt;

        const target = this._findTarget();
        if (!target) {
            if (this.guardX !== null) {
                const distHome = Math.abs(this.x - this.guardX);
                if (distHome > 40) {
                    const dir = Math.sign(this.guardX - this.x);
                    this.vx = dir * (this.speed * 0.7);
                    this.facingRight = dir > 0;
                    this.x += this.vx * dt;
                } else {
                    this.vx = 0;
                    this.facingRight = false; // face left normally
                }
            } else {
                this.vx = 0;
            }
            return;
        }
        const dist = Math.abs(this.x - target.x);
        const attackRange = target.type === 'block' ? 55 : 65;

        if (dist > attackRange) {
            const dir = Math.sign(target.x - this.x);
            this.vx = dir * this.speed; this.facingRight = dir > 0;
            this.x += this.vx * dt;
        } else {
            this.vx = 0;
            if (this.attackCd <= 0) {
                this.attackCd = 1.2;
                this.attackTimer = 0.5;
                const t = target.entity;
                if (target.type === 'block') { t.takeDamage(10); }
                else if (target.type === 'player') { t.takeDamage(15); }
                else if (target.type === 'soldier' || target.type === 'worker' || target.type === 'hunter') { t.takeDamage(18); }
                else if (target.type === 'outpost' && !t.dead) { t.hp -= 1; if (t.hp < 0) t.hp = 0; }
            }
        }
    }
    die(world) {
        if (this.coinDropped) return;
        this.coinDropped = true;
        const coins = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < coins; i++) {
            // Drop coins on the ground floor, not at enemy Y
            world.groundItems.push(new GroundItem(world, this.x + (Math.random() - 0.5) * 50, world.groundY - 18, 'coin'));
        }
        for (let i = 0; i < 8; i++) world.particles.push(new Particle(this.x, this.y, '#9b00c8'));
    }
    draw(ctx, cam) {
        if (this.dead) return;
        const sx = this.x - cam.x, sy = this.y;
        const bob = Math.abs(Math.sin(this.time * 10)) * 4;
        ctx.save();
        applyHitGlow(ctx, this, '255,168,120');
        ctx.translate(sx, sy - bob);
        if (!this.facingRight) { ctx.translate(30, 0); ctx.scale(-1, 1); }
        const ls = this.vx !== 0 ? Math.sin(this.time * 10) * 8 : 0;
        ctx.fillStyle = '#1a0022'; ctx.fillRect(5 - ls, 40, 8, 20); ctx.fillRect(17 + ls, 40, 8, 20);
        ctx.fillStyle = '#2d003d'; ctx.fillRect(0, 15, 30, 30);
        ctx.fillStyle = 'purple'; ctx.fillRect(8, 18, 14, 10);

        // --- Swinging Arm & Sword ---
        ctx.save();
        ctx.translate(27, 24); // shoulder joint
        if (this.attackTimer > 0) {
            // Smooth arc swing forward
            const p = 1 - (this.attackTimer / 0.5);
            const swing = Math.sin(p * Math.PI) * -1.8;
            ctx.rotate(swing);
        }
        ctx.fillStyle = '#2d003d'; ctx.fillRect(-3, -9, 6, 18);
        ctx.fillStyle = '#888'; ctx.fillRect(-1.5, 9, 3, 20);
        ctx.fillStyle = '#ccc'; ctx.fillRect(-3.5, 28, 7, 4); ctx.fillRect(-1.5, 32, 3, 8);
        ctx.restore();
        ctx.fillStyle = '#ffe0e0'; ctx.fillRect(24, 33, 6, 6);
        ctx.fillStyle = '#3a004d'; ctx.fillRect(5, -5, 20, 22);
        ctx.fillStyle = '#6a0080'; ctx.fillRect(10, 5, 10, 5);
        ctx.restore();
        ctx.fillStyle = '#500'; ctx.fillRect(sx - 5, sy - 22, 40, 5);
        ctx.fillStyle = '#e00'; ctx.fillRect(sx - 5, sy - 22, (this.hp / this.maxHp) * 40, 5);
    }
}

// ─── ENEMY ARCHER ─────────────────────────────────────────────────────────────
class EnemyArcher extends Enemy {
    constructor(world, x, guardX = null) {
        super(world, x, guardX);
        this.maxHp = 40; this.hp = 40;
        this.shootRange = 320; this.preferDist = 200;
        this.drawTimer = 0; this.shootCd = 0;
        this.drawingBow = false;
    }
    update(dt) {
        this.time += dt;
        this.vy += 1200 * dt; this.y += this.vy * dt;
        if (this.y > this.world.groundY - 60) { this.y = this.world.groundY - 60; this.vy = 0; }
        if (this.shootCd > 0) this.shootCd -= dt;
        if (this.hurtTimer > 0) this.hurtTimer -= dt;

        const target = this._findTarget();
        if (!target) { this.drawingBow = false; this.drawTimer = 0; return; }

        const dist = Math.abs(this.x - target.x);
        if (dist < this.shootRange) {
            const dir = Math.sign(target.x - this.x);
            this.facingRight = dir > 0;
            if (dist < this.preferDist - 20) { this.vx = -dir * 100; }
            else if (dist > this.preferDist + 20) { this.vx = dir * 100; }
            else { this.vx = 0; }
            this.drawingBow = true;
            this.drawTimer += dt;
            if (this.drawTimer > 1.2 && this.shootCd <= 0) {
                this.drawTimer = 0; this.shootCd = 2.0;
                this.world.arrows.push(new Arrow(this.world, this.x + 15, this.y + 10, target.x + 15, target.entity.y || this.world.groundY - 30, true));
            }
        } else {
            this.drawingBow = false; this.drawTimer = 0;
            const dir = Math.sign(target.x - this.x);
            this.vx = dir * this.speed; this.facingRight = dir > 0;
        }
        this.x += this.vx * dt;
    }
    draw(ctx, cam) {
        if (this.dead) return;
        const sx = this.x - cam.x, sy = this.y;
        const bob = Math.abs(Math.sin(this.time * 10)) * 4;
        ctx.save();
        applyHitGlow(ctx, this, '255,168,120');
        ctx.translate(sx, sy - bob);
        if (!this.facingRight) { ctx.translate(30, 0); ctx.scale(-1, 1); }
        const ls = this.vx !== 0 ? Math.sin(this.time * 10) * 8 : 0;
        ctx.fillStyle = '#1a0022'; ctx.fillRect(5 - ls, 40, 8, 20); ctx.fillRect(17 + ls, 40, 8, 20);
        ctx.fillStyle = '#3d001f'; ctx.fillRect(0, 15, 30, 30);
        ctx.fillStyle = '#3a0020'; ctx.fillRect(5, -5, 20, 22);
        ctx.fillStyle = '#6a0080'; ctx.fillRect(10, 5, 10, 5);

        ctx.save();
        ctx.translate(22, 18);
        if (this.drawingBow) {
            const drawFraction = Math.min(1, this.drawTimer / 1.2);
            ctx.rotate(-0.8 - drawFraction * 0.3);
            const pull = drawFraction * 12;
            ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(22, -10); ctx.lineTo(10 + pull, 10); ctx.lineTo(22, 30); ctx.stroke();
            ctx.fillStyle = '#4a2f1d'; ctx.fillRect(8 + pull, 8, 20, 2);
        } else {
            ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(22, -10); ctx.lineTo(22, 30); ctx.stroke();
        }
        ctx.strokeStyle = '#30180a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(6, 10, 20, -1.2, 1.2); ctx.stroke();
        ctx.restore();

        ctx.restore();
        ctx.fillStyle = '#500'; ctx.fillRect(sx - 5, sy - 22, 40, 5);
        ctx.fillStyle = '#e00'; ctx.fillRect(sx - 5, sy - 22, (this.hp / this.maxHp) * 40, 5);
    }
}

// ─── BOSS DRAGON ──────────────────────────────────────────────────────────────
class EnemyDragon extends Enemy {
    constructor(world, x, guardX = null) {
        super(world, x, guardX);
        this.maxHp = 300; this.hp = 300;
        this.speed = 36; // -10% speed
        this.attackCd = 0; this.shootCd = 0;
        this.walkDist = 0;
    }
    _findTargetDragon() {
        let best = null; let bestDist = Infinity;
        const targets = [
            ...this.world.farms, ...this.world.barracks, ...this.world.woodBlocks, this.world.outpost,
            this.world.game.player, ...this.world.soldiers, ...this.world.archers, ...this.world.hunters
        ];
        for (const t of targets) {
            if (t.dead || (t.hp !== undefined && t.hp <= 0)) continue;
            const d = Math.abs(this.x - t.x);
            if (d < bestDist) {
                bestDist = d;
                best = { x: t.x, entity: t, type: 'any' };
            }
        }
        return best;
    }
    update(dt) {
        this.time += dt;
        // Fix leg clipping through ground. Foot reaches local y = 140.
        this.y = this.world.groundY - 140;
        this.vy = 0;
        if (this.attackCd > 0) this.attackCd -= dt;
        if (this.shootCd > 0) this.shootCd -= dt;
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        if (Math.abs(this.vx) > 0) this.walkDist += dt * 7;

        // --- Heat Sink Vents (Particles) ---
        if (!this.dead && Math.random() < 0.15) {
            const ventX = this.x + (this.facingRight ? -40 : 40);
            const ventY = this.y - 60; // Top of the cyborg body shell
            this.world.particles.push(new Particle(ventX, ventY, 'rgba(0, 245, 255, 0.4)', (this.facingRight ? -1 : 1) * 20, -30));
        }

        const target = this._findTargetDragon() || this._findTarget();
        if (!target) return;
        const dist = Math.abs(this.x - target.x);

        if (dist > 160) { // Adjust distance to original 1.0x scale
            const dir = Math.sign(target.x - this.x);
            this.vx = dir * this.speed; this.facingRight = dir > 0;
            this.x += this.vx * dt;
        } else {
            this.vx = 0;
            const dir = Math.sign(target.x - this.x);
            this.facingRight = dir > 0;

            // --- LASER BEAM ATTACK ---
            if (this.shootCd <= 0) {
                this.shootCd = 3.5;
                const mouthX = this.x + (this.facingRight ? 110 : -110);
                const mouthY = this.y - 85; // Align exact with jaw center
                const targetY = target.entity?.y ?? (this.world.groundY - 30);
                this.world.arrows.push(new LaserBeam(this.world, mouthX, mouthY, target.x, targetY));
            }

            // --- MELEE ATTACK ---
            if (dist < 150 && this.attackCd <= 0) {
                this.attackCd = 2.0;
                const t = target.entity;
                if (t.takeDamage) t.takeDamage(45);
                else { t.hp -= 30; sfx.playHit(); if (t.hp < 0) { t.hp = 0; if (t !== this.world.outpost) t.dead = true; } }
            }
        }
    }
    die(world) {
        if (this.coinDropped) return;
        this.coinDropped = true;
        for (let i = 0; i < 20; i++) world.groundItems.push(new GroundItem(world, this.x + (Math.random() - 0.5) * 120, world.groundY - 18, 'coin'));
        for (let i = 0; i < 30; i++) world.particles.push(new Particle(this.x, this.y, '#ff4400'));
    }
    draw(ctx, cam) {
        if (this.dead) return;
        const sx = this.x - cam.x, sy = this.y;

        ctx.save();
        applyHitGlow(ctx, this, '0,245,255');

        // --- Scale & Base Translation ---
        ctx.translate(sx, sy);
        if (!this.facingRight) ctx.scale(-1, 1);

        const bob = Math.sin(this.time * 5) * 5;
        const walk = Math.sin(this.walkDist);
        const breath = Math.sin(this.time * 3);

        const colors = {
            plate: '#1e1e24', metal: '#4a4a58', lightMetal: '#888899',
            neon: '#00f5ff', glow: 'rgba(0, 245, 255, 0.5)', eye: '#ffea00', accent: '#ff0054'
        };

        // --- Shadow ---
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(-20, 140, 90, 20, 0, 0, Math.PI * 2); ctx.fill();

        ctx.translate(0, bob);

        // --- Back Leg ---
        ctx.save();
        ctx.translate(-20 - walk * 25, 30);
        ctx.rotate(0.2 + walk * 0.4);
        ctx.fillStyle = colors.plate;
        ctx.beginPath(); ctx.roundRect(-25, -20, 50, 70, 15); ctx.fill();
        ctx.strokeStyle = colors.metal; ctx.lineWidth = 2; ctx.stroke();
        // Lower Leg
        ctx.translate(0, 50); ctx.rotate(-0.4 - walk * 0.5);
        ctx.fillStyle = colors.metal; ctx.beginPath(); ctx.roundRect(-15, 0, 30, 60, [5, 5, 10, 10]); ctx.fill();
        ctx.restore();

        // --- Tail Segmented ---
        const tailWag = Math.sin(this.time * 3) * 15;
        let lastX = -35, lastY = 10;
        ctx.save();
        for (let i = 1; i <= 6; i++) {
            const segRot = (tailWag / 10) * (i / 6) - 0.2;
            ctx.translate(lastX, lastY); ctx.rotate(segRot);
            ctx.fillStyle = colors.plate; const size = 45 - i * 6;
            ctx.beginPath(); ctx.roundRect(-size, -size / 2, size, size, 5); ctx.fill();
            ctx.strokeStyle = colors.lightMetal; ctx.lineWidth = 1; ctx.stroke();
            lastX = -size + 5; lastY = 0;
        }
        ctx.restore();

        // --- Body ---
        const bodyGrad = ctx.createLinearGradient(0, -60, 0, 60);
        bodyGrad.addColorStop(0, '#2c2c34'); bodyGrad.addColorStop(1, '#0a0a0d');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath(); ctx.ellipse(15, 0, 60, 95, 0.4, 0, Math.PI * 2); ctx.fill();
        // Neon Conduits
        ctx.strokeStyle = colors.neon; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + breath * 0.4;
        ctx.beginPath(); ctx.moveTo(-5, -40); ctx.quadraticCurveTo(20, -50, 35, -20); ctx.stroke();
        ctx.globalAlpha = 1.0;

        // --- Arms ---
        const armWave = Math.sin(this.time * 6) * 12;
        ctx.save();
        ctx.translate(50, -10 + armWave);
        ctx.strokeStyle = colors.metal; ctx.lineWidth = 12; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(30, 20); ctx.stroke();
        ctx.translate(30, 20); ctx.rotate(0.5 + Math.sin(this.time * 8) * 0.2);
        ctx.strokeStyle = colors.lightMetal; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(40, -10); ctx.stroke();
        // Claw
        ctx.fillStyle = colors.lightMetal; ctx.save(); ctx.translate(40, -10);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15, 0); ctx.lineTo(12, 5); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.restore();

        // --- Head ---
        const headNod = Math.sin(this.time * 4) * 0.12;
        ctx.save();
        ctx.translate(65, -85);
        ctx.rotate(headNod);
        ctx.fillStyle = colors.plate; ctx.beginPath(); ctx.roundRect(-20, -35, 110, 75, [10, 40, 25, 10]); ctx.fill();
        ctx.strokeStyle = colors.metal; ctx.lineWidth = 2; ctx.stroke();
        // Visor
        ctx.fillStyle = '#0a0a0a'; ctx.fillRect(15, -12, 65, 18);
        const scanX = 15 + ((this.time * 80) % 65);

        let charge = 1 - (this.shootCd / 3.5); if (charge < 0) charge = 0;
        ctx.fillStyle = `rgba(0, 255, 255, ${0.1 + charge * 0.9})`;
        ctx.fillRect(15, -12, 65 * charge, 18); // Fill bar based on laser charge

        ctx.fillStyle = '#fff'; ctx.fillRect(scanX, -12, 4, 18);
        // Teeth
        ctx.fillStyle = '#d1d1d1'; const jawDrop = 5 + Math.sin(this.time * 12) * 4;
        for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(25 + i * 10, 10); ctx.lineTo(30 + i * 10, 22); ctx.lineTo(35 + i * 10, 10); ctx.fill(); }
        // Lower Jaw
        ctx.fillStyle = colors.plate; ctx.save(); ctx.translate(10, 30 + jawDrop);
        ctx.beginPath(); ctx.roundRect(0, 0, 70, 15, [2, 10, 10, 2]); ctx.fill();
        ctx.restore();
        // Plasma
        ctx.globalCompositeOperation = 'lighter';
        const pulse = 30 + breath * 15;
        const pGrad = ctx.createRadialGradient(100, 10, 5, 100, 10, pulse);
        pGrad.addColorStop(0, '#fff'); pGrad.addColorStop(0.2, colors.neon); pGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = pGrad; ctx.beginPath(); ctx.arc(100, 10, pulse, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();

        // --- Front Leg ---
        ctx.save();
        ctx.translate(30 + walk * 25, 45);
        ctx.rotate(-0.1 - walk * 0.4);
        ctx.fillStyle = colors.plate; ctx.beginPath(); ctx.roundRect(-30, -25, 60, 80, 20); ctx.fill();
        ctx.translate(0, 60); ctx.rotate(0.2 + walk * 0.3);
        ctx.fillStyle = colors.plate; ctx.fillRect(-20, 0, 40, 65);
        ctx.strokeStyle = colors.neon; ctx.strokeRect(-20, 0, 40, 65);
        ctx.restore();

        ctx.restore();

        // --- HP Bar (Centered) ---
        const hpY = sy - 150;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(sx - 50, hpY, 200, 12);
        ctx.fillStyle = '#ff0054'; ctx.fillRect(sx - 50, hpY, (this.hp / this.maxHp) * 200, 12);
        ctx.strokeStyle = 'white'; ctx.lineWidth = 1; ctx.strokeRect(sx - 50, hpY, 200, 12);
    }
}

// ─── SHOP ─────────────────────────────────────────────────────────────────────
class Shop {
    constructor(world, x, type) {
        this.world = world; this.x = x; this.y = world.groundY; this.type = type;
    }
    draw(ctx, cam, player) {
        const sx = this.x - cam.x, dist = Math.abs(this.x - player.x);

        ctx.save();
        if (this.type === 'refuge') {
            // Triangle tent & campfire
            ctx.fillStyle = '#6b543c'; // tent fabric
            ctx.beginPath(); ctx.moveTo(sx, this.y - 45); ctx.lineTo(sx - 35, this.y); ctx.lineTo(sx + 35, this.y); ctx.fill();
            ctx.fillStyle = '#222'; // tent interior
            ctx.beginPath(); ctx.moveTo(sx, this.y - 30); ctx.lineTo(sx - 15, this.y); ctx.lineTo(sx + 15, this.y); ctx.fill();
            ctx.strokeStyle = '#4a3622'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(sx, this.y - 45); ctx.lineTo(sx - 35, this.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx, this.y - 45); ctx.lineTo(sx + 35, this.y); ctx.stroke();

            // tiny campfire
            const t = this.world.game ? this.world.game.lastTime / 1000 : 0;
            ctx.fillStyle = '#442211'; ctx.fillRect(sx + 40, this.y - 4, 15, 4);
            const fireH = 8 + Math.random() * 6;
            ctx.fillStyle = '#ffaa00'; ctx.beginPath(); ctx.moveTo(sx + 47, this.y - 4); ctx.lineTo(sx + 42, this.y - 4 - fireH); ctx.lineTo(sx + 52, this.y - 4 - fireH * 0.8); ctx.fill();
            ctx.fillStyle = '#ff4400'; ctx.beginPath(); ctx.moveTo(sx + 47, this.y - 4); ctx.lineTo(sx + 45, this.y - 4 - fireH * 0.6); ctx.lineTo(sx + 49, this.y - 4 - fireH * 0.5); ctx.fill();
        } else if (this.type === 'axe' || this.type === 'hammer') {
            // Weapon / Forge Shop
            ctx.fillStyle = '#2b2b2b'; ctx.fillRect(sx - 45, this.y - 70, 90, 70); // Frame
            ctx.fillStyle = '#111'; ctx.fillRect(sx - 40, this.y - 65, 80, 65); // Interior
            // Forge fire glow
            const t = this.world.game ? this.world.game.lastTime / 1000 : 0;
            ctx.fillStyle = `rgba(255, 68, 0, ${0.4 + Math.sin(t * 10) * 0.1})`;
            ctx.fillRect(sx - 30, this.y - 30, 60, 30);
            // Anvil / Workbench
            ctx.fillStyle = '#444'; ctx.fillRect(sx - 20, this.y - 20, 40, 20);
            ctx.fillRect(sx - 25, this.y - 30, 50, 10);
            ctx.fillStyle = '#222'; ctx.fillRect(sx - 5, this.y - 20, 10, 20);
            if (this.type === 'axe') {
                ctx.fillStyle = '#aaa'; ctx.fillRect(sx - 35, this.y - 50, 4, 30); ctx.fillRect(sx + 30, this.y - 50, 4, 30);
                ctx.fillStyle = '#8b4513'; ctx.fillRect(sx - 38, this.y - 25, 10, 4); ctx.fillRect(sx + 27, this.y - 25, 10, 4);
                ctx.fillStyle = '#ddd'; ctx.fillRect(sx, this.y - 60, 10, 3); ctx.fillStyle = '#8b4513'; ctx.fillRect(sx + 3, this.y - 57, 4, 20);
            } else {
                const t = this.world.game ? this.world.game.lastTime / 1000 : 0;
                const p = 0.7 + Math.sin(t * 8) * 0.3;
                // High-End Hammer Shop Display
                ctx.fillStyle = '#111'; ctx.fillRect(sx - 2, this.y - 50, 4, 35); // Obsidian Handle
                ctx.fillStyle = '#222'; ctx.fillRect(sx - 12, this.y - 65, 24, 15); // Large Head
                ctx.fillStyle = `rgba(255, 100, 0, ${p})`; ctx.fillRect(sx - 10, this.y - 60, 20, 5); // Glowing Core
                ctx.fillStyle = '#ffaa00'; // Flame flickering
                for (let i = 0; i < 3; i++) {
                    const h = 8 + Math.sin(t * 15 + i) * 4;
                    ctx.fillRect(sx - 8 + i * 7, this.y - 65 - h, 2, h);
                }
            }
            // Roof
            ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.moveTo(sx - 50, this.y - 70); ctx.lineTo(sx + 50, this.y - 70); ctx.lineTo(sx + 40, this.y - 90); ctx.lineTo(sx - 40, this.y - 90); ctx.fill();
            ctx.fillStyle = '#111'; ctx.fillRect(sx - 10, this.y - 110, 20, 20);
        } else {
            // Resource / Sell Shop
            ctx.fillStyle = '#6b4226'; ctx.fillRect(sx - 40, this.y - 60, 80, 60); // Main struct
            ctx.fillStyle = '#8b5a2b'; ctx.fillRect(sx - 45, this.y - 25, 90, 25); // Counter
            // Canopy
            for (let i = 0; i < 9; i++) {
                ctx.fillStyle = i % 2 === 0 ? '#ccaa44' : '#aa3333';
                ctx.fillRect(sx - 45 + i * 10, this.y - 80, 10, 40);
                ctx.beginPath(); ctx.arc(sx - 40 + i * 10, this.y - 40, 5, 0, Math.PI); ctx.fill();
            }
            // Sacks & Logs
            ctx.fillStyle = '#e8cfa6'; ctx.beginPath(); ctx.ellipse(sx - 50, this.y - 10, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sx - 42, this.y - 8, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#d2b48c'; ctx.fillRect(sx - 50, this.y - 20, 6, 10); ctx.fillRect(sx - 42, this.y - 18, 6, 10);
            ctx.fillStyle = '#5c3a21'; ctx.beginPath(); ctx.arc(sx + 45, this.y - 10, 8, 0, Math.PI * 2); ctx.arc(sx + 55, this.y - 10, 8, 0, Math.PI * 2); ctx.arc(sx + 50, this.y - 20, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#e6c280'; ctx.beginPath(); ctx.arc(sx + 45, this.y - 10, 6, 0, Math.PI * 2); ctx.arc(sx + 55, this.y - 10, 6, 0, Math.PI * 2); ctx.arc(sx + 50, this.y - 20, 6, 0, Math.PI * 2); ctx.fill();
            // Golden Dollar Sign on roof
            ctx.fillStyle = '#ffd700'; ctx.font = 'bold 24px serif'; ctx.textAlign = 'center';
            ctx.fillText('$', sx, this.y - 85); ctx.textAlign = 'left';
        }
        ctx.restore();

        if (dist < 60) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            if (this.type === 'hammer') {
                ctx.fillRect(sx - 110, this.y - 130, 220, 50);
                ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Buy Flame Hammer 1000G [E]', sx, this.y - 116);
                ctx.fillStyle = '#ffaa00'; ctx.font = '11px sans-serif';
                ctx.fillText('100 DMG + Fire Element', sx, this.y - 100);
                ctx.textAlign = 'left';
            } else if (this.type === 'axe') {
                const hasAxe = player.inventory.hasAxe;
                const hasSword = player.inventory.hasSword;
                const hasHammer = player.inventory.hasHammer;
                // bigger box when showing hammer offer
                const boxH = hasSword && !hasHammer ? 60 : 50;
                ctx.fillRect(sx - 110, this.y - 140, 220, boxH + 10);
                ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
                if (!hasAxe) {
                    ctx.fillText('Buy Axe 10G [E]', sx, this.y - 128);
                    ctx.fillStyle = '#aaa'; ctx.font = '11px sans-serif';
                    ctx.fillText('30 dmg + chop trees', sx, this.y - 112);
                } else if (!hasSword) {
                    ctx.fillText('Buy Sword 50G [E]', sx, this.y - 128);
                    ctx.fillStyle = '#aaa'; ctx.font = '11px sans-serif';
                    ctx.fillText('55 dmg, fast strikes', sx, this.y - 112);
                } else if (!hasHammer) {
                    ctx.fillStyle = '#ffaa00'; ctx.font = 'bold 13px sans-serif';
                    ctx.fillText('🔥 Buy Flame Hammer 1000G [E]', sx, this.y - 128);
                    ctx.fillStyle = '#ff8800'; ctx.font = '11px sans-serif';
                    ctx.fillText('100 dmg + Fire Element! Boss killer!', sx, this.y - 112);
                    ctx.fillStyle = '#ffcc00'; ctx.font = '10px sans-serif';
                    ctx.fillText('Unlocked after sword mastery', sx, this.y - 98);
                } else {
                    ctx.fillStyle = '#aaa';
                    ctx.fillText('✔ All weapons owned!', sx, this.y - 118);
                }
                ctx.textAlign = 'left';
            } else if (this.type === 'refuge') {
                ctx.fillRect(sx - 110, this.y - 145, 220, 85);
                ctx.fillStyle = '#f5c842'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
                const cost = this.world.outpost.level >= 2 ? 5 : 2;
                ctx.fillText(`Hire Worker ${cost} Wheat [1]`, sx, this.y - 128);
                ctx.fillStyle = '#aaa'; ctx.font = '11px sans-serif';
                ctx.fillText('Chops trees automatically', sx, this.y - 112);

                ctx.fillStyle = '#c8102e'; ctx.font = 'bold 13px sans-serif';
                ctx.fillText('Hire Hunter 5 Wood [2]', sx, this.y - 94);
                ctx.fillStyle = '#aaa'; ctx.font = '11px sans-serif';
                ctx.fillText('Hunts wildlife and shoots enemies', sx, this.y - 78);
                ctx.textAlign = 'left';
            } else {
                ctx.fillRect(sx - 130, this.y - 160, 260, 115);
                ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Sell Wood 2G each', sx, this.y - 128);
                ctx.fillText('Sell Wheat 3G each', sx, this.y - 114);
                ctx.fillText('Sell Meat 3G each', sx, this.y - 100);
                ctx.fillStyle = '#f5c842'; ctx.font = 'bold 10px sans-serif';
                ctx.fillText('Tap: E(Wood) | R(Wheat) | Y(Meat)', sx, this.y - 84);
                ctx.fillText('Hold: E(Wd) | R(Wh) | Y(Mt) (SELL ALL)', sx, this.y - 68);
                ctx.textAlign = 'left';
            }
        }
    }
}

// ─── NPC CIVILIAN ─────────────────────────────────────────────────────────────
class NPC {
    constructor(world, x) {
        this.world = world; this.x = x; this.y = world.groundY - 60; this.vx = 0; this.vy = 0;
        this.facingRight = true; this.time = 0; this.state = 'idle';
        this.stateTimer = Math.random() * 2; this.targetX = x;
        this.tunicColor = `hsl(${Math.random() * 60 + 20},50%,40%)`;
        this.dialogue = ''; this.dialogueTimer = 0;
        this.replyTimer = 0; this.replyContent = '';
        this.hairStyle = Math.random() > 0.5 ? 'spiky' : 'normal';
        this.hairColor = ['#5a3826', '#333333', '#884422', '#cca444'][Math.floor(Math.random() * 4)];
    }
    update(dt) {
        this.time += dt;
        this.vy += 1200 * dt; this.y += this.vy * dt;
        if (this.y > this.world.groundY - 60) { this.y = this.world.groundY - 60; this.vy = 0; }
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
            if (this.state === 'idle') { this.state = 'walk'; this.stateTimer = 2 + Math.random() * 3; this.targetX = this.x + (Math.random() - 0.5) * 300; this.facingRight = this.targetX > this.x; }
            else { this.state = 'idle'; this.stateTimer = 1 + Math.random() * 4; }
        }
        if (this.state === 'walk') {
            const d = Math.sign(this.targetX - this.x);
            this.vx = d * 90; this.x += this.vx * dt;
            if (Math.abs(this.targetX - this.x) < 5) this.state = 'idle';
        } else this.vx = 0;

        if (this.dialogueTimer > 0) this.dialogueTimer -= dt;
        if (this.replyTimer > 0) {
            this.replyTimer -= dt;
            if (this.replyTimer <= 0) {
                this.dialogue = this.replyContent; this.dialogueTimer = 3; this.replyContent = '';
                this.state = 'idle'; this.stateTimer = 3; // Stop to talk
            }
        }
        // Randomly start a talk (Slower pace)
        if (this.dialogueTimer <= 0 && this.replyTimer <= 0 && Math.random() < 0.0008) {
            this._startDialogue();
        }
    }

    _startDialogue() {
        const topics = [
            { q: "Long live the King!", a: "He is a wise leader indeed." },
            { q: "I heard the developer comes from Stinis!", a: "No wonder the pixel art is so charming!" },
            { q: "Have you seen the King's new hammer?", a: "I heard it shoots fire if you focus long enough..." },
            { q: "Holding E with that focus... magic!", a: "The Flame Hammer is truly a relic of old." },
            { q: "The army is coming, we should be ready.", a: "The walls will hold... I hope." },
            { q: "Building more farms is the key to growth.", a: "And more archers to protect those farms!" },
            { q: "Beautiful night, isn't it?", a: "Except for the giant dragons, yes." }
        ];
        const randomShouts = ["Lovely weather!", "Stay safe!", "Need more wood?", "Watch the skies!", "For the Kingdom!"];

        const isConv = Math.random() < 0.6;
        if (isConv) {
            const pair = topics[Math.floor(Math.random() * topics.length)];
            this.dialogue = pair.q; this.dialogueTimer = 3; this.state = 'idle'; this.stateTimer = 3;
            const neighbor = this.world.npcs.find(n => n !== this && Math.abs(n.x - this.x) < 120);
            if (neighbor && neighbor.dialogueTimer <= 0 && neighbor.replyTimer <= 0) {
                neighbor.replyContent = pair.a; neighbor.replyTimer = 1.6;
                neighbor.facingRight = this.x > neighbor.x; this.facingRight = neighbor.x > this.x;
            }
        } else {
            this.dialogue = randomShouts[Math.floor(Math.random() * randomShouts.length)];
            this.dialogueTimer = 2.5;
        }
    }

    draw(ctx, cam) {
        const sx = this.x - cam.x, sy = this.y;
        const bob = this.state === 'walk' ? Math.abs(Math.sin(this.time * 12)) * 3 : Math.sin(this.time * 2);

        // 1. NPC Body (Flippable)
        ctx.save();
        ctx.translate(sx, sy - bob);
        if (!this.facingRight) { ctx.translate(30, 0); ctx.scale(-1, 1); }
        const ls = this.state === 'walk' ? Math.sin(this.time * 12) * 5 : 0;
        ctx.fillStyle = '#2d241f'; ctx.fillRect(6 - ls, 42, 7, 16); ctx.fillRect(17 + ls, 42, 7, 16);
        ctx.fillStyle = '#13100d'; ctx.fillRect(5 - ls, 56, 9, 4); ctx.fillRect(16 + ls, 56, 9, 4);
        ctx.fillStyle = '#6f4d2e'; ctx.fillRect(1, 19, 5, 17);
        ctx.fillStyle = '#f1c6a3'; ctx.fillRect(1, 34, 5, 5);
        ctx.fillStyle = this.tunicColor;
        ctx.beginPath();
        ctx.moveTo(4, 16); ctx.lineTo(26, 16); ctx.lineTo(30, 40); ctx.lineTo(24, 44); ctx.lineTo(6, 44); ctx.lineTo(0, 40); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.beginPath();
        ctx.moveTo(11, 17); ctx.lineTo(19, 17); ctx.lineTo(21, 41); ctx.lineTo(9, 41); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#6b4b2f'; ctx.fillRect(4, 39, 22, 4);
        ctx.fillStyle = '#d7c39a'; ctx.fillRect(8, 24, 14, 3);
        ctx.fillStyle = '#6a482e'; ctx.fillRect(24, 19, 5, 17);
        ctx.fillStyle = '#f1c6a3'; ctx.fillRect(24, 34, 5, 5);
        ctx.fillStyle = this.hairColor;
        if (this.hairStyle === 'spiky') {
            ctx.beginPath();
            ctx.moveTo(5, 5); ctx.lineTo(8, -16); ctx.lineTo(12, -8);
            ctx.lineTo(15, -20); ctx.lineTo(18, -8);
            ctx.lineTo(24, -16); ctx.lineTo(26, 5);
            ctx.closePath(); ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo(5, 5); ctx.quadraticCurveTo(5, -16, 15, -14); ctx.quadraticCurveTo(25, -16, 26, 5); ctx.lineTo(15, 10); ctx.closePath();
            ctx.fill();
        }
        ctx.fillStyle = '#f4caaa'; ctx.fillRect(12, 12, 6, 5);
        ctx.beginPath(); ctx.ellipse(15, 2, 11, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e2b18f';
        ctx.beginPath(); ctx.ellipse(7, 3, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2b1a12'; ctx.fillRect(15, -1, 3, 2); ctx.fillRect(20, 0, 2, 2);
        ctx.restore();

        // 2. Dialogue bubble (Isolated from horizontal flip scale)
        if (this.dialogueTimer > 0) {
            ctx.save();
            ctx.translate(sx + 15, sy - bob);
            ctx.font = 'bold 11px sans-serif';
            const maxWidth = 130;
            const words = this.dialogue.split(' ');
            const lines = [];
            let currentLine = words[0];

            for (let i = 1; i < words.length; i++) {
                if (ctx.measureText(currentLine + " " + words[i]).width < maxWidth) {
                    currentLine += " " + words[i];
                } else {
                    lines.push(currentLine);
                    currentLine = words[i];
                }
            }
            lines.push(currentLine);

            const lineHt = 14;
            const bh = lines.length * lineHt + 12;
            let maxLineW = 0;
            lines.forEach(l => maxLineW = Math.max(maxLineW, ctx.measureText(l).width));
            const bw = maxLineW + 20;
            const bx = -bw / 2, by = -45 - bh;

            // Glass bubble (Adjusted to 70% opacity / 30% transparent)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill();

            // Pointer
            ctx.beginPath(); ctx.moveTo(0, by + bh); ctx.lineTo(-5, by + bh + 8); ctx.lineTo(5, by + bh); ctx.fill();

            ctx.fillStyle = '#111'; ctx.textAlign = 'center';
            lines.forEach((line, idx) => {
                ctx.fillText(line, 0, by + 16 + idx * lineHt);
            });
            ctx.restore();
        }
    }
}

// ─── WORKER ───────────────────────────────────────────────────────────────────
class Worker {
    constructor(world, x) {
        this.world = world; this.x = x; this.y = world.groundY - 60; this.vx = 0; this.vy = 0;
        this.facingRight = true; this.time = 0; this.state = 'idle';
        this.targetTree = null; this.chopTimer = 0; this.carryingLogs = 0;
        this.hairStyle = Math.random() > 0.5 ? 'spiky' : 'normal';
        this.hairColor = ['#5a3826', '#333333', '#884422', '#cca444'][Math.floor(Math.random() * 4)];
        this.maxHp = 40; this.hp = 40; this.dead = false;
        this.tunicColor = '#b57b45';
        this.dialogueTimer = 0; this.dialogue = ''; this.hurtTimer = 0;
    }
    takeDamage(dmg) {
        this.hp -= dmg; triggerHitGlow(this); sfx.playHit();
        if (this.hp <= 0) this.dead = true;
    }
    update(dt) {
        if (this.dead) return;
        this.time += dt;
        this.vy += 1200 * dt; this.y += this.vy * dt;
        if (this.y > this.world.groundY - 60) { this.y = this.world.groundY - 60; this.vy = 0; }

        if (this.dialogueTimer > 0) this.dialogueTimer -= dt;
        if (this.hurtTimer > 0) this.hurtTimer -= dt;

        if (this.state === 'idle') {
            if (this.carryingLogs > 0) {
                this.state = 'return_with_logs';
            } else {
                let nearest = null; let bestDist = Infinity;
                for (const t of this.world.foregroundTrees) {
                    if (t.dead) continue;
                    let d = Math.abs(t.x - this.x);
                    if (d < bestDist) { bestDist = d; nearest = t; }
                }
                if (nearest) {
                    this.targetTree = nearest;
                    this.state = 'walk_to_tree';
                }
            }
        } else if (this.state === 'walk_to_tree') {
            if (!this.targetTree || this.targetTree.dead) {
                this.state = 'idle'; this.targetTree = null; this.vx = 0; return;
            }
            const d = Math.abs(this.targetTree.x - this.x);
            if (d < 40) {
                this.vx = 0; this.state = 'chopping';
            } else {
                const dir = Math.sign(this.targetTree.x - this.x);
                this.vx = dir * 80; this.facingRight = dir > 0;
            }
        } else if (this.state === 'chopping') {
            if (!this.targetTree || this.targetTree.dead) {
                this.carryingLogs = 3; this.state = 'return_with_logs'; this.targetTree = null;
            } else {
                this.chopTimer += dt;
                if (this.chopTimer >= 1.0) {
                    this.chopTimer = 0;
                    this.targetTree.hit();
                }
            }
        } else if (this.state === 'return_with_logs') {
            const outX = this.world.outpost.x;
            const d = Math.abs(outX - this.x);
            if (d < 50) {
                this.vx = 0;
                for (let i = 0; i < this.carryingLogs; i++) {
                    this.world.groundItems.push(new GroundItem(this.world, this.x + (Math.random() - 0.5) * 40, this.world.groundY - 16, 'log'));
                }
                this.carryingLogs = 0;
                this.state = 'idle';
            } else {
                const dir = Math.sign(outX - this.x);
                this.vx = dir * 80; this.facingRight = dir > 0;
            }
        }
        this.x += this.vx * dt;
    }
    draw(ctx, cam) {
        if (this.dead) return;
        const sx = this.x - cam.x, sy = this.y;
        const isWalk = this.state === 'walk_to_tree' || this.state === 'return_with_logs';
        const bob = isWalk ? Math.abs(Math.sin(this.time * 12)) * 3 : Math.sin(this.time * 2);
        ctx.save();
        applyHitGlow(ctx, this);
        ctx.translate(sx, sy - bob);
        if (!this.facingRight) { ctx.translate(30, 0); ctx.scale(-1, 1); }
        const ls = isWalk ? Math.sin(this.time * 12) * 5 : 0;
        ctx.fillStyle = '#32261c'; ctx.fillRect(6 - ls, 42, 7, 16); ctx.fillRect(17 + ls, 42, 7, 16);
        ctx.fillStyle = '#1a130e'; ctx.fillRect(5 - ls, 56, 9, 4); ctx.fillRect(16 + ls, 56, 9, 4);
        ctx.fillStyle = '#6b4826'; ctx.fillRect(1, 19, 5, 17);
        ctx.fillStyle = '#f1c6a3'; ctx.fillRect(1, 34, 5, 5);
        ctx.fillStyle = this.tunicColor;
        ctx.beginPath();
        ctx.moveTo(4, 16); ctx.lineTo(26, 16); ctx.lineTo(30, 40); ctx.lineTo(24, 44); ctx.lineTo(6, 44); ctx.lineTo(0, 40); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#8b5a2b';
        ctx.beginPath();
        ctx.moveTo(11, 17); ctx.lineTo(19, 17); ctx.lineTo(21, 41); ctx.lineTo(9, 41); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#5a3820'; ctx.fillRect(4, 39, 22, 4);
        ctx.fillStyle = '#d7b36a'; ctx.fillRect(8, 24, 14, 3);
        ctx.fillStyle = this.hairColor;
        if (this.hairStyle === 'spiky') {
            ctx.beginPath();
            ctx.moveTo(5, 5); ctx.lineTo(8, -16); ctx.lineTo(12, -8);
            ctx.lineTo(15, -20); ctx.lineTo(18, -8);
            ctx.lineTo(24, -16); ctx.lineTo(26, 5);
            ctx.closePath(); ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo(5, 5); ctx.quadraticCurveTo(5, -16, 15, -14); ctx.quadraticCurveTo(25, -16, 26, 5); ctx.lineTo(15, 10); ctx.closePath();
            ctx.fill();
        }
        ctx.fillStyle = '#f1c6a3'; ctx.fillRect(12, 12, 6, 5);
        ctx.fillStyle = '#f4caaa';
        ctx.beginPath(); ctx.ellipse(15, 2, 11, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#caa05f'; ctx.fillRect(5, -4, 20, 4);
        ctx.fillStyle = '#75512d'; ctx.fillRect(3, -2, 24, 6);
        ctx.fillStyle = '#e2b18f';
        ctx.beginPath(); ctx.ellipse(7, 3, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2b1a12'; ctx.fillRect(15, -1, 3, 2); ctx.fillRect(20, 0, 2, 2);

        if (this.state === 'chopping') {
            ctx.translate(20, 15);
            // Swing arc based on the 0-1.0 chopTimer
            const swingIdx = this.chopTimer / 1.0;
            const swingAngle = -1.8 + Math.pow(swingIdx, 1.5) * 2.4;
            ctx.rotate(swingAngle);

            // Arm sleeve & hand
            ctx.fillStyle = this.tunicColor; ctx.fillRect(-2, -2, 7, 18);
            ctx.fillStyle = '#f1c6a3'; ctx.fillRect(-1, 15, 5, 5);

            // Axe Handle - Made longer (approx length 35)
            ctx.fillStyle = '#654321'; ctx.fillRect(1, -25, 3, 40);

            // Axe Head - Back blunt (now on the opposite side of blade)
            ctx.fillStyle = '#8d949c'; ctx.fillRect(-2, -13, 3, 8);

            // Axe Head - Main flared triangular blade (Flipped to point FORWARD)
            ctx.fillStyle = '#adb2b8';
            ctx.beginPath();
            ctx.moveTo(4, -13);        // Inner top
            ctx.lineTo(16, -21);       // Upper point
            ctx.lineTo(19, -9);        // Center edge
            ctx.lineTo(15, 1);         // Lower point
            ctx.lineTo(4, -5);         // Inner bottom
            ctx.closePath(); ctx.fill();

            // Bright edge detail (Flipped to point FORWARD)
            ctx.fillStyle = '#dde1e4';
            ctx.beginPath();
            ctx.moveTo(15, -18);
            ctx.lineTo(19, -9);
            ctx.lineTo(15, -3);
            ctx.lineTo(16, -9);
            ctx.closePath(); ctx.fill();
        } else if (this.carryingLogs > 0) {
            ctx.fillStyle = '#6b4826'; ctx.fillRect(24, 20, 5, 14);
            ctx.fillStyle = '#f1c6a3'; ctx.fillRect(24, 33, 5, 5);
            ctx.fillStyle = '#6b3a1f'; ctx.fillRect(14, 6, 22, 10);
            ctx.fillStyle = '#8b4513'; ctx.fillRect(15, 7, 20, 8);
            ctx.fillStyle = '#5c2d0e'; ctx.fillRect(34, 7, 2, 8);
        } else {
            ctx.fillStyle = '#6b4826'; ctx.fillRect(24, 20, 5, 14);
            ctx.fillStyle = '#f1c6a3'; ctx.fillRect(24, 33, 5, 5);
        }
        ctx.restore();

        // Unit Label
        ctx.fillStyle = '#ffaa00'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('■ WORKER', sx + 15, sy - 30); ctx.textAlign = 'left';

        // HP bar
        if (this.hp < this.maxHp) {
        ctx.fillStyle = '#400'; ctx.fillRect(sx, sy - 18, 30, 4);
        const hpRatio = this.hp / this.maxHp;
        ctx.fillStyle = hpRatio > 0.5 ? '#0c0' : hpRatio > 0.25 ? '#f5a623' : '#e00';
        ctx.fillRect(sx, sy - 18, hpRatio * 30, 4);

        if (this.dialogueTimer > 0) {
            ctx.fillStyle = 'white'; ctx.fillRect(sx - 5, sy - 62, 100, 18);
            ctx.fillStyle = '#222'; ctx.font = '11px sans-serif';
            ctx.fillText(this.dialogue, sx, sy - 48);
        }
    }
}
}

// ─── SOLDIER ──────────────────────────────────────────────────────────────────
class Soldier {
    constructor(world, x) {
        this.world = world; this.x = x; this.y = world.groundY - 60; this.vx = 0; this.vy = 0;
        this.facingRight = true; this.time = 0;
        this.maxHp = 100; this.hp = 100;
        this.dead = false; this.following = false;
        this.guardX = x; this.attackCd = 0; this.state = 'idle';
        this.dialogue = ''; this.dialogueTimer = 0; this.hurtTimer = 0;
        this.spawnWalkTimer = 1.5;
        this.attackTimer = 0;
        this.attackTarget = null;
    }
    takeDamage(dmg) {
        this.hp -= dmg; triggerHitGlow(this); sfx.playHit();
        if (this.hp <= 0) this.dead = true;
    }
    update(dt, player) {
        this.time += dt;
        this.vy += 1200 * dt; this.y += this.vy * dt;
        if (this.y > this.world.groundY - 60) { this.y = this.world.groundY - 60; this.vy = 0; }
        if (this.attackCd > 0) this.attackCd -= dt;
        if (this.attackTimer > 0) {
            const oldT = this.attackTimer;
            this.attackTimer -= dt;
            // Deal damage at the peak of the thrust (when timer crosses 0.3s)
            if (oldT >= 0.3 && this.attackTimer < 0.3 && this.attackTarget && !this.attackTarget.dead) {
                this.attackTarget.takeDamage(22);
            }
        }
        if (this.dialogueTimer > 0) this.dialogueTimer -= dt;
        if (this.hurtTimer > 0) this.hurtTimer -= dt;

        if (this.spawnWalkTimer > 0) {
            this.spawnWalkTimer -= dt;
            this.vx = 100; this.facingRight = true; this.state = 'walk';
            this.x += this.vx * dt;
            return;
        }

        // Find nearest enemy
        let nearestEnemy = null, nearestDist = 300;
        for (const e of this.world.enemies) {
            if (e.dead) continue;
            const d = Math.abs(e.x - this.x);
            if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
        }

        if (nearestEnemy) {
            // Latch direction and stop movement during attacks to prevent jitter
            if (this.attackTimer <= 0) {
                const dir = Math.sign(nearestEnemy.x - this.x);
                this.facingRight = dir > 0;

                // Stop moving once in comfortable strike range
                if (nearestDist > 60) {
                    this.vx = dir * 150;
                    this.state = 'walk';
                } else {
                    this.vx = 0;
                    this.state = 'idle';
                }
            } else {
                this.vx = 0; // Commit to the strike position
            }

            if (nearestDist < 85 && this.attackCd <= 0 && this.attackTimer <= 0) {
                this.attackCd = 1.2;
                this.attackTimer = 0.6;
                this.attackTarget = nearestEnemy;
                const lines = ['For the king!', 'Take that!', 'Back, foul creature!', 'Hiyah!'];
                this.dialogue = lines[Math.floor(Math.random() * lines.length)]; this.dialogueTimer = 1.5;
            }
        } else if (this.following) {
            const dist = Math.abs(this.x - player.x);
            if (dist > 70) { const dir = Math.sign(player.x - this.x); this.vx = dir * 200; this.facingRight = dir > 0; this.state = 'walk'; }
            else { this.vx = 0; this.state = 'idle'; }
        } else {
            const distHome = Math.abs(this.x - this.guardX);
            if (distHome > 15) { const dir = Math.sign(this.guardX - this.x); this.vx = dir * 110; this.facingRight = dir > 0; this.state = 'walk'; }
            else { this.vx = 0; this.state = 'idle'; }
        }
        this.x += this.vx * dt;
    }
    draw(ctx, cam) {
        if (this.dead) return;
        const sx = this.x - cam.x, sy = this.y;
        const bob = this.state === 'walk' ? Math.abs(Math.sin(this.time * 12)) * 3 : Math.sin(this.time * 2);
        ctx.save();
        applyHitGlow(ctx, this);
        ctx.translate(sx, sy - bob);
        if (!this.facingRight) { ctx.translate(30, 0); ctx.scale(-1, 1); }
        const ls = this.state === 'walk' ? Math.sin(this.time * 12) * 6 : 0;
        ctx.fillStyle = '#2d2419'; ctx.fillRect(6 - ls, 42, 7, 16); ctx.fillRect(17 + ls, 42, 7, 16);
        ctx.fillStyle = '#130f0a'; ctx.fillRect(5 - ls, 56, 9, 4); ctx.fillRect(16 + ls, 56, 9, 4);
        ctx.fillStyle = '#244116'; ctx.fillRect(0, 18, 6, 17);
        ctx.fillStyle = '#f1c6a3'; ctx.fillRect(1, 34, 5, 5);
        ctx.fillStyle = '#2e5b1e';
        ctx.beginPath();
        ctx.moveTo(4, 16); ctx.lineTo(26, 16); ctx.lineTo(30, 40); ctx.lineTo(24, 44); ctx.lineTo(6, 44); ctx.lineTo(0, 40); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#3b7426';
        ctx.beginPath();
        ctx.moveTo(11, 16); ctx.lineTo(19, 16); ctx.lineTo(22, 41); ctx.lineTo(8, 41); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#d8b536';
        ctx.beginPath(); ctx.moveTo(15, 21); ctx.lineTo(19, 25); ctx.lineTo(15, 29); ctx.lineTo(11, 25); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#5a4415'; ctx.fillRect(4, 39, 22, 4);

        // --- Spear Rotation & Thrust Logic ---
        let thrustX = 0;
        let spearAngle = -1.1; // Default vertical-ish angle
        if (this.attackTimer > 0) {
            const p = (0.6 - this.attackTimer) / 0.6;
            // Rapidly transition from vertical to horizontal in first 20%
            const angleDone = Math.min(1, p / 0.2);
            spearAngle = -1.1 * (1 - angleDone);
            // Thrust peak at mid-point (0.3s)
            thrustX = Math.sin(p * Math.PI) * 38;
        }

        ctx.save();
        // Pivot spear around a shoulder-height central point
        ctx.translate(15, 30);
        ctx.rotate(spearAngle);

        // Arms (holding the spear relative to its rotation)
        // Back Arm
        ctx.fillStyle = '#244116'; ctx.fillRect(-12 + thrustX * 0.2, 0, 5, 12);
        ctx.fillStyle = '#f1c6a3'; ctx.fillRect(-12 + thrustX * 0.2, 12, 5, 5);
        // Front Arm
        ctx.fillStyle = '#244116'; ctx.fillRect(8 + thrustX * 0.8, 0, 5, 12);
        ctx.fillStyle = '#f1c6a3'; ctx.fillRect(8 + thrustX * 0.8, 12, 5, 5);

        // Spear Shaft (long wooden pole)
        ctx.fillStyle = '#654321'; ctx.fillRect(-15 + thrustX, 10, 85, 4);
        // Spear Tip (metallic sharp point)
        ctx.fillStyle = '#bbb';
        ctx.beginPath();
        ctx.moveTo(70 + thrustX, 7);
        ctx.lineTo(88 + thrustX, 12);
        ctx.lineTo(70 + thrustX, 17);
        ctx.fill();

        ctx.restore();

        ctx.fillStyle = '#f4caab'; ctx.fillRect(12, 12, 6, 5);
        ctx.beginPath(); ctx.ellipse(15, 2, 11, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9098a2';
        ctx.beginPath();
        ctx.moveTo(5, -3); ctx.lineTo(25, -3); ctx.lineTo(24, 7); ctx.lineTo(6, 7); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#d0b34f'; ctx.fillRect(6, 2, 18, 3);
        ctx.fillStyle = '#727b84'; ctx.fillRect(14, -3, 2, 12);
        ctx.fillStyle = '#e2b18f';
        ctx.beginPath(); ctx.ellipse(7, 3, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2b1a12'; ctx.fillRect(15, -1, 3, 2); ctx.fillRect(20, 0, 2, 2);
        ctx.fillStyle = '#ce9470'; ctx.fillRect(19, 3, 3, 3);
        ctx.fillStyle = '#9a5f46'; ctx.fillRect(16, 7, 5, 1);
        ctx.restore();
        // Labels
        if (this.following) {
            ctx.fillStyle = '#00eeff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('▶ FOLLOW', sx + 15, sy - 30); ctx.textAlign = 'left';
        } else {
            ctx.fillStyle = '#ffaa00'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('■ GUARD', sx + 15, sy - 30); ctx.textAlign = 'left';
        }
        // HP bar
        ctx.fillStyle = '#004400'; ctx.fillRect(sx, sy - 18, 30, 4);
        const hpRatio = this.hp / this.maxHp;
        ctx.fillStyle = hpRatio > 0.5 ? '#00cc00' : hpRatio > 0.25 ? '#f5a623' : '#e00';
        ctx.fillRect(sx, sy - 18, hpRatio * 30, 4);
        // Heal prompt when injured
        if (this.hp < this.maxHp) {
            const player = this.world.game.player;
            if (Math.abs(this.x - player.x) < 70 && player.inventory.wheat > 0) {
                ctx.fillStyle = '#8f8'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('[H] Heal', sx + 15, sy - 40); ctx.textAlign = 'left';
            }
        }
        if (this.dialogueTimer > 0) {
            ctx.fillStyle = 'white'; ctx.fillRect(sx - 5, sy - 62, 100, 18);
            ctx.fillStyle = '#222'; ctx.font = '11px sans-serif';
            ctx.fillText(this.dialogue, sx, sy - 48);
        }
    }
}

// ─── PIKE ─────────────────────────────────────────────────────────────────────
class Pike {
    constructor(world, startX, startY, targetX, targetY) {
        this.world = world; this.x = startX; this.y = startY;
        const angle = Math.atan2(targetY - startY, targetX - startX);
        const speed = 400;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.dead = false; this.life = 2.0; this.angle = angle;
    }
    update(dt) {
        if (this.dead) return;
        this.life -= dt;
        if (this.life <= 0) { this.dead = true; return; }

        this.vy += 700 * dt; // Gravity effect for natural curve
        this.x += this.vx * dt; this.y += this.vy * dt;
        this.angle = Math.atan2(this.vy, this.vx); // Rotate to face velocity

        if (this.y > this.world.groundY) { this.dead = true; return; }

        // ... rest of update collision logic ...
        // Check collisions with Enemies
        for (const e of this.world.enemies) {
            if (e.dead) continue;
            if (Math.abs(e.x - this.x) < 30 && Math.abs(e.y - 20 - this.y) < 40) {
                e.takeDamage(20); this.dead = true;
                for (let i = 0; i < 5; i++) this.world.particles.push(new Particle(this.x, this.y, '#e0e0e0'));
                return;
            }
        }
        // Check collisions with Animals
        for (const a of this.world.animals) {
            if (a.dead) continue;
            // Increased radius (35x30) to help hit small animals like rabbits
            if (Math.abs(a.x - this.x) < 35 && Math.abs(a.y - 10 - this.y) < 30) {
                a.takeDamage(25); this.dead = true;
                for (let i = 0; i < 5; i++) this.world.particles.push(new Particle(this.x, this.y, '#c8102e'));
                return;
            }
        }
    }
    draw(ctx, cam) {
        if (this.dead) return;
        const sx = this.x - cam.x, sy = this.y;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(this.angle);
        // Larger size (length 35) to match hunter's hand
        ctx.fillStyle = '#654321'; ctx.fillRect(-17.5, -1.5, 35, 3);
        ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.moveTo(17.5, -3); ctx.lineTo(17.5, 3); ctx.lineTo(25, 0); ctx.fill();
        ctx.restore();
    }
}

// ─── HUNTER ───────────────────────────────────────────────────────────────────
class Hunter {
    constructor(world, x, preferredSide = 1) {
        this.world = world; this.x = x; this.y = world.groundY - 60;
        this.vx = 0; this.vy = 0; this.facingRight = true; this.state = 'idle';
        this.time = Math.random() * 10;
        this.hp = 40; this.maxHp = 40; this.dead = false;
        this.attackCd = 0; this.meatCount = 0;
        this.pikeHideTimer = 0;
        this.preferredSide = preferredSide; // 1 for Right, -1 for Left
        this.currentTarget = null;
        this.failedAttempts = 0;
    }
    takeDamage(dmg) {
        this.hp -= dmg; triggerHitGlow(this); sfx.playHit();
        if (this.hp <= 0) this.dead = true;
    }
    update(dt) {
        if (this.dead) return;
        this.time += dt;
        if (this.pikeHideTimer > 0) this.pikeHideTimer -= dt;
        this.vy += 1200 * dt; this.y += this.vy * dt;
        if (this.y > this.world.groundY - 60) { this.y = this.world.groundY - 60; this.vy = 0; }
        if (this.attackCd > 0) this.attackCd -= dt;

        if (this.meatCount >= 3 || (this.meatCount > 0 && !this.world.animals.some(a => !a.dead) && !this.world.groundItems.some(i => i.type === 'meat' && !i.picked))) {
            const outX = this.world.outpost.x;
            const d = Math.abs(outX - this.x);
            if (d < 50) {
                this.vx = 0;
                // Drop all collected meat
                for (let i = 0; i < this.meatCount; i++) {
                    this.world.groundItems.push(new GroundItem(this.world, this.x + (Math.random() - 0.5) * 40, this.world.groundY - 16, 'meat'));
                }
                this.meatCount = 0;
                this.state = 'idle';
            } else {
                const dir = Math.sign(outX - this.x);
                this.vx = dir * 112; this.facingRight = dir > 0;
                this.state = 'walk';
            }
        } else {
            let targetEnemy = null; let bestEDist = Infinity;
            for (const e of this.world.enemies) {
                if (e.dead) continue;
                let d = Math.abs(e.x - this.x);
                if (d < bestEDist && d < 450) { bestEDist = d; targetEnemy = e; }
            }

            let targetAnimal = null; let bestADist = Infinity;
            if (!targetEnemy) {
                for (const a of this.world.animals) {
                    if (a.dead) continue;
                    // If we've missed this target too many times, skip it for a farther one
                    if (this.failedAttempts >= 2 && a === this.currentTarget && this.world.animals.filter(aa => !aa.dead).length > 1) continue;
                    let d = Math.abs(a.x - this.x);
                    if (d < bestADist && d < 2000) { bestADist = d; targetAnimal = a; }
                }
            }

            let targetMeat = null; let bestMDist = Infinity;
            if (!targetEnemy && !targetAnimal) {
                for (const m of this.world.groundItems) {
                    // Ignore meat near outpost so the hunter does not loop picking it back up 
                    if (m.type === 'meat' && !m.picked && Math.abs(m.x - this.world.outpost.x) > 150) {
                        let d = Math.abs(m.x - this.x);
                        if (d < bestMDist && d < 3000) { bestMDist = d; targetMeat = m; }
                    }
                }
            }

            if (targetEnemy) {
                if (bestEDist < 250) {
                    this.vx = 0; this.state = 'idle'; this.facingRight = targetEnemy.x > this.x;
                    if (this.attackCd <= 0) {
                        this.attackCd = 1.6;
                        this.pikeHideTimer = 0.5; // Throw animation: hide pike in hand
                        // Throw at a slight upward arc
                        this.world.arrows.push(new Pike(this.world, this.x, this.y - 20, targetEnemy.x, targetEnemy.y - 120));
                    }
                } else {
                    const dir = Math.sign(targetEnemy.x - this.x);
                    this.vx = dir * 96; this.facingRight = dir > 0; this.state = 'walk';
                }
            } else if (targetAnimal) {
                if (this.currentTarget !== targetAnimal) { this.currentTarget = targetAnimal; this.failedAttempts = 0; }
                if (bestADist < 250) {
                    this.vx = 0; this.state = 'idle'; this.facingRight = targetAnimal.x > this.x;
                    if (this.attackCd <= 0) {
                        this.attackCd = 1.4;
                        this.pikeHideTimer = 0.5; // Throw animation: hide pike in hand
                        this.failedAttempts++; // Track attempt
                        // Throw at a slight upward arc
                        this.world.arrows.push(new Pike(this.world, this.x, this.y - 20, targetAnimal.x, targetAnimal.y - 120));
                    }
                } else {
                    const dir = Math.sign(targetAnimal.x - this.x);
                    this.vx = dir * 96; this.facingRight = dir > 0; this.state = 'walk';
                }
            } else if (targetMeat) {
                if (bestMDist < 40) {
                    this.vx = 0; targetMeat.picked = true; this.meatCount++; this.state = 'idle';
                } else {
                    const dir = Math.sign(targetMeat.x - this.x);
                    this.vx = dir * 104; this.facingRight = dir > 0; this.state = 'walk';
                }
            } else {
                // Return to their preferred side of the outpost
                const baseOffset = this.preferredSide * 150;
                const outX = this.world.outpost.x + baseOffset;
                const d = Math.abs(this.x - outX);
                if (d > 30) {
                    const dir = Math.sign(outX - this.x);
                    this.vx = dir * 72; this.facingRight = dir > 0; this.state = 'walk';
                } else {
                    this.vx = 0; this.state = 'idle';
                }
            }
        }
        this.x += this.vx * dt;
    }
    draw(ctx, cam) {
        if (this.dead) return;
        const sx = this.x - cam.x, sy = this.y;
        const bob = this.state === 'walk' ? Math.abs(Math.sin(this.time * 12)) * 3 : Math.sin(this.time * 2);
        ctx.save();
        applyHitGlow(ctx, this);
        ctx.translate(sx, sy - bob);
        if (!this.facingRight) { ctx.translate(30, 0); ctx.scale(-1, 1); }
        const ls = this.state === 'walk' ? Math.sin(this.time * 12) * 5 : 0;

        ctx.fillStyle = '#222'; ctx.fillRect(6 - ls, 42, 7, 16); ctx.fillRect(17 + ls, 42, 7, 16);
        ctx.fillStyle = '#4c5c44'; ctx.fillRect(1, 19, 5, 17);
        ctx.fillStyle = '#f1c6a3'; ctx.fillRect(1, 34, 5, 5);
        ctx.fillStyle = '#657b59';
        ctx.beginPath(); ctx.moveTo(4, 16); ctx.lineTo(26, 16); ctx.lineTo(30, 40); ctx.lineTo(24, 44); ctx.lineTo(6, 44); ctx.lineTo(0, 40); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3a2d21';
        ctx.beginPath(); ctx.moveTo(11, 17); ctx.lineTo(19, 17); ctx.lineTo(21, 41); ctx.lineTo(9, 41); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#4a3a2a'; ctx.fillRect(4, 39, 22, 4);
        ctx.fillStyle = '#6b4826'; ctx.fillRect(-4, 20, 10, 16);
        ctx.fillStyle = '#f1c6a3'; ctx.fillRect(12, 12, 6, 5);
        ctx.fillStyle = '#f4caab'; ctx.beginPath(); ctx.ellipse(15, 2, 11, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3f4c38'; ctx.beginPath(); ctx.arc(15, 0, 12, Math.PI, 0); ctx.fill(); ctx.fillRect(3, -2, 24, 6);
        ctx.fillStyle = '#2b1a12'; ctx.fillRect(15, -1, 3, 2); ctx.fillRect(20, 0, 2, 2);
        ctx.fillStyle = '#4c5c44'; ctx.fillRect(24, 19, 5, 17);
        ctx.fillStyle = '#f1c6a3'; ctx.fillRect(24, 34, 5, 5);

        if (this.meatCount > 0) {
            // Detailed meat/game bundle visualization
            ctx.save();
            ctx.translate(14, 30);
            for (let i = 0; i < this.meatCount; i++) {
                ctx.save();
                ctx.translate(-i * 3, -i * 5);
                ctx.rotate(i * 0.2);
                // Meat Slab
                ctx.fillStyle = '#c8102e'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0.4, 0, Math.PI * 2); ctx.fill();
                // Fat/Rind detail
                ctx.fillStyle = '#fff'; ctx.fillRect(-6, -3, 10, 2);
                // Bone detail
                ctx.fillStyle = '#ddd'; ctx.fillRect(4, -2, 6, 3);
                ctx.restore();
            }
            ctx.restore();
        } else if (this.pikeHideTimer <= 0) {
            ctx.fillStyle = '#654321'; ctx.fillRect(25, 10, 4, 35);
            ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.moveTo(25, 10); ctx.lineTo(29, 10); ctx.lineTo(27, -5); ctx.fill();
        }

        ctx.restore();

        // Unit Label
        ctx.fillStyle = '#ffaa00'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('■ HUNTER', sx + 10, sy - 30); ctx.textAlign = 'left';

        // Removed HUNTER label as per request
        ctx.textAlign = 'left';
        ctx.fillStyle = '#004400'; ctx.fillRect(sx - 5, sy - 18, 30, 4);
        const hpRatio = this.hp / this.maxHp;
        ctx.fillStyle = hpRatio > 0.5 ? '#00cc00' : hpRatio > 0.25 ? '#f5a623' : '#e00';
        ctx.fillRect(sx - 5, sy - 18, hpRatio * 30, 4);
        if (this.hp < this.maxHp && this.world && this.world.game && this.world.game.player) {
            const player = this.world.game.player;
            if (Math.abs(this.x - player.x) < 70 && player.inventory.wheat > 0) {
                ctx.fillStyle = '#8f8'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('[H] Heal', sx + 10, sy - 25); ctx.textAlign = 'left';
            }
        }
    }
}

// ─── PLAYER CHARACTER ─────────────────────────────────────────────────────────
class Character {
    constructor(world) {
        this.world = world; this.x = 200; this.y = 0;
        this.vx = 0; this.vy = 0; this.speed = 200;
        this.facingRight = true; this.time = 0; this.state = 'idle';
        this.maxHp = 100; this.hp = 100;
        this.maxStamina = 100; this.stamina = 100;
        this.actionTimer = 0; this.invincibleTimer = 0;
        this.hurtTimer = 0;
        this.hammerChargeTimer = 0;
        this.inventory = { gold: 30, wood: 0, hasAxe: false, hasSword: false, wheat: 0, hasHammer: false, meat: 0 };
    }
    toSave() {
        return {
            x: this.x, hp: this.hp, stamina: this.stamina,
            inventory: { ...this.inventory }
        };
    }
    applyLoad(data) {
        this.x = data.x; this.hp = data.hp; this.stamina = data.stamina;
        this.inventory = { ...data.inventory };
    }
    get weapon() {
        if (this.inventory.hasHammer) return 'hammer';
        if (this.inventory.hasSword) return 'sword';
        if (this.inventory.hasAxe) return 'axe';
        return 'fists';
    }
    get weaponDmg() {
        if (this.inventory.hasHammer) return 100;
        if (this.inventory.hasSword) return 55;
        if (this.inventory.hasAxe) return 30;
        return 10;
    }
    takeDamage(dmg) {
        if (this.invincibleTimer > 0) return;
        this.hp = Math.max(0, this.hp - dmg);
        this.invincibleTimer = 1.2; this.hurtTimer = 0.3; triggerHitGlow(this, 0.3);
        /*
        if (Math.random() < 0.3) {
            this.x += (this.facingRight ? -1 : 1) * 35; // Knockback effect
            this.actionTimer = 0.3; // Stun effect
        }
        */
        sfx.playHurt();
    }
    update(dt, input) {
        this.time += dt;
        this.vy += 1200 * dt; this.y += this.vy * dt;
        if (this.y > this.world.groundY - 60) { this.y = this.world.groundY - 60; this.vy = 0; }
        if (this.actionTimer > 0) this.actionTimer -= dt;
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        // Slow HP regen
        if (this.hp < this.maxHp && this.invincibleTimer <= 0) this.hp = Math.min(this.maxHp, this.hp + 2 * dt);

        this.vx = 0; this.state = 'idle';
        const run = (input.isDown('ControlLeft') || input.isDown('ControlRight')) && this.stamina > 0 && this.actionTimer <= 0;
        const spd = run ? this.speed * 1.8 : this.speed;
        if (run && (input.isDown('KeyA') || input.isDown('ArrowLeft') || input.isDown('KeyD') || input.isDown('ArrowRight'))) this.stamina -= 30 * dt;
        else if (this.stamina < this.maxStamina) this.stamina += 18 * dt;
        if (this.actionTimer <= 0) {
            if (input.isDown('KeyA') || input.isDown('ArrowLeft')) { this.vx = -spd; this.facingRight = false; this.state = run ? 'run' : 'walk'; }
            if (input.isDown('KeyD') || input.isDown('ArrowRight')) { this.vx = spd; this.facingRight = true; this.state = run ? 'run' : 'walk'; }
        } else { this.state = 'action'; }
        this.x += this.vx * dt;
        if (this.x < -2000) this.x = -2000; // allow left exploration

        // Hammer Charge Logic (Tap for melee, Hold for Fireball)
        if (this.weapon === 'hammer' && this.hp > 0 && this.actionTimer <= 0) {
            if (input.isDown('KeyE')) {
                this.hammerChargeTimer += dt;
                if (this.hammerChargeTimer >= 1.0) {
                    this.hammerChargeTimer = 0;
                    this.actionTimer = 0.5; // Trigger swing animation
                    const fbX = this.x + (this.facingRight ? 40 : -40);
                    const fbY = this.y + 10;
                    this.world.heroProjectiles.push(new HeroFireball(this.world, fbX, fbY, this.facingRight));
                    sfx.beep(400, 'sawtooth', 0.3, 0.4); sfx.beep(100, 'square', 0.2, 0.3, 0.05);
                }
            } else if (input.justReleased('KeyE')) {
                // If released before 1.0s, perform a regular melee swing/interaction
                if (this.hammerChargeTimer > 0 && this.hammerChargeTimer < 1.0) {
                    this.world._handleE(this, true);
                }
                this.hammerChargeTimer = 0;
            } else {
                this.hammerChargeTimer = 0;
            }
        }
        // Pick up ground items
        for (const item of this.world.groundItems) {
            if (item.picked) continue;
            if (Math.abs(item.x - this.x) < 40 && Math.abs(item.y - this.y) < 50) {
                item.picked = true; sfx.playPickup();
                if (item.type === 'wheat') this.inventory.wheat += 1;
                else if (item.type === 'log') this.inventory.wood += 1;
                else if (item.type === 'meat') this.inventory.meat += 1;
                else this.inventory.gold += (item.value || 1);
            }
        }
    }

    // Compute weapon swing angle based on action progress
    _swingAngle() {
        if (this.state !== 'action') return null; // null = use punch path
        const wp = this.weapon;
        if (wp === 'fists') return null; // handled specially in draw
        const totalTime = wp === 'sword' ? 0.35 : 0.5;
        const progress = 1 - (this.actionTimer / totalTime); // 0→1
        if (wp === 'sword') return -3.0 + progress * 2.5; // forward slash
        return -3.0 + progress * 3.0; // overhead chop from top to bottom
    }
    // Punch progress 0→1 during fist action
    _punchProgress() {
        if (this.state !== 'action' || this.weapon !== 'fists') return 0;
        const totalTime = 0.3;
        const p = 1 - (this.actionTimer / totalTime);
        return Math.sin(p * Math.PI); // arc: 0→1→0 (extend then retract)
    }

    draw(ctx, cam) {
        const sx = this.x - cam.x, sy = this.y;
        const flashAlpha = this.hurtTimer > 0 ? (0.5 + Math.sin(this.time * 40) * 0.5) : 1;
        const bspd = this.state === 'run' ? 20 : (this.state === 'walk' ? 12 : 2);
        const bamt = this.state === 'run' ? 6 : (this.state === 'walk' ? 3 : 1);
        const bob = Math.abs(Math.sin(this.time * bspd)) * bamt;
        ctx.save();
        // Hurt flash
        if (this.hurtTimer > 0) ctx.globalAlpha = flashAlpha;
        applyHitGlow(ctx, this);
        ctx.translate(sx, sy - bob);

        // --- Charge Progress UI & Inferno Aura (Flashing Fire) ---
        const chargeRatio = Math.min(1.0, this.hammerChargeTimer / 1.0);
        if (chargeRatio > 0 && this.weapon === 'hammer') {
            const t = this.time;
            const flicker = 0.7 + Math.sin(t * 30) * 0.3; // Rapid heat flicker

            ctx.save();
            // 1. Radiant Body Aura (Additive glow)
            ctx.globalCompositeOperation = 'lighter';
            const auraG = ctx.createRadialGradient(15, 20, 5, 15, 20, 45 + chargeRatio * 25);
            auraG.addColorStop(0, `rgba(255, 160, 0, ${0.8 * chargeRatio * flicker})`);
            auraG.addColorStop(0.5, `rgba(255, 60, 0, ${0.4 * chargeRatio * flicker})`);
            auraG.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = auraG;
            ctx.beginPath(); ctx.arc(15, 20, 70, 0, Math.PI * 2); ctx.fill();

            // 2. Spiraling Flame Licks
            ctx.fillStyle = `rgba(255, 220, 0, ${0.7 * chargeRatio * flicker})`;
            for (let i = 0; i < 5; i++) {
                const ang = (t * 8) + (i * Math.PI * 2 / 5);
                const distX = 22 + Math.sin(t * 10 + i) * 5;
                const distY = 32 + Math.cos(t * 10 + i) * 5;
                const fx = 15 + Math.cos(ang) * distX, fy = 20 + Math.sin(ang) * distY;
                ctx.beginPath();
                ctx.moveTo(fx, fy);
                ctx.lineTo(fx + (Math.random() - 0.5) * 15, fy - 15 - chargeRatio * 20);
                ctx.lineTo(fx + 5, fy + 5);
                ctx.fill();
            }
            ctx.restore();

            // 3. Upward Rising Embers (Heat)
            if (Math.random() < 0.2 + chargeRatio * 0.5) {
                const px = this.x + (Math.random() - 0.5) * 50;
                const py = this.y + 60 - Math.random() * 20;
                this.world.particles.push(new Particle(px, py, '#ffaa00', (Math.random() - 0.5) * 30, -80 - Math.random() * 120));
            }

            // 4. Horizontal Focus Bar
            const barW = 50, barH = 6;
            const bx = 15 - barW / 2, by = 62;
            ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(bx, by, barW, barH);
            const fillCol = `hsl(${20 + chargeRatio * 20}, 100%, ${50 + chargeRatio * 30}%)`;
            ctx.fillStyle = fillCol; ctx.fillRect(bx, by, barW * chargeRatio, barH);
            if (chargeRatio >= 0.98) {
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, barW, barH);
            }
        }

        if (!this.facingRight) { ctx.translate(30, 0); ctx.scale(-1, 1); }

        // Cape
        ctx.fillStyle = '#8c1123'; ctx.beginPath(); ctx.moveTo(11, 15);
        const fl = Math.sin(this.time * 15) * (this.state === 'run' ? 15 : (this.state === 'walk' ? 8 : 4));
        ctx.lineTo(-22 - fl, 54); ctx.lineTo(-6 - fl, 60); ctx.lineTo(20, 17); ctx.fill();
        ctx.fillStyle = '#c8102e';
        ctx.beginPath(); ctx.moveTo(12, 17); ctx.lineTo(-16 - fl * 0.8, 53); ctx.lineTo(-2 - fl * 0.4, 57); ctx.lineTo(19, 18); ctx.fill();
        // Legs
        const lg = this.state !== 'idle' && this.state !== 'action' ? Math.sin(this.time * 12) * 7 : (this.state === 'action' ? 4 : 0);
        ctx.fillStyle = '#2a211d'; ctx.fillRect(6 - lg, 42, 7, 16); ctx.fillRect(17 + lg, 42, 7, 16);
        ctx.fillStyle = '#0f0d10'; ctx.fillRect(5 - lg, 56, 9, 4); ctx.fillRect(16 + lg, 56, 9, 4);
        // Body
        ctx.fillStyle = '#19386c'; ctx.fillRect(0, 18, 6, 18);
        ctx.fillStyle = '#f2c6a3'; ctx.fillRect(1, 34, 5, 6);
        ctx.fillStyle = '#2a5298';
        ctx.beginPath();
        ctx.moveTo(4, 15); ctx.lineTo(26, 15); ctx.lineTo(30, 39); ctx.lineTo(24, 44); ctx.lineTo(6, 44); ctx.lineTo(0, 39); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#3c6bbb';
        ctx.beginPath();
        ctx.moveTo(11, 15); ctx.lineTo(19, 15); ctx.lineTo(22, 41); ctx.lineTo(8, 41); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#19386c'; ctx.fillRect(5, 18, 5, 11); ctx.fillRect(20, 18, 5, 11);
        ctx.fillStyle = '#3e2723'; ctx.fillRect(4, 39, 22, 4);
        ctx.fillStyle = '#d7b44a'; ctx.fillRect(8, 23, 14, 3);
        ctx.fillStyle = '#e4c25c';
        ctx.beginPath(); ctx.moveTo(15, 28); ctx.lineTo(19, 32); ctx.lineTo(15, 36); ctx.lineTo(11, 32); ctx.closePath(); ctx.fill();
        // Back arm
        ctx.fillStyle = '#1a3070'; ctx.fillRect(0, 18, 6, 18);

        // FRONT ARM — weapon swing pivot from shoulder
        ctx.save();
        ctx.translate(22, 18); // shoulder anchor
        const angle = this._swingAngle();
        const punch = this._punchProgress();

        if (angle !== null) {
            // Weapon swing (axe/sword)
            ctx.rotate(angle);
            // Arm sleeve
            ctx.fillStyle = '#1e3c72'; ctx.fillRect(-3, 0, 8, 20);
            ctx.fillStyle = '#f2c6a3'; ctx.fillRect(-2, 20, 7, 7); // hand
            if (this.weapon === 'sword') {
                ctx.fillStyle = '#ccd8e0'; ctx.fillRect(0, 22, 5, 32);
                ctx.fillStyle = '#eef5ff'; ctx.fillRect(1, 22, 2, 32);
                ctx.beginPath(); ctx.moveTo(0, 54); ctx.lineTo(2, 61); ctx.lineTo(5, 54); ctx.fill();
                ctx.fillStyle = '#d7b44a'; ctx.fillRect(-6, 20, 16, 4);
                ctx.fillStyle = '#7b1520'; ctx.fillRect(0, 18, 5, 3);
            } else if (this.weapon === 'axe') {
                // Handle
                ctx.fillStyle = '#654321'; ctx.fillRect(-4, 22, 4, 30);

                // Back blunt
                ctx.fillStyle = '#8d949c'; ctx.fillRect(0, 38, 4, 12);

                // Main flared triangular double edge
                ctx.fillStyle = '#adb2b8';
                ctx.beginPath();
                ctx.moveTo(-4, 38);      // Top inner socket
                ctx.lineTo(-18, 30);     // Upper point
                ctx.lineTo(-22, 44);     // Center edge
                ctx.lineTo(-16, 54);     // Lower point
                ctx.lineTo(-4, 50);      // Bottom inner socket
                ctx.closePath(); ctx.fill();

                // Bright edge detail
                ctx.fillStyle = '#dde1e4';
                ctx.beginPath();
                ctx.moveTo(-17, 33);
                ctx.lineTo(-22, 44);
                ctx.lineTo(-16, 52);
                ctx.lineTo(-18, 44);
                ctx.closePath(); ctx.fill();
            } else if (this.weapon === 'hammer') {
                const t = this.world.game ? this.world.game.lastTime / 1000 : 0;
                const chargeRatio = Math.min(1.0, this.hammerChargeTimer / 1.0);
                const pulse = (0.8 + Math.sin(t * 8) * 0.2) + (chargeRatio * 0.6); // Intensify while charging

                // --- Obsidian Handle ---
                ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 22, 5, 40);
                // Silver Banding
                ctx.fillStyle = '#aaa';
                ctx.fillRect(0, 25, 5, 2); ctx.fillRect(0, 35, 5, 2); ctx.fillRect(0, 45, 5, 2);

                // --- Massive Hammer Head (Inferno Stone) ---
                const headX = -18, headY = 55, headW = 41, headH = 24;
                ctx.fillStyle = '#222'; ctx.fillRect(headX, headY, headW, headH);

                // LAVA CRACKS (Animated Pulsing)
                ctx.strokeStyle = `rgba(255, 120, 0, ${pulse})`; ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(headX + 5, headY + 5); ctx.lineTo(headX + 15, headY + 18);
                ctx.moveTo(headX + 25, headY + 3); ctx.lineTo(headX + 20, headY + 20);
                ctx.moveTo(headX + 35, headY + 8); ctx.lineTo(headX + 30, headY + 15);
                ctx.stroke();

                // PULSING CORE GLOW
                const cg = ctx.createRadialGradient(headX + headW / 2, headY + headH / 2, 2, headX + headW / 2, headY + headH / 2, 12);
                cg.addColorStop(0, `rgba(255, 200, 0, ${pulse})`);
                cg.addColorStop(0.5, `rgba(255, 100, 0, ${pulse * 0.6})`);
                cg.addColorStop(1, 'transparent');
                ctx.fillStyle = cg; ctx.fillRect(headX, headY, headW, headH);

                // Metallic Edges (Top and Bottom guards)
                ctx.fillStyle = '#444';
                ctx.fillRect(headX, headY, headW, 4);     // Top guard
                ctx.fillRect(headX, headY + headH - 4, headW, 4); // Bottom guard

                // --- LICKING FLAMES (Animated) ---
                ctx.fillStyle = '#ffaa00';
                for (let i = 0; i < 4; i++) {
                    const fX = headX + 5 + i * 10;
                    const fH = 12 + Math.sin(t * 15 + i) * 6;
                    ctx.beginPath();
                    ctx.moveTo(fX, headY);
                    ctx.quadraticCurveTo(fX + 5 + Math.sin(t * 10) * 3, headY - fH, fX + 10, headY);
                    ctx.fill();
                }
            }
        } else {
            // PUNCH animation — arm thrusts forward horizontally
            const extendY = -punch * 18; // arm lifts and extends
            const extendX = punch * 22;  // punches out horizontally
            ctx.fillStyle = '#1e3c72';
            ctx.fillRect(-3 + extendX * 0.3, 0 + extendY * 0.3, 8, 20);
            // Fist (closed hand, bigger when punching)
            const fistSize = 7 + punch * 4;
            ctx.fillStyle = '#f2c6a3';
            ctx.fillRect(-2 + extendX, 18 + extendY, fistSize, fistSize);
            // Knuckle lines when punching
            if (punch > 0.3) {
                ctx.fillStyle = '#e8a880';
                for (let k = 0; k < 3; k++) ctx.fillRect(-1 + extendX + k * 3, 19 + extendY, 2, 2);
            }
            // Impact flash at full extension
            if (punch > 0.75) {
                ctx.globalAlpha = (punch - 0.75) * 4 * 0.6;
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(extendX + 3, 22 + extendY, 8, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
        ctx.restore();

        // Head & Crown
        ctx.fillStyle = '#f4caab';
        ctx.beginPath(); ctx.ellipse(15, 2, 11, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e2b18f';
        ctx.beginPath(); ctx.ellipse(7, 3, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2b1a12'; ctx.fillRect(15, -1, 3, 2); ctx.fillRect(20, 0, 2, 2);
        ctx.fillStyle = '#ffbc00';
        ctx.beginPath();
        ctx.moveTo(5, -4); ctx.lineTo(7, -14); ctx.lineTo(11, -8); ctx.lineTo(15, -16); ctx.lineTo(19, -8); ctx.lineTo(23, -14); ctx.lineTo(25, -4); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffe082'; ctx.fillRect(7, -4, 16, 3);
        ctx.fillStyle = 'red'; ctx.fillRect(13, -11, 4, 4);
        ctx.restore();
    }
}

// ─── OUTPOST ──────────────────────────────────────────────────────────────────
class Outpost {
    constructor(world, x) {
        this.world = world; this.x = x; this.y = world.groundY;
        this.hp = 100; this.dead = false; this.time = 0;
        this.level = 1; // 1 = Outpost, 2 = Town
    }
    update(dt) { this.time += dt; this.dead = this.hp <= 0; }
    draw(ctx, cam) {
        const sx = this.x - cam.x, sy = this.y;
        if (this.dead) {
            ctx.fillStyle = '#666'; ctx.fillRect(sx - 80, sy - 25, 160, 25);
            ctx.fillStyle = '#888'; ctx.fillRect(sx - 60, sy - 38, 40, 15); ctx.fillRect(sx + 20, sy - 30, 30, 10);
            ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('⚠ Repair Outpost 100G [E]', sx, sy - 50); ctx.textAlign = 'left'; return;
        }
        if (this.level >= 2) {
            // ── TOWN ──
            // Main hall
            ctx.fillStyle = '#c8a96a'; ctx.fillRect(sx - 90, sy - 100, 180, 100);
            // Towers
            ctx.fillStyle = '#b09050'; ctx.fillRect(sx - 100, sy - 120, 30, 125); ctx.fillRect(sx + 70, sy - 120, 30, 125);
            // Tower roofs
            ctx.fillStyle = '#8b1a1a';
            ctx.beginPath(); ctx.moveTo(sx - 85, sy - 120); ctx.lineTo(sx - 100, sy - 150); ctx.lineTo(sx - 70, sy - 150); ctx.fill();
            ctx.beginPath(); ctx.moveTo(sx + 85, sy - 120); ctx.lineTo(sx + 70, sy - 150); ctx.lineTo(sx + 100, sy - 150); ctx.fill();
            // Gate
            ctx.fillStyle = '#3e2000'; ctx.fillRect(sx - 20, sy - 55, 40, 55);
            ctx.fillStyle = '#7b4a00'; ctx.beginPath(); ctx.arc(sx, sy - 55, 20, Math.PI, 0); ctx.fill();
            // Windows
            ctx.fillStyle = '#ffcc66';
            ctx.fillRect(sx - 70, sy - 80, 14, 16); ctx.fillRect(sx + 56, sy - 80, 14, 16);
            ctx.fillRect(sx - 45, sy - 80, 14, 16); ctx.fillRect(sx + 31, sy - 80, 14, 16);
            // Flag on centre
            ctx.fillStyle = '#5c4033'; ctx.fillRect(sx - 3, sy - 175, 6, 75);
            const fl = Math.sin(this.time * 5) * 12;
            ctx.fillStyle = '#c8102e'; ctx.beginPath(); ctx.moveTo(sx, sy - 175); ctx.lineTo(sx + 44 + fl, sy - 170); ctx.lineTo(sx + 44 + fl, sy - 155); ctx.lineTo(sx, sy - 160); ctx.fill();
            ctx.beginPath();
            // Label
            ctx.fillStyle = '#ffd700'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('🏤 TOWN', sx, sy - 182); ctx.textAlign = 'left';
        } else {
            // ── OUTPOST (Refugee Camp) ──
            // Square Main Tent
            ctx.fillStyle = '#6e5e4d'; ctx.fillRect(sx - 60, sy - 80, 100, 80);
            ctx.fillStyle = '#5c4a3d'; ctx.fillRect(sx - 65, sy - 85, 110, 20); // Roof edge
            ctx.beginPath(); ctx.moveTo(sx - 50, sy - 85); ctx.lineTo(sx - 10, sy - 130); ctx.lineTo(sx + 30, sy - 85); ctx.fill();
            // Tent flap / open interior
            ctx.fillStyle = '#3a2b1f'; ctx.fillRect(sx - 20, sy - 50, 40, 50);
            // Campfire
            const t = this.world.game ? this.world.game.lastTime / 1000 : 0;
            ctx.fillStyle = '#3b2512'; ctx.fillRect(sx + 45, sy - 6, 25, 6);
            ctx.fillStyle = '#ffaa00'; ctx.beginPath(); ctx.arc(sx + 57, sy - 6, 12 + Math.sin(t * 15) * 2, Math.PI, 0); ctx.fill();
            ctx.fillStyle = '#ff4400'; ctx.beginPath(); ctx.arc(sx + 57, sy - 6, 6 + Math.sin(t * 20) * 2, Math.PI, 0); ctx.fill();
            // Supply crates
            ctx.lineWidth = 1; ctx.strokeStyle = '#3a2211';
            ctx.fillStyle = '#8b5a2b'; ctx.fillRect(sx - 90, sy - 25, 25, 25); ctx.strokeRect(sx - 90, sy - 25, 25, 25);
            ctx.fillRect(sx - 95, sy - 40, 20, 15); ctx.strokeRect(sx - 95, sy - 40, 20, 15);
            // Flag pole
            ctx.fillStyle = '#4a3622'; ctx.fillRect(sx - 40, sy - 180, 4, 95);
            const fl = Math.sin(this.time * 6) * 10;
            ctx.fillStyle = '#9e1a1a'; ctx.beginPath(); ctx.moveTo(sx - 36, sy - 170); ctx.lineTo(sx + 20 + fl, sy - 165); ctx.lineTo(sx + 15 + fl, sy - 150); ctx.lineTo(sx - 36, sy - 155); ctx.fill();

            // Upgrade hint
            const player = this.world.game.player;
            if (Math.abs(this.x - player.x) < 120) {
                ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(sx - 110, sy - 185, 220, 22);
                ctx.fillStyle = '#ffd700'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Upgrade to Town 100G [T]', sx, sy - 169); ctx.textAlign = 'left';
            }
        }
        // HP bar
        ctx.fillStyle = '#500'; ctx.fillRect(sx - 52, sy - 144, 104, 10);
        ctx.fillStyle = 'lime'; ctx.fillRect(sx - 52, sy - 144, (this.hp / 100) * 104, 10);
        ctx.fillStyle = '#0f0'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${this.level >= 2 ? 'Town' : 'Outpost'} ${Math.ceil(this.hp)}/100`, sx, sy - 147); ctx.textAlign = 'left';
    }
}

// ─── ENEMY CAMP ───────────────────────────────────────────────────────────────
class EnemyCamp {
    constructor(world, x) {
        this.world = world; this.x = x; this.y = world.groundY;
        this.maxHp = 1000; this.hp = 1000;
        this.dead = false; this.time = 0;
        this.particles = [];
    }
    takeDamage(dmg) {
        if (this.dead) return;
        this.hp -= dmg; sfx.playHit();
        if (this.hp <= 0) {
            this.hp = 0; this.dead = true;
            for (let i = 0; i < 40; i++) {
                this.world.particles.push(new Particle(this.x + (Math.random() - 0.5) * 100, this.y - 40, '#1a0033'));
            }
        }
    }
    update(dt) {
        this.time += dt;
    }
    draw(ctx, cam) {
        const sx = this.x - cam.x, sy = this.y;
        
        // 1. Charred Ground Effect
        const groundW = 400;
        const grad = ctx.createRadialGradient(sx, sy, 50, sx, sy, groundW / 2);
        grad.addColorStop(0, 'rgba(20, 10, 30, 0.7)');
        grad.addColorStop(0.6, 'rgba(40, 40, 50, 0.4)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(sx - groundW / 2, sy - 20, groundW, 60);

        if (this.dead) {
            // Drawn broken structures
            ctx.fillStyle = '#111';
            ctx.fillRect(sx - 60, sy - 10, 120, 10);
            ctx.fillStyle = '#222';
            ctx.fillRect(sx - 40, sy - 20, 30, 15);
            ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
            ctx.fillStyle = '#444'; ctx.fillText('RUINED CAMP', sx, sy - 40);
            ctx.textAlign = 'left';
            return;
        }

        // 2. Void Portal (Swirling effect)
        ctx.save();
        ctx.translate(sx, sy - 70);
        const portalScale = 1.0 + Math.sin(this.time * 2) * 0.1;
        ctx.scale(portalScale, portalScale);
        for(let i=0; i<3; i++) {
            ctx.rotate(this.time * (i + 1) * 0.5);
            ctx.fillStyle = i === 0 ? 'rgba(155, 0, 200, 0.4)' : i === 1 ? 'rgba(50, 0, 100, 0.6)' : 'rgba(10, 0, 20, 0.8)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 40 - i*10, 60 - i*15, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // 3. Command Tents (Spooky)
        ctx.fillStyle = '#0a001a';
        // Main Tent
        ctx.beginPath();
        ctx.moveTo(sx - 100, sy); ctx.lineTo(sx - 10, sy - 120); ctx.lineTo(sx + 80, sy);
        ctx.closePath(); ctx.fill();
        // Highlights & Tattered detail
        ctx.fillStyle = '#1a0033';
        ctx.beginPath(); ctx.moveTo(sx - 10, sy - 120); ctx.lineTo(sx + 10, sy - 120); ctx.lineTo(sx + 20, sy - 40); ctx.lineTo(sx - 20, sy - 40); ctx.fill();
        // Tattered Banner
        const fl = Math.sin(this.time * 4) * 5;
        ctx.fillStyle = '#400';
        ctx.beginPath();
        ctx.moveTo(sx - 10, sy - 110); ctx.lineTo(sx - 40 - fl, sy - 105); ctx.lineTo(sx - 35 - fl, sy - 85); ctx.lineTo(sx - 10, sy - 90);
        ctx.fill();

        // 4. Bone Structure (Ribs)
        ctx.strokeStyle = '#d0d0d8'; ctx.lineWidth = 8; ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i += 2) {
            ctx.beginPath();
            ctx.moveTo(sx + i * 140, sy);
            ctx.quadraticCurveTo(sx + i * 120, sy - 150, sx + i * 20, sy - 30);
            ctx.stroke();
            // Smaller spikes
            ctx.beginPath();
            ctx.moveTo(sx + i * 110, sy);
            ctx.quadraticCurveTo(sx + i * 100, sy - 100, sx + i * 40, sy - 20);
            ctx.stroke();
        }

        // 5. Shadow Lanterns
        for (let i = 0; i < 2; i++) {
            const lx = sx + (i === 0 ? -120 : 120);
            const ly = sy - 90 + Math.sin(this.time * 3 + i) * 10;
            const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, 20);
            glow.addColorStop(0, 'rgba(155, 0, 200, 0.8)');
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(lx, ly, 20, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill();
        }

        // 6. HP Bar
        const barW = 200, barH = 12;
        const bx = sx - barW / 2, by = sy - 180;
        ctx.fillStyle = '#200'; ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
        const hpRatio = this.hp / this.maxHp;
        const barGrad = ctx.createLinearGradient(bx, 0, bx + barW, 0);
        barGrad.addColorStop(0, '#9b00c8'); barGrad.addColorStop(1, '#ff0055');
        ctx.fillStyle = barGrad;
        ctx.fillRect(bx, by, barW * hpRatio, barH);
        // Jagged border
        ctx.strokeStyle = '#400'; ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i=0; i<=barW; i+=10) {
            ctx.lineTo(bx + i, by + (i%20===0 ? -3 : 0));
        }
        ctx.stroke();

        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`ENEMY COMMAND CAMP ${Math.ceil(this.hp)}/1000`, sx, by - 14);
        ctx.textAlign = 'left';
    }
}

// ─── BARRACK ──────────────────────────────────────────────────────────────────
class Barrack {
    constructor(world, x) {
        this.world = world; this.x = x; this.y = world.groundY;
        this.hireCost = 30; this.time = 0;
        this.maxHp = 200; this.hp = 200;
        this.dead = false; this.hitTimer = 0;
    }
    takeDamage(dmg) {
        this.hp -= dmg; this.hitTimer = 0.15; sfx.playHit();
        if (this.hp <= 0) {
            this.dead = true;
            for (let i = 0; i < 20; i++) this.world.particles.push(new Particle(this.x, this.y - 40, '#555'));
        }
    }
    update(dt) {
        this.time += dt;
        if (this.hitTimer > 0) this.hitTimer -= dt;
    }
    draw(ctx, cam, player) {
        if (this.dead) return;
        const sx = this.x - cam.x, sy = this.y;
        ctx.save();
        if (this.hitTimer > 0) ctx.translate(Math.sin(this.hitTimer * 60) * 3, 0);
        const isTown = this.world.outpost.level >= 2;
        // Base structure
        ctx.fillStyle = '#656b73'; ctx.fillRect(sx - 55, sy - 80, 110, 80); // main stone walls
        // Crenellations (Castle teeth)
        ctx.fillStyle = '#555b63';
        for (let i = -55; i < 60; i += 20) ctx.fillRect(sx + i, sy - 100, 14, 22);
        // Stone texture lines
        ctx.fillStyle = '#4c5259';
        for (let j = 0; j < 4; j++) { ctx.fillRect(sx - 40, sy - 70 + j * 15, 20, 2); ctx.fillRect(sx + 20, sy - 70 + j * 15, 30, 2); ctx.fillRect(sx - 10, sy - 63 + j * 15, 20, 2); }
        // Archway Door
        ctx.fillStyle = '#2b1a10'; ctx.fillRect(sx - 15, sy - 50, 30, 50);
        ctx.beginPath(); ctx.arc(sx, sy - 50, 15, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#111'; ctx.fillRect(sx - 10, sy - 45, 20, 45); // dark interior

        // Weapon Rack & Shields
        ctx.fillStyle = '#4a2f1d'; ctx.fillRect(sx - 45, sy - 30, 15, 30); // rack
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = '#ccc'; ctx.fillRect(sx - 42 + i * 4, sy - 35, 2, 25); // swords
            ctx.fillStyle = '#8b4513'; ctx.fillRect(sx - 43 + i * 4, sy - 15, 4, 5); // hilt
        }
        // Shield Stack
        ctx.fillStyle = '#8b2222'; ctx.beginPath(); ctx.arc(sx + 40, sy - 15, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#cecece'; ctx.beginPath(); ctx.arc(sx + 40, sy - 15, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6b1111'; ctx.beginPath(); ctx.arc(sx + 35, sy - 10, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#cecece'; ctx.beginPath(); ctx.arc(sx + 35, sy - 10, 4, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = isTown ? '#ffd700' : '#c8a000'; ctx.fillRect(sx - 35, sy - 98, 70, 15);
        ctx.fillStyle = '#000'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(isTown ? 'BARRACKS★' : 'BARRACKS', sx, sy - 87); ctx.textAlign = 'left';

        // Main Fort Flag
        ctx.fillStyle = '#3a2b1f'; ctx.fillRect(sx + 55, sy - 130, 4, 55);
        const t = this.world.game ? this.world.game.lastTime / 1000 : 0;
        const fl = Math.sin(t * 8) * 8;
        ctx.fillStyle = '#8b1a1a';
        ctx.beginPath(); ctx.moveTo(sx + 59, sy - 130); ctx.lineTo(sx + 85 + fl, sy - 125); ctx.lineTo(sx + 85 + fl, sy - 110); ctx.lineTo(sx + 59, sy - 115); ctx.fill();
        // Torch
        ctx.fillStyle = '#333'; ctx.fillRect(sx + 20, sy - 40, 5, 15);
        ctx.fillStyle = `rgba(255, 68, 0, ${0.8 + Math.sin(t * 20) * 0.2})`;
        ctx.beginPath(); ctx.arc(sx + 22.5, sy - 45, 8 + Math.sin(t * 15) * 2, 0, Math.PI * 2); ctx.fill();
        // Hire menu
        if (Math.abs(this.x - player.x) < 80) {
            if (isTown) {
                // Show 2-option menu
                ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(sx - 110, sy - 155, 220, 30);
                ctx.fillStyle = '#0f0'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('[1] Soldier 30G  [2] Archer 50G', sx, sy - 135);
                ctx.textAlign = 'left';
            } else {
                ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(sx - 75, sy - 155, 150, 30);
                ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('[1] Soldier 30G', sx, sy - 135);
                ctx.textAlign = 'left';
            }
        }
        // HP bar
        ctx.fillStyle = '#400'; ctx.fillRect(sx - 40, sy - 110, 80, 5);
        const hpRatio = this.hp / this.maxHp;
        ctx.fillStyle = hpRatio > 0.5 ? '#0c0' : hpRatio > 0.25 ? '#f5a623' : '#e00';
        ctx.fillRect(sx - 40, sy - 110, hpRatio * 80, 5);

        ctx.restore();
    }
}

// ─── ANIMAL ───────────────────────────────────────────────────────────────────
class Animal {
    constructor(world, x, type) {
        this.world = world; this.x = x; this.y = world.groundY;
        this.type = type; // 'rabbit' or 'deer'
        this.vx = 0; this.vy = 0; this.facingRight = Math.random() > 0.5;
        this.time = Math.random() * 10;
        this.hp = type === 'deer' ? 35 : 10;
        this.maxHp = this.hp;
        this.dead = false; this.state = 'idle'; this.stateTimer = 0;
        this.speed = type === 'deer' ? 90 : 120;
    }
    takeDamage(dmg) {
        this.hp -= dmg; triggerHitGlow(this);
        if (this.hp <= 0 && !this.dead) {
            this.dead = true;
            const meatCount = this.type === 'deer' ? 2 : 1;
            for (let i = 0; i < meatCount; i++) {
                this.world.groundItems.push(new GroundItem(this.world, this.x + (Math.random() - 0.5) * 20, this.world.groundY - 20, 'meat'));
            }
            for (let i = 0; i < 15; i++) this.world.particles.push(new Particle(this.x, this.y - 10, '#c8102e'));
        } else {
            // Panic run
            this.state = 'run'; this.stateTimer = 2.0;
            const attackerX = this.world.game.player.x;
            this.vx = this.x > attackerX ? this.speed * 1.5 : -this.speed * 1.5;
            this.facingRight = this.vx > 0;
        }
    }
    update(dt) {
        if (this.dead) return;
        this.time += dt;
        this.stateTimer -= dt;

        if (this.stateTimer <= 0) {
            if (this.state === 'idle' || this.state === 'eating') {
                const r = Math.random();
                if (r < 0.5) {
                    this.state = 'walk'; this.stateTimer = 1.5 + Math.random() * 2.0;
                    this.vx = (Math.random() > 0.5 ? 1 : -1) * this.speed * 0.4;
                    this.facingRight = this.vx > 0;
                } else if (r < 0.8 && this.type === 'deer') {
                    this.state = 'eating'; this.stateTimer = 3.0 + Math.random() * 4.0;
                    this.vx = 0;
                } else {
                    this.state = 'idle'; this.stateTimer = 2.0 + Math.random() * 3.0;
                    this.vx = 0;
                }
            } else {
                this.state = 'idle'; this.stateTimer = 2.0 + Math.random() * 3.0;
                this.vx = 0;
            }
        }

        this.x += this.vx * dt;
        if (this.x < -1800) this.x = -1800;
        if (this.x > 5000) this.x = 5000;
    }
    _drawLeg(ctx, x, y, angle, width, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = color;
        // Joint 1: Thigh
        ctx.rotate(angle * 0.4);
        ctx.beginPath(); ctx.roundRect(-width / 2, 0, width, 14, width / 2); ctx.fill();
        // Joint 2: Shin
        ctx.translate(0, 14);
        ctx.rotate(-angle * 0.6);
        ctx.beginPath(); ctx.roundRect(-width / 2, 0, width, 14, width / 2); ctx.fill();
        // Hoof
        ctx.fillStyle = '#222'; ctx.fillRect(-width / 2, 11, width + 1, 4);
        ctx.restore();
    }
    draw(ctx, cam) {
        if (this.dead) return;
        const sx = this.x - cam.x, sy = this.y;
        ctx.save();
        applyHitGlow(ctx, this);
        const bob = (this.state === 'walk' || this.state === 'run') ? Math.abs(Math.sin(this.time * 12)) * 4 : 0;

        // Species-specific Y alignment: Deer has long jointed legs, Rabbit is low to ground
        const yOffset = this.type === 'deer' ? 24 : 0;
        ctx.translate(sx, sy - bob - yOffset);

        if (!this.facingRight) ctx.scale(-1, 1);

        if (this.type === 'rabbit') {
            ctx.fillStyle = '#f0f0f0';
            ctx.beginPath(); ctx.ellipse(0, -6, 8, 6, 0, 0, Math.PI * 2); ctx.fill(); // body
            ctx.beginPath(); ctx.ellipse(6, -10, 5, 5, 0, 0, Math.PI * 2); ctx.fill(); // head
            ctx.fillStyle = '#e8caca';
            ctx.fillRect(5, -18, 2, 8); ctx.fillRect(1, -19, 2, 8); // ears
            ctx.fillStyle = '#111'; ctx.fillRect(6, -11, 2, 2); // eye
        } else if (this.type === 'deer') {
            const color = '#8b5a2b';
            const antlerColor = '#d4b798';
            const walk = (this.state === 'walk' || this.state === 'run') ? Math.sin(this.time * 12) : 0;

            // Back Legs
            this._drawLeg(ctx, -12, -4, walk, 3, color);
            this._drawLeg(ctx, -4, -4, -walk, 3, color);

            // Slim Anatomical Body
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(-18, 0);
            ctx.bezierCurveTo(-28, -10, -10, -25, 10, -20); // Slimmed back line
            ctx.bezierCurveTo(24, -18, 28, -2, 20, 4);       // Chest flare
            ctx.bezierCurveTo(10, 8, -10, 8, -18, 0);       // Tapered belly
            ctx.closePath(); ctx.fill();

            // Small Tail (with subtle flick)
            ctx.fillStyle = '#d4b798';
            ctx.save();
            ctx.translate(-18, -2);
            ctx.rotate(Math.sin(this.time * 5) * 0.2);
            ctx.beginPath(); ctx.ellipse(-2, 0, 4, 2.5, -0.2, 0, Math.PI * 2); ctx.fill();
            ctx.restore();

            // Neck & Head
            ctx.save();
            ctx.translate(18, -15);
            // Lower neck if eating, else subtle sway
            const isEating = this.state === 'eating';
            const neckRot = isEating ? 1.0 + Math.sin(this.time * 20) * 0.03 : Math.sin(this.time * 2) * 0.05;
            ctx.rotate(neckRot);
            ctx.beginPath(); // Neck curve
            ctx.moveTo(0, 0); ctx.quadraticCurveTo(4, -12, 10, -17);
            ctx.lineTo(2, -23); ctx.quadraticCurveTo(-4, -12, -6, 4);
            ctx.fill();

            ctx.translate(8, -20); // Head Position
            ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0.4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(-4, -4, 5, 2, -0.8, 0, Math.PI * 2); ctx.fill(); // Ear
            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(2, -1, 1.2, 0, Math.PI * 2); ctx.fill(); // Eye

            // Antlers (Majestic Stag style)
            ctx.strokeStyle = antlerColor; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
            for (let i = 0; i < 2; i++) {
                const side = i === 0 ? 1 : -1;
                ctx.save(); ctx.translate(-2, -3);
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(side * 4, -13);
                for (let p = 0; p < 4; p++) {
                    ctx.moveTo(side * (1 + p), -4 - p * 2.5);
                    ctx.lineTo(side * (6 + p * 1.5), -7 - p * 4);
                }
                ctx.stroke(); ctx.restore();
            }
            ctx.restore();

            // Front Legs
            this._drawLeg(ctx, 12, -4, -walk, 3, color);
            this._drawLeg(ctx, 18, -4, walk, 3, color);
        }
        ctx.restore();
    }
}


// ─── WORLD ────────────────────────────────────────────────────────────────────
class World {
    constructor(game) {
        this.game = game;
        this.groundY = game.canvas.height - 80;
        this.lastGroundY = this.groundY;
        // Background trees
        this.trees = [];
        for (let i = -10; i < 60; i++) this.trees.push({ x: i * 200 + Math.random() * 100, type: Math.random() > 0.5 ? 1 : 2, height: 150 + Math.random() * 100, z: Math.random() });
        this.trees.sort((a, b) => a.z - b.z);
        // Background stars
        this.stars = [];
        for (let i = 0; i < 120; i++) this.stars.push({ x: Math.random() * 4000, y: Math.random() * 300, size: 1 + Math.random() * 2, twinkle: Math.random() * Math.PI * 2 });
        // Background clouds
        this.clouds = [];
        for (let i = 0; i < 8; i++) this.clouds.push({ x: Math.random() * 5000, y: 50 + Math.random() * 150, w: 80 + Math.random() * 120, speed: 8 + Math.random() * 15 });
        // Foreground
        this.foregroundTrees = [];
        // Right-side trees: forest east of outpost starting further away
        for (let i = 0; i < 8; i++) this.foregroundTrees.push(new ForegroundTree(this, 1750 + i * (180 + Math.random() * 120)));
        // Left-side trees: forest west of starting zone, closer together
        const leftTreePositions = [];
        let lx = -200;
        for (let i = 0; i < 12; i++) {
            lx -= (80 + Math.random() * 70);
            leftTreePositions.push(lx);
        }
        for (const tx of leftTreePositions) this.foregroundTrees.push(new ForegroundTree(this, tx));
        this.axeShop = new Shop(this, 500, 'axe');
        this.sellShop = new Shop(this, 750, 'sell');
        this.refugeShop = new Shop(this, 1450, 'refuge');
        this.hammerShop = new Shop(this, 1600, 'hammer');

        this.decorations = [];
        for (let i = 0; i < 80; i++) {
            const types = ['grass', 'flower'];
            const dx = -2000 + Math.random() * 8000;
            // Outpost is at x=1150 — avoid spawning decorations too close to it
            if (Math.abs(dx - 1150) > 160) {
                this.decorations.push(new Decoration(this, dx, types[Math.floor(Math.random() * 2)]));
            }
        }
        this.outpost = new Outpost(this, 1150);
        this.enemyCamp = new EnemyCamp(this, 5000); // New Target
        this.barracks = [new Barrack(this, 950)];
        this.farms = [];
        this.soldiers = [];
        this.archers = [];
        this.birds = [];
        

        // Spawn birds on random trees (1-4 birds per tree)
        for (let i = 0; i < 6; i++) {
            const tree = this.foregroundTrees[Math.floor(Math.random() * this.foregroundTrees.length)];
            if (tree) {
                const birdCount = Math.floor(Math.random() * 4) + 1;
                for (let b = 0; b < birdCount; b++) {
                    const bird = new Bird(this, tree);
                    tree.perchedBirds.push(bird);
                    this.birds.push(bird);
                }
            }
        }
        this.ladybugs = [];
        // Ladybugs near flowers
        for (const d of this.decorations) {
            if (d.type === 'flower' && Math.random() < 0.3) {
                this.ladybugs.push(new Ladybug(this, d));
            }
        }
        this.arrows = [];
        this.heroProjectiles = [];
        this.woodBlocks = [];
        this.enemies = [];
        // --- Spawn Camp Guards ---
        for (let i = 0; i < 3; i++) this.enemies.push(new Enemy(this, 4800 + i * 40, 5000));
        for (let i = 0; i < 2; i++) this.enemies.push(new EnemyArcher(this, 4900 + i * 40, 5000));

        this.animals = [];
        for (let i = 0; i < 4; i++) {
            const ax = 1500 + Math.random() * 2000;
            this.animals.push(new Animal(this, ax, Math.random() > 0.5 ? 'deer' : 'rabbit'));
        }
        this.groundItems = [];
        this.particles = [];
        this.npcs = [];
        this.workers = [];
        this.hunters = [];
        for (let i = 0; i < 3; i++) this.npcs.push(new NPC(this, 950 + i * 80));
        this.waveTimer = 30;
        this.waveInterval = 180;
        this.waveNumber = 0;
        this.waveActive = false;
        this.moonRed = 0;
        this.time = 0;
        this.hiringBarrack = null; // which barrack is showing hire menu
        this.eHoldTimer = 0;
        // Meteor shower
        this.meteors = [];
        this.meteorShowerCooldown = 90 + Math.random() * 120; // first shower in 90-210s
        this.meteorShowerActive = false;
        this.meteorShowerTimer = 0;
        this.meteorShowerBigPending = false;
        this.huntersHiredCount = 0;
    }
    update(dt, input) {
        this.time += dt;
        this.groundY = this.game.canvas.height - 80;
        
        // --- Vertical Realignment (Stretchable Graphics Support) ---
        if (this.groundY !== this.lastGroundY) {
            const dy = this.groundY - this.lastGroundY;
            this._realignVerticalContent(dy);
            this.lastGroundY = this.groundY;
        }

        const player = this.game.player;
        // Keybinds
        if (input.justPressed('KeyB')) this._buildWoodBlock(player);
        if (input.justPressed('KeyE')) this._handleE(player);

        // Hold E to Sell All logic
        const distToSell = Math.abs(this.sellShop.x - player.x);
        if (distToSell < 60 && input.isDown('KeyE')) {
            this.eHoldTimer += dt;
            if (this.eHoldTimer >= 2.0) {
                this.eHoldTimer = 0;
                let sold = false;
                if (player.inventory.wood > 0) {
                    player.inventory.gold += player.inventory.wood * 2;
                    player.inventory.wood = 0; sold = true;
                }
                if (sold) {
                    sfx.playCoin();
                    for (let i = 0; i < 15; i++) this.particles.push(new Particle(this.sellShop.x, this.sellShop.y - 40, '#ffd700'));
                }
            }
        } else {
            this.eHoldTimer = 0;
        }

        if (distToSell < 60 && input.isDown('KeyR')) {
            this.rHoldTimer = (this.rHoldTimer || 0) + dt;
            if (this.rHoldTimer >= 2.0) {
                this.rHoldTimer = 0;
                let sold = false;
                if (player.inventory.wheat > 0) {
                    player.inventory.gold += player.inventory.wheat * 3;
                    player.inventory.wheat = 0; sold = true;
                }
                if (sold) {
                    sfx.playCoin();
                    for (let i = 0; i < 15; i++) this.particles.push(new Particle(this.sellShop.x, this.sellShop.y - 40, '#ffd700'));
                }
            }
        } else {
            this.rHoldTimer = 0;
        }

        // Auto-detect nearest barrack for quick hiring (no 'E' required)
        let nearestB = null;
        let minDistB = 80;
        for (const b of this.barracks) {
            const d = Math.abs(b.x - player.x);
            if (d < minDistB) { minDistB = d; nearestB = b; }
        }
        this.hiringBarrack = nearestB;

        if (input.justPressed('KeyR')) {
            if (distToSell < 60) {
                // Single R at sell shop: sell 1 wheat for 3g
                if (player.inventory.wheat >= 1) {
                    player.inventory.wheat -= 1;
                    player.inventory.gold += 3;
                    sfx.playCoin();
                    this.particles.push(new Particle(this.sellShop.x, this.sellShop.y - 40, '#ffd700'));
                }
            } else {
                this._handleR(player);
            }
        }

        // Sell Meat Single (Y)
        if (input.justPressed('KeyY')) {
            if (distToSell < 60) {
                if (player.inventory.meat >= 1) {
                    player.inventory.meat -= 1; player.inventory.gold += 3; sfx.playCoin();
                    this.particles.push(new Particle(this.sellShop.x, this.sellShop.y - 40, '#ffd700'));
                }
            }
        }

        // Sell Meat Hold (Y)
        if (distToSell < 60 && input.isDown('KeyY')) {
            this.yHoldTimer = (this.yHoldTimer || 0) + dt;
            if (this.yHoldTimer >= 2.0) {
                this.yHoldTimer = 0;
                let sold = false;
                if (player.inventory.meat > 0) { player.inventory.gold += player.inventory.meat * 3; player.inventory.meat = 0; sold = true; }
                if (sold) { sfx.playCoin(); for (let i = 0; i < 15; i++) this.particles.push(new Particle(this.sellShop.x, this.sellShop.y - 40, '#ffd700')); }
            }
        } else {
            this.yHoldTimer = 0;
        }

        // Refuge Shop AI
        if (Math.abs(this.refugeShop.x - player.x) < 60) this.hiringRefuge = true;
        else this.hiringRefuge = false;

        if (input.justPressed('Digit1')) {
            if (this.hiringBarrack) this._hireFromMenu(player, 'soldier');
            else if (this.hiringRefuge) {
                const cost = this.outpost.level >= 2 ? 5 : 2;
                if (player.inventory.wheat >= cost) { player.inventory.wheat -= cost; this.workers.push(new Worker(this, this.refugeShop.x)); sfx.playHire(); }
            }
        }
        if (input.justPressed('Digit2')) {
            if (this.hiringBarrack) this._hireFromMenu(player, 'archer');
            else if (this.hiringRefuge) {
                if (player.inventory.wood >= 5) {
                    player.inventory.wood -= 5;
                    this.huntersHiredCount++;
                    const side = (this.huntersHiredCount % 2 === 0) ? -1 : 1; // 1st right, 2nd left
                    const h = new Hunter(this, this.refugeShop.x, side);
                    this.hunters.push(h); sfx.playHire();
                }
            }
        }

        if (input.justPressed('KeyV')) this._buildBarrack(player);
        if (input.justPressed('KeyF')) this._buildFarm(player);
        if (input.justPressed('KeyU')) this._upgradeFarm(player);
        if (input.justPressed('KeyH')) this._healSoldier(player);
        if (input.justPressed('KeyT')) this._upgradeTown(player);
        // Waves
        this.waveTimer -= dt;
        if (this.waveTimer <= 0) { this._spawnWave(); this.waveTimer = this.waveInterval; }
        // Moon state: go red when wave is near (<15s) or enemies alive
        this.waveActive = this.enemies.length > 0;
        const wantRed = this.waveActive || this.waveTimer < 15;
        this.moonRed += ((wantRed ? 1 : 0) - this.moonRed) * dt * 2;
        this.moonRed = Math.max(0, Math.min(1, this.moonRed));
        // Update clouds
        for (const c of this.clouds) { c.x += c.speed * dt; if (c.x > 5500) c.x = -200; }
        // Meteor shower
        if (!this.meteorShowerActive) {
            this.meteorShowerCooldown -= dt;
            if (this.meteorShowerCooldown <= 0) {
                this.meteorShowerActive = true;
                this.meteorShowerTimer = 6 + Math.random() * 5; // shower lasts 6-11s
                this.meteorShowerBigPending = true;  // big coin meteor comes once
                this.meteorSpawnTimer = 0;
            }
        } else {
            this.meteorShowerTimer -= dt;
            this.meteorSpawnTimer -= dt;
            if (this.meteorShowerBigPending) {
                // spawn the big coin meteor at the start of the shower
                this.meteors.push(new Meteor(this, true));
                this.meteorShowerBigPending = false;
            }
            if (this.meteorSpawnTimer <= 0) {
                this.meteors.push(new Meteor(this, false));
                this.meteorSpawnTimer = 0.18 + Math.random() * 0.3;
            }
            if (this.meteorShowerTimer <= 0) {
                this.meteorShowerActive = false;
                this.meteorShowerCooldown = 90 + Math.random() * 120;
            }
        }
        this.meteors.forEach(m => m.update(dt));
        this.meteors = this.meteors.filter(m => !m.dead);
        // Update entities
        this.outpost.update(dt);
        this.barracks.forEach(b => b.update(dt));
        this.barracks = this.barracks.filter(b => !b.dead);
        this.birds.forEach(b => b.update(dt));
        this.birds = this.birds.filter(b => !b.dead);
        this.farms.forEach(f => f.update(dt));
        this.farms = this.farms.filter(f => !f.dead);
        this.foregroundTrees.forEach(t => t.update(dt));
        this.woodBlocks.forEach(b => b.update(dt));
        this.woodBlocks = this.woodBlocks.filter(b => !b.dead);
        this.npcs.forEach(n => n.update(dt));
        this.workers.forEach(w => w.update(dt));
        this.hunters.forEach(h => h.update(dt));
        this.hunters = this.hunters.filter(h => !h.dead);
        this.workers = this.workers.filter(w => !w.dead);
        this.soldiers.forEach(s => s.update(dt, player));
        this.soldiers = this.soldiers.filter(s => !s.dead);
        this.archers.forEach(a => a.update(dt, player));
        this.archers = this.archers.filter(a => !a.dead);
        this.arrows.forEach(a => a.update(dt));
        this.arrows = this.arrows.filter(a => !a.dead);
        this.heroProjectiles.forEach(p => p.update(dt));
        this.heroProjectiles = this.heroProjectiles.filter(p => !p.dead);
        this.enemies.forEach(e => e.update(dt));
        this.enemies.filter(e => e.dead && !e.coinDropped).forEach(e => e.die(this));
        this.enemies = this.enemies.filter(e => !e.dead);
        // Animals
        this.animals.forEach(a => a.update(dt));
        this.animals = this.animals.filter(a => !a.dead);
        if (this.animals.length < 6 && Math.random() < 0.002) {
            const ax = this.outpost.x + (Math.random() > 0.5 ? 1 : -1) * (1500 + Math.random() * 1500);
            this.animals.push(new Animal(this, ax, Math.random() > 0.5 ? 'deer' : 'rabbit'));
        }

        // Enemy Camp Update
        this.enemyCamp.update(dt);

        // Ladybugs
        this.ladybugs.forEach(l => l.update(dt));

        // Dynamic Decorations (Flowers & Grass)
        this.decorations.forEach(d => d.update(dt));

        // Clear hiring menu if player walks away
        if (this.hiringBarrack && Math.abs(this.hiringBarrack.x - player.x) > 100) this.hiringBarrack = null;
        this.groundItems.forEach(i => i.update(dt));
        this.groundItems = this.groundItems.filter(i => !i.picked);
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => p.life > 0);
    }
    _realignVerticalContent(dy) {
        this.game.player.y += dy;
        const objects = [
            this.outpost, this.enemyCamp, this.axeShop, this.sellShop, this.refugeShop, this.hammerShop,
            ...this.barracks, ...this.farms, ...this.soldiers, ...this.archers, ...this.workers, ...this.hunters,
            ...this.enemies, ...this.animals, ...this.npcs, ...this.decorations, ...this.foregroundTrees,
            ...this.birds, ...this.ladybugs, ...this.groundItems, ...this.particles, ...this.arrows
        ];
        for (const obj of objects) {
            if (obj && obj.y !== undefined) obj.y += dy;
        }
    }
    _buildWoodBlock(p) {
        if (p.inventory.wood < 30) return;
        const bx = p.x + (p.facingRight ? 55 : -55);
        this.woodBlocks.push(new WoodBlock(this, bx));
        p.inventory.wood -= 30; sfx.playBuild();
    }
    _buildBarrack(p) {
        if (p.inventory.gold < 100) return;
        this.barracks.push(new Barrack(this, p.x + (p.facingRight ? 100 : -100)));
        p.inventory.gold -= 100; sfx.playBuild();
    }
    _buildFarm(p) {
        if (p.inventory.gold < 100) return;
        this.farms.push(new Farm(this, p.x + (p.facingRight ? 80 : -80)));
        p.inventory.gold -= 100; sfx.playBuild();
    }
    _upgradeFarm(p) {
        let nearest = null, nearestDist = 120;
        for (const f of this.farms) {
            const d = Math.abs(f.x - p.x);
            if (d < nearestDist && f.level === 1) { nearest = f; nearestDist = d; }
        }
        if (nearest && p.inventory.wood >= 50) {
            p.inventory.wood -= 50; nearest.level = 2; sfx.playRepair();
        }
    }
    _healSoldier(p) {
        if (p.inventory.wheat <= 0) return;
        const targets = [...this.soldiers, ...this.archers, ...this.workers, ...this.hunters];
        for (const sol of targets) {
            if (sol.dead) continue;
            if (sol.hp >= sol.maxHp) continue;
            if (Math.abs(sol.x - p.x) < 70) {
                p.inventory.wheat -= 1;
                sol.hp = Math.min(sol.maxHp, sol.hp + 40);
                sol.dialogue = 'Thank you, sire!';
                sol.dialogueTimer = 2;
                sfx.playHeal();
                for (let i = 0; i < 6; i++) this.particles.push(new Particle(sol.x + 15, sol.y + 10, '#00ff88', (Math.random() - 0.5) * 60, -Math.random() * 120 - 40));
                return;
            }
        }
    }
    _upgradeTown(p) {
        if (this.outpost.dead || this.outpost.level >= 2) return;
        if (Math.abs(this.outpost.x - p.x) > 130) return;
        if (p.inventory.gold < 100) return;
        p.inventory.gold -= 100;
        this.outpost.level = 2;
        sfx.playRepair();
        // Fanfare particles
        for (let i = 0; i < 20; i++) this.particles.push(new Particle(this.outpost.x + (Math.random() - 0.5) * 160, this.outpost.y - 80, '#ffd700'));
    }
    _hireFromMenu(p, type) {
        if (!this.hiringBarrack) return;
        const b = this.hiringBarrack;
        if (type === 'soldier') {
            if (p.inventory.gold < 30) return;
            p.inventory.gold -= 30;
            const sol = new Soldier(this, b.x + (Math.random() - 0.5) * 40);
            sol.guardX = b.x + 600 + Math.random() * 100;
            sol.spawnWalkTimer = 4.0;
            this.soldiers.push(sol); sfx.playHire();
        } else if (type === 'archer') {
            if (this.outpost.level < 2 || p.inventory.gold < 50) return;
            p.inventory.gold -= 50;
            const arc = new Archer(this, b.x + (Math.random() - 0.5) * 40);
            arc.guardX = b.x + 600 + Math.random() * 100;
            arc.spawnWalkTimer = 4.0;
            this.archers.push(arc); sfx.playHire();
        }
        this.hiringBarrack = null;
    }
    _spawnWave() {
        this.waveNumber++;
        const count = 4 + this.waveNumber * 2;
        const spawnX = this.enemyCamp.dead ? 4000 : this.enemyCamp.x - 100;
        for (let i = 0; i < count; i++) {
            if (this.waveNumber >= 6 && Math.random() < 0.3) {
                this.enemies.push(new EnemyArcher(this, spawnX + Math.random() * 500 + i * 120));
            } else {
                this.enemies.push(new Enemy(this, spawnX + Math.random() * 500 + i * 120));
            }
        }
    }
    _handleE(player, forceHammer = false) {
        // Repair outpost
        if (this.outpost.dead && Math.abs(this.outpost.x - player.x) < 120 && player.inventory.gold >= 100) {
            player.inventory.gold -= 100; this.outpost.hp = 100; sfx.playRepair(); return;
        }
        // Barrack interaction (Hire Soldier [1] / Archer [2]) is now handled exclusively in World.update
        // to prevent accidental gold spend when pressing E near a barrack.
        // Buy weapons
        if (Math.abs(this.axeShop.x - player.x) < 60) {
            if (!player.inventory.hasAxe && player.inventory.gold >= 10) {
                player.inventory.gold -= 10; player.inventory.hasAxe = true; sfx.playCoin(); return;
            }
            if (player.inventory.hasAxe && !player.inventory.hasSword && player.inventory.gold >= 50) {
                player.inventory.gold -= 50; player.inventory.hasSword = true; sfx.playCoin(); return;
            }
            if (player.inventory.hasSword && !player.inventory.hasHammer && player.inventory.gold >= 1000) {
                player.inventory.gold -= 1000; player.inventory.hasHammer = true; sfx.playCoin();
                for (let i = 0; i < 20; i++) this.particles.push(new Particle(this.axeShop.x, this.axeShop.y - 50, '#ff4400'));
                return;
            }
        }
        // Buy hammer
        if (Math.abs(this.hammerShop.x - player.x) < 60) {
            if (!player.inventory.hasHammer && player.inventory.gold >= 1000) {
                player.inventory.gold -= 1000; player.inventory.hasHammer = true; sfx.playCoin(); return;
            }
        }
        // Sell at sell shop
        if (Math.abs(this.sellShop.x - player.x) < 60) {
            if (player.inventory.wood >= 1) { player.inventory.wood -= 1; player.inventory.gold += 2; sfx.playCoin(); return; }
        }
        // (Refuge worker hire moved to Digit1 logic above)
        // Attack / chop
        // Hammer focuses on charging (handled in Character.update); skip immediate swing
        if (player.weapon === 'hammer' && !forceHammer) return;

        const swingTime = player.weapon === 'sword' ? 0.35 : player.weapon === 'fists' ? 0.3 : 0.5;
        player.actionTimer = swingTime;

        // (Hammer Fireball now handled in Character.update via charging)

        let hit = false;
        for (const tree of this.foregroundTrees) {
            if (!tree.dead && Math.abs(tree.x - player.x) < 80) { tree.hit(); hit = true; break; }
        }
        if (!hit) {
            for (const enemy of this.enemies) {
                if (Math.abs(enemy.x - player.x) < 80) {
                    enemy.takeDamage(player.weaponDmg);
                    hit = true; break;
                }
            }
        }
        if (!hit && !this.enemyCamp.dead && Math.abs(this.enemyCamp.x - player.x) < 150) {
            this.enemyCamp.takeDamage(player.weaponDmg);
            hit = true;
        }
        if (!hit) {
            for (const animal of this.animals) {
                if (!animal.dead && Math.abs(animal.x - player.x) < 80) {
                    animal.takeDamage(player.weaponDmg);
                    hit = true; break;
                }
            }
        }
        if (!hit) sfx.playHit();
    }
    _handleR(player) {
        // Toggle soldier/archer follow
        const allUnits = [...this.soldiers, ...this.archers];
        for (const sol of allUnits) {
            if (Math.abs(sol.x - player.x) < 70) {
                sol.following = !sol.following;
                if (!sol.following) sol.guardX = sol.x;
                sol.dialogue = sol.following ? 'Following, sire!' : 'Holding position!';
                sol.dialogueTimer = 2; sfx.playCoin(); return;
            }
        }
    }
    draw(ctx, cam, player) {
        const w = this.game.canvas.width;
        const h = this.game.canvas.height;

        // ═══ SKY GRADIENT ═══
        const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
        const r = this.moonRed;
        // Lerp sky colors from deep blue to blood red based on moonRed
        const topR = Math.round(5 + r * 40);
        const topG = Math.round(10 + r * -5);
        const topB = Math.round(35 + r * -20);
        const botR = Math.round(28 + r * 60);
        const botG = Math.round(46 + r * -20);
        const botB = Math.round(74 + r * -40);
        skyGrad.addColorStop(0, `rgb(${topR},${topG},${topB})`);
        skyGrad.addColorStop(1, `rgb(${botR},${botG},${botB})`);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, this.groundY);

        // ═══ STARS ═══
        for (const s of this.stars) {
            const sx = (s.x - cam.x * 0.03) % w;
            const twinkle = 0.3 + Math.abs(Math.sin(this.time * 1.5 + s.twinkle)) * 0.7;
            ctx.globalAlpha = twinkle * (1 - r * 0.5);
            ctx.fillStyle = '#fff';
            ctx.fillRect(sx, s.y, s.size, s.size);
        }
        ctx.globalAlpha = 1;
        // ═══ METEORS ═══
        // (Meteor drawing moved to top layer below) 

        // Meteor shower banner
        if (this.meteorShowerActive) {
            ctx.globalAlpha = 0.5 + Math.abs(Math.sin(this.time * 4)) * 0.4;
            ctx.fillStyle = '#ffeeaa'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('☄ Meteor Shower! Catch the golden coin! ☄', w / 2, 38);
            ctx.textAlign = 'left'; ctx.globalAlpha = 1;
        }

        // ═══ MOON ═══
        const moonX = w * 0.8 - cam.x * 0.02;
        const moonY = 80;
        const moonRadius = 40;
        // Glow
        const glowR = Math.round(255 * (1 - r) + 255 * r);
        const glowG = Math.round(255 * (1 - r) + 80 * r);
        const glowB = Math.round(200 * (1 - r) + 30 * r);
        const glow = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.5, moonX, moonY, moonRadius * 3);
        glow.addColorStop(0, `rgba(${glowR},${glowG},${glowB},0.25)`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(moonX, moonY, moonRadius * 3, 0, Math.PI * 2); ctx.fill();
        // Moon body
        const moonBodyR = Math.round(240 * (1 - r) + 220 * r);
        const moonBodyG = Math.round(235 * (1 - r) + 60 * r);
        const moonBodyB = Math.round(200 * (1 - r) + 40 * r);
        ctx.fillStyle = `rgb(${moonBodyR},${moonBodyG},${moonBodyB})`;
        ctx.beginPath(); ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2); ctx.fill();
        // Moon craters
        ctx.fillStyle = `rgba(0,0,0,0.1)`;
        ctx.beginPath(); ctx.arc(moonX - 10, moonY - 8, 8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(moonX + 14, moonY + 5, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(moonX - 5, moonY + 14, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(moonX + 5, moonY - 14, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); // fence

        // ═══ CLOUDS ═══
        ctx.globalAlpha = 0.15 + r * 0.1;
        for (const c of this.clouds) {
            const cx = (c.x - cam.x * 0.05) % (w + 400) - 200;
            const cloudR = Math.round(180 * (1 - r) + 100 * r);
            const cloudG = Math.round(180 * (1 - r) + 40 * r);
            const cloudB = Math.round(200 * (1 - r) + 40 * r);
            ctx.fillStyle = `rgb(${cloudR},${cloudG},${cloudB})`;
            ctx.beginPath(); ctx.arc(cx, c.y, c.w * 0.25, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + c.w * 0.2, c.y - 10, c.w * 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + c.w * 0.45, c.y, c.w * 0.22, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.beginPath(); // fence

        // ═══ DISTANT MOUNTAINS (layer 1 — far) ═══
        ctx.fillStyle = `rgb(${Math.round(15 + r * 20)},${Math.round(25 + r * -5)},${Math.round(45 + r * -15)})`;
        ctx.beginPath(); ctx.moveTo(0, this.groundY);
        for (let i = 0; i < 8; i++) {
            const px = i * 500 - (cam.x * 0.05) % 500;
            ctx.lineTo(px, this.groundY); ctx.lineTo(px + 200, this.groundY - 220); ctx.lineTo(px + 350, this.groundY - 140); ctx.lineTo(px + 500, this.groundY);
        }
        ctx.lineTo(w, this.groundY); ctx.fill();
        ctx.beginPath(); // fence

        // ═══ MOUNTAINS (layer 2 — mid) ═══
        ctx.fillStyle = `rgb(${Math.round(20 + r * 25)},${Math.round(35 + r * -10)},${Math.round(55 + r * -20)})`;
        ctx.beginPath(); ctx.moveTo(0, this.groundY);
        for (let i = 0; i < 12; i++) {
            const px = i * 300 - (cam.x * 0.12) % 300;
            ctx.lineTo(px, this.groundY); ctx.lineTo(px + 150, this.groundY - 160); ctx.lineTo(px + 300, this.groundY);
        }
        ctx.lineTo(w, this.groundY); ctx.fill();
        ctx.beginPath(); // fence

        // ═══ PARALLAX TREES ═══
        this.trees.forEach(t => {
            const fx = 0.3 + t.z * 0.5, sx = t.x - cam.x * fx;
            ctx.fillStyle = '#1a0d00'; ctx.fillRect(sx, this.groundY - t.height, 20, t.height);
            ctx.fillStyle = t.type === 1 ? '#0d2611' : '#143319';
            ctx.beginPath(); ctx.arc(sx + 10, this.groundY - t.height, 40, 0, Math.PI * 2); ctx.fill();
        });
        ctx.beginPath(); // fence

        // ═══ GROUND ═══
        ctx.fillStyle = '#2d4c1e'; ctx.fillRect(0, this.groundY, w, h - this.groundY);
        ctx.fillStyle = '#3e2723'; ctx.fillRect(0, this.groundY + 16, w, 200);
        ctx.fillStyle = '#3a6624';
        const xo = -(cam.x % 40);
        for (let i = 0; i < w / 40 + 2; i++) ctx.fillRect(xo + i * 40, this.groundY, 20, 5);

        // --- Decorations ---
        this.decorations.forEach(d => d.draw(ctx, cam));

        // ═══ ENTITIES ═══
        ctx.beginPath();
        this.foregroundTrees.forEach(t => t.drawStump(ctx, cam));
        ctx.beginPath();
        this.woodBlocks.forEach(b => b.draw(ctx, cam));
        ctx.beginPath();
        this.farms.forEach(f => f.draw(ctx, cam, player));
        this.axeShop.draw(ctx, cam, player);
        this.sellShop.draw(ctx, cam, player);
        this.refugeShop.draw(ctx, cam, player);
        ctx.beginPath();
        this.barracks.forEach(b => b.draw(ctx, cam, player));
        ctx.beginPath();
        this.outpost.draw(ctx, cam);
        ctx.beginPath();
        this.enemyCamp.draw(ctx, cam);
        ctx.beginPath();
        this.foregroundTrees.forEach(t => t.draw(ctx, cam));
        ctx.beginPath();
        this.npcs.forEach(n => n.draw(ctx, cam));
        this.workers.forEach(w => w.draw(ctx, cam));
        this.hunters.forEach(h => h.draw(ctx, cam));
        this.soldiers.forEach(s => s.draw(ctx, cam));
        this.archers.forEach(a => a.draw(ctx, cam));
        this.animals.forEach(an => an.draw(ctx, cam));
        this.enemies.forEach(e => e.draw(ctx, cam));
        this.ladybugs.forEach(l => l.draw(ctx, cam));
        this.birds.forEach(b => b.draw(ctx, cam));
        ctx.beginPath();
        this.arrows.forEach(a => a.draw(ctx, cam));
        this.heroProjectiles.forEach(p => p.draw(ctx, cam));
        this.meteors.forEach(m => m.draw(ctx, cam));
        ctx.beginPath();
        this.groundItems.forEach(i => i.draw(ctx, cam));
        ctx.beginPath();
        this.particles.forEach(p => p.draw(ctx, cam));
        ctx.beginPath();

        // Hold E/R/Y Progress Bars
        if (this.eHoldTimer > 0 || this.rHoldTimer > 0 || this.yHoldTimer > 0) {
            let timer = 0; if (this.eHoldTimer > 0) timer = this.eHoldTimer; else if (this.rHoldTimer > 0) timer = this.rHoldTimer; else timer = this.yHoldTimer;
            const sx = this.sellShop.x - cam.x, sy = this.sellShop.y - 145;
            ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(sx, sy, 18, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(sx, sy, 18, -Math.PI / 2, -Math.PI / 2 + (timer / 2.0) * Math.PI * 2); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SELL ALL', sx, sy + 4); ctx.textAlign = 'left';
        }
    }
}

// ─── GAME ─────────────────────────────────────────────────────────────────────
class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.input = new Input();
        this.lastTime = 0;
        this.state = 'title';   // 'title' | 'playing' | 'gameover'
        this.titleTime = 0;     // for title animations
        this.gameOverTime = 0;
        this.saveTimer = 0;     // auto-save every 8s
        this.hasSave = !!localStorage.getItem('kingdom_save');
        // Button hit-areas (set in draw)
        this._btns = {};
        this.canvas.addEventListener('mousedown', e => this._onClick(e));
        this.resize();
        window.addEventListener('resize', () => this.resize());
        requestAnimationFrame(t => this.loop(t));
    }
    resize() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; }

    // ── Lifecycle ──────────────────────────────────────────────────────────────
    _initGame() {
        this.world = new World(this);
        this.player = new Character(this.world);
        this.camera = new Camera(this);
    }
    _toPlaying() { this.state = 'playing'; this.saveTimer = 0; }
    _toTitle() {
        this.hasSave = !!localStorage.getItem('kingdom_save');
        this.state = 'title'; this.titleTime = 0;
    }
    _toGameOver() { this.state = 'gameover'; this.gameOverTime = 0; }

    _drawPauseMenu(ctx) {
        const W = this.canvas.width, H = this.canvas.height;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('PAUSED', W / 2, H * 0.35);

        const btnW = 240, btnH = 52, btnX = W / 2 - btnW / 2;
        const resumeY = H * 0.5;
        ctx.fillStyle = 'rgba(40,100,60,0.9)';
        ctx.beginPath(); ctx.roundRect(btnX, resumeY, btnW, btnH, 8); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif';
        ctx.fillText('▶ Resume', W / 2, resumeY + 34);
        this._btns.resume = { x: btnX, y: resumeY, w: btnW, h: btnH };

        const saveY = resumeY + 70;
        ctx.fillStyle = 'rgba(160,50,50,0.9)';
        ctx.beginPath(); ctx.roundRect(btnX, saveY, btnW, btnH, 8); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText('💾  Save & Exit', W / 2, saveY + 34);
        this._btns.saveExit = { x: btnX, y: saveY, w: btnW, h: btnH };
        ctx.textAlign = 'left';
    }


    // ── Save / Load ────────────────────────────────────────────────────────────
    _saveGame() {
        const data = {
            v: 1,
            player: this.player.toSave(),
            world: {
                waveNumber: this.world.waveNumber,
                waveTimer: this.world.waveTimer,
                outpostHp: this.world.outpost.hp,
                outpostDead: this.world.outpost.dead,
                outpostLevel: this.world.outpost.level,
                barracks: this.world.barracks.map(b => ({ x: b.x })),
                farms: this.world.farms.map(f => ({ x: f.x, level: f.level, timer: f.timer })),
                soldiers: this.world.soldiers.filter(s => !s.dead).map(s => ({ x: s.x, hp: s.hp, guardX: s.guardX, following: s.following })),
                archers: this.world.archers.filter(a => !a.dead).map(a => ({ x: a.x, hp: a.hp, guardX: a.guardX, following: a.following })),
                workers: this.world.workers.filter(w => !w.dead).map(w => ({ x: w.x, hp: w.hp, carryingLogs: w.carryingLogs })),
                woodBlocks: this.world.woodBlocks.filter(b => !b.dead).map(b => ({ x: b.x, hp: b.hp })),
                enemyCampHp: this.world.enemyCamp.hp,
                enemyCampDead: this.world.enemyCamp.dead
            }
        };
        localStorage.setItem('kingdom_save', JSON.stringify(data));
        this.hasSave = true;
    }
    _loadGame() {
        const raw = localStorage.getItem('kingdom_save');
        if (!raw) return false;
        try {
            const data = JSON.parse(raw);
            this._initGame();
            this.player.applyLoad(data.player);
            const w = this.world, wd = data.world;
            w.waveNumber = wd.waveNumber;
            w.waveTimer = wd.waveTimer;
            w.outpost.hp = wd.outpostHp;
            w.outpost.dead = wd.outpostDead;
            w.outpost.level = wd.outpostLevel || 1;
            // Replace default barrack with saved ones
            w.barracks = wd.barracks.map(b => { const bk = new Barrack(w, b.x); return bk; });
            if (!w.barracks.length) w.barracks = [new Barrack(w, 950)];
            // Farms
            w.farms = (wd.farms || []).map(f => { const fm = new Farm(w, f.x); fm.level = f.level; fm.timer = f.timer; return fm; });
            // Soldiers & Archers
            w.soldiers = (wd.soldiers || []).map(s => { const sol = new Soldier(w, s.x); sol.hp = s.hp; sol.guardX = s.guardX; sol.following = s.following; return sol; });
            w.archers = (wd.archers || []).map(a => { const arc = new Archer(w, a.x); arc.hp = a.hp; arc.guardX = a.guardX; arc.following = a.following; return arc; });
            // Workers
            w.workers = (wd.workers || []).map(work => { const worker = new Worker(w, work.x); worker.hp = work.hp; worker.carryingLogs = work.carryingLogs; return worker; });
            // Wood blocks
            w.woodBlocks = (wd.woodBlocks || []).map(b => { const bl = new WoodBlock(w, b.x); bl.hp = b.hp; return bl; });
            // Enemy Camp
            if (wd.enemyCampHp !== undefined) {
                w.enemyCamp.hp = wd.enemyCampHp;
                w.enemyCamp.dead = wd.enemyCampDead;
            }
            return true;
        } catch (e) { console.error('Load failed', e); return false; }
    }
    _deleteSave() { localStorage.removeItem('kingdom_save'); this.hasSave = false; }

    // ── Input ─────────────────────────────────────────────────────────────────
    _onClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        const hit = (btn) => btn && mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h;
        if (this.state === 'title') {
            if (hit(this._btns.newGame)) {
                sfx.init(); this._initGame(); this._toPlaying();
            } else if (hit(this._btns.continue) && this.hasSave) {
                sfx.init();
                if (this._loadGame()) this._toPlaying();
            }
        } else if (this.state === 'paused') {
            if (hit(this._btns.resume)) { this.state = 'playing'; sfx.playCoin(); }
            else if (hit(this._btns.saveExit)) {
                sfx.playCoin();
                this._saveGame();
                this._toTitle();
            }
        } else if (this.state === 'gameover') {
            if (hit(this._btns.tryAgain)) {
                this._deleteSave(); sfx.init(); this._initGame(); this._toPlaying();
            } else if (hit(this._btns.mainMenu)) {
                this._deleteSave(); this._toTitle();
            }
        }
    }

    // ── Main Loop ─────────────────────────────────────────────────────────────
    loop(ts) {
        if (!this.lastTime) this.lastTime = ts;
        const dt = Math.min((ts - this.lastTime) / 1000, 0.1);
        this.lastTime = ts;
        this.update(dt); this.draw();
        requestAnimationFrame(t => this.loop(t));
    }
    update(dt) {
        if (this.state === 'title') { this.titleTime += dt; return; }
        if (this.state === 'gameover') { this.gameOverTime += dt; return; }
        if (this.input.justPressed('Escape')) {
            if (this.state === 'playing') this.state = 'paused';
            else if (this.state === 'paused') this.state = 'playing';
        }
        if (this.state === 'paused') return;
        // Playing
        this.player.update(dt, this.input);
        this.camera.update(this.player);
        this.world.update(dt, this.input);
        // Game over check
        if (this.player.hp <= 0) { this._toGameOver(); return; }
        // Auto-save every 8 seconds
        this.saveTimer += dt;
        if (this.saveTimer >= 8) { this.saveTimer = 0; this._saveGame(); }
    }
    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.state === 'title') { this._drawTitle(ctx); return; }
        if (this.state === 'gameover') { this._drawGameOver(ctx); return; }
        // Playing
        this.world.draw(ctx, this.camera, this.player);
        this.player.draw(ctx, this.camera);
        this._drawHUD(ctx);
        if (this.state === 'paused') {
            this._drawPauseMenu(ctx);
            return;
        }
        // Autosave indicator (flash on save)
        if (this.saveTimer < 1.0) {
            ctx.globalAlpha = 1 - this.saveTimer;
            ctx.fillStyle = '#0f0'; ctx.font = '11px sans-serif';
            ctx.fillText('💾 Saved', this.canvas.width - 80, 20);
            ctx.globalAlpha = 1;
        }
    }

    // ── Title Screen ──────────────────────────────────────────────────────────
    _drawTitle(ctx) {
        const W = this.canvas.width, H = this.canvas.height;
        const t = this.titleTime;
        // Sky gradient
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#050a1a'); grad.addColorStop(1, '#0e1e3c');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
        // Stars
        for (let i = 0; i < 80; i++) {
            const sx = (i * 137.5) % W, sy = (i * 79.3) % (H * 0.7);
            const twinkle = 0.4 + Math.abs(Math.sin(t * 1.2 + i)) * 0.6;
            ctx.globalAlpha = twinkle; ctx.fillStyle = '#fff';
            ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
        }
        ctx.globalAlpha = 1;
        // Moon
        const mx = W * 0.78, my = H * 0.18;
        const moonGlow = ctx.createRadialGradient(mx, my, 20, mx, my, 100);
        moonGlow.addColorStop(0, 'rgba(240,235,200,0.3)'); moonGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath(); ctx.arc(mx, my, 100, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f0ebb8';
        ctx.beginPath(); ctx.arc(mx, my, 38, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        // Silhouette hills
        ctx.fillStyle = '#0a1525';
        ctx.beginPath(); ctx.moveTo(0, H * 0.72);
        for (let i = 0; i <= 10; i++) ctx.lineTo(i * W / 10, H * 0.72 - Math.sin(i * 0.9 + 0.5) * 80);
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = '#070f1e';
        ctx.beginPath(); ctx.moveTo(0, H * 0.82);
        for (let i = 0; i <= 12; i++) ctx.lineTo(i * W / 12, H * 0.82 - Math.sin(i * 1.3 + 1.0) * 50);
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
        ctx.beginPath();
        // Title text with glow
        const titleY = H * 0.28 + Math.sin(t * 0.8) * 6;
        ctx.shadowColor = '#c8a000'; ctx.shadowBlur = 30;
        ctx.textAlign = 'center';

        // "Pocket" (Smaller - Ruby Red)
        ctx.fillStyle = '#e0115f'; ctx.font = `italic ${Math.round(W * 0.045)}px serif`;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('POCKET', W / 2, titleY - 25);

        // "Kingdom" (Medium-Large - Golden)
        ctx.fillStyle = '#ffd700'; ctx.font = `bold ${Math.round(W * 0.08)}px serif`;
        ctx.textBaseline = 'top';
        ctx.fillText('KINGDOM', W / 2, titleY + 5);

        ctx.shadowBlur = 0;
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#c8c8c8'; ctx.font = `${Math.round(W * 0.022)}px sans-serif`;
        ctx.fillText('Build small, Dream big.', W / 2, titleY + 160);
        ctx.textAlign = 'left';
        // Buttons
        const btnW = 240, btnH = 52, btnX = W / 2 - btnW / 2;
        const topY = H * 0.56;
        const botY = topY + 70;

        let newGameY, continueY;
        if (this.hasSave) {
            continueY = topY;
            newGameY = botY;
        } else {
            newGameY = topY;
            continueY = botY;
        }

        // New Game button
        ctx.fillStyle = 'rgba(200,160,0,0.9)';
        ctx.beginPath(); ctx.roundRect(btnX, newGameY, btnW, btnH, 8); ctx.fill();
        ctx.fillStyle = '#1a0d00'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('⚔  New Game', W / 2, newGameY + 34);
        this._btns.newGame = { x: btnX, y: newGameY, w: btnW, h: btnH };

        // Continue button
        ctx.fillStyle = this.hasSave ? 'rgba(40,100,60,0.9)' : 'rgba(50,50,50,0.5)';
        ctx.beginPath(); ctx.roundRect(btnX, continueY, btnW, btnH, 8); ctx.fill();
        ctx.fillStyle = this.hasSave ? '#8fffb0' : '#666'; ctx.font = 'bold 22px sans-serif';
        ctx.fillText(this.hasSave ? '💾  Continue' : '💾  No Save', W / 2, continueY + 34);
        this._btns.continue = { x: btnX, y: continueY, w: btnW, h: btnH };
        ctx.textAlign = 'left';
        // Subtitle hints
        ctx.fillStyle = 'rgba(150,150,180,0.7)'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Build · Defend · Survive', W / 2, botY + btnH + 30);
        ctx.textAlign = 'left';
    }

    // ── Game Over Screen ──────────────────────────────────────────────────────
    _drawGameOver(ctx) {
        const W = this.canvas.width, H = this.canvas.height;
        const t = this.gameOverTime;
        // Dark red vignette background
        const grad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, Math.max(W, H));
        grad.addColorStop(0, 'rgba(60,0,0,0.85)'); grad.addColorStop(1, 'rgba(0,0,0,0.97)');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
        // Pulsing skull / game over text
        const pulse = 1 + Math.sin(t * 2) * 0.04;
        ctx.save(); ctx.translate(W / 2, H * 0.3); ctx.scale(pulse, pulse);
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 40;
        ctx.fillStyle = '#ff2222'; ctx.font = `bold ${Math.round(W * 0.09)}px serif`;
        ctx.textAlign = 'center'; ctx.fillText('GAME OVER', 0, 0);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff7777'; ctx.font = `${Math.round(W * 0.025)}px sans-serif`;
        ctx.fillText('The kingdom has fallen...', 0, 50);
        const wt = Math.floor(Math.max(0, this.world ? this.world.waveNumber : 0));
        ctx.fillStyle = '#ffaaaa'; ctx.font = `18px sans-serif`;
        ctx.fillText(`Waves survived: ${wt}`, 0, 90);
        ctx.restore();
        ctx.textAlign = 'left';
        // Buttons
        const btnW = 240, btnH = 52, btnX = W / 2 - btnW / 2;
        const tryY = H * 0.60;
        // Try Again
        ctx.fillStyle = 'rgba(160,30,30,0.9)';
        ctx.beginPath(); ctx.roundRect(btnX, tryY, btnW, btnH, 8); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('⚔  Try Again', W / 2, tryY + 34);
        this._btns.tryAgain = { x: btnX, y: tryY, w: btnW, h: btnH };
        // Main Menu
        const menuY = tryY + 70;
        ctx.fillStyle = 'rgba(30,30,60,0.9)';
        ctx.beginPath(); ctx.roundRect(btnX, menuY, btnW, btnH, 8); ctx.fill();
        ctx.fillStyle = '#aaaaff'; ctx.font = 'bold 22px sans-serif';
        ctx.fillText('🏠  Main Menu', W / 2, menuY + 34);
        this._btns.mainMenu = { x: btnX, y: menuY, w: btnW, h: btnH };
        ctx.textAlign = 'left';
    }

    // ── HUD ───────────────────────────────────────────────────────────────────
    _drawHUD(ctx) {
        const p = this.player;
        const pad = 28;

        // ── Stat Panel (top-left) ──
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.beginPath();
        ctx.roundRect(8, 8, 255, 136, 12);
        ctx.fill();

        // HP bar  (row 1)
        ctx.fillStyle = '#aaa'; ctx.font = 'bold 13px sans-serif';
        ctx.fillText('HP', pad, 30);
        ctx.fillStyle = '#400'; ctx.fillRect(pad + 26, 17, 170, 14);
        ctx.fillStyle = p.hp > 50 ? '#22cc44' : p.hp > 25 ? '#f5a623' : '#e00';
        ctx.fillRect(pad + 26, 17, (p.hp / p.maxHp) * 170, 14);
        ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif';
        ctx.fillText(`${Math.ceil(p.hp)}/${p.maxHp}`, pad + 30, 28);

        // Stamina bar  (row 2)
        ctx.fillStyle = '#aaa'; ctx.font = 'bold 13px sans-serif';
        ctx.fillText('SP', pad, 52);
        ctx.fillStyle = '#330'; ctx.fillRect(pad + 26, 39, 170, 14);
        ctx.fillStyle = '#f5e642';
        ctx.fillRect(pad + 26, 39, (p.stamina / p.maxStamina) * 170, 14);

        // Resources  (row 3)
        // Mini gold coin (matches in-game coin style)
        ctx.fillStyle = '#ffd700';
        ctx.beginPath(); ctx.arc(pad + 7, 65, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c8a000';
        ctx.beginPath(); ctx.arc(pad + 7, 65, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd700'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('G', pad + 7, 68); ctx.textAlign = 'left';
        ctx.fillStyle = '#ffd700'; ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`${p.inventory.gold}`, pad + 18, 72);
        ctx.fillStyle = '#8b4513';
        ctx.fillText(`🪵 ${p.inventory.wood}`, pad + 65, 72);
        ctx.fillStyle = '#f5c842';
        ctx.fillText(`🌾 ${p.inventory.wheat}`, pad + 125, 72);
        ctx.fillStyle = '#c8102e';
        ctx.fillText(`🍖 ${p.inventory.meat || 0}`, pad + 185, 72);

        // Weapon + Wave  (row 4)
        const weaponName = p.weapon === 'hammer' ? 'Hammer' : p.weapon === 'sword' ? 'Sword' : p.weapon === 'axe' ? 'Axe' : 'Fists';
        const weaponColor = p.weapon === 'hammer' ? '#ffaa00' : p.weapon === 'sword' ? '#88ccff' : p.weapon === 'axe' ? '#adf' : '#ccc';
        ctx.fillStyle = weaponColor; ctx.font = '12px sans-serif';
        ctx.fillText(`⚔ ${weaponName} (${p.weaponDmg}dmg)`, pad, 90);
        const wt = Math.ceil(Math.max(0, this.world.waveTimer));
        ctx.fillStyle = '#ccc';
        ctx.fillText(`Wave ${this.world.waveNumber + 1} in ${wt}s`, 155, 90);

        // Combat units  (row 5)
        const u = this.world.soldiers.length, a = this.world.archers.length;
        ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
        ctx.fillText(`🗡 Soldiers : ${u}`, pad, 108);
        ctx.fillText(`🏹 Archers : ${a}`, pad + 130, 108);

        // Workers & Hunters  (row 6)
        const wk = this.world.workers.length, hu = this.world.hunters.length;
        ctx.fillText(`🪓 Workers : ${wk}`, pad, 126);
        ctx.fillText(`Hunters : ${hu}`, pad + 148, 126);

        // Hand-drawn throwing spear icon for hunters
        const sx2 = pad + 138, sy2 = 122;
        ctx.save();
        ctx.translate(sx2, sy2);
        ctx.rotate(-Math.PI / 4); // diagonal angle
        // Shaft (wood)
        ctx.strokeStyle = '#c8a060'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(7, 0); ctx.stroke();
        // Tip (metal)
        ctx.fillStyle = '#d0d8e8';
        ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(14, -2.5); ctx.lineTo(7, 5); ctx.closePath(); ctx.fill();
        ctx.restore();

        // Wave warning
        if (this.world.waveTimer < 15 && this.world.waveTimer > 0) {
            ctx.fillStyle = `rgba(255,${Math.floor(60 + Math.sin(this.world.time * 6) * 60)},50,0.9)`;
            ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(`⚠ Enemy wave approaching! ⚠`, this.canvas.width / 2, 40);
            ctx.textAlign = 'left';
        }

        ctx.fillStyle = '#ccc'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'right';
        ctx.fillText(`Pos: ${Math.round(p.x)}, ${Math.round(p.y)}`, this.canvas.width - 20, 30);
        ctx.textAlign = 'left';

        // ── Controls bar (bottom) ──
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, this.canvas.height - 42, this.canvas.width, 42);
        ctx.fillStyle = '#ddd'; ctx.font = '12px sans-serif';
        ctx.fillText(
            'A/D Move | Ctrl Sprint | E Action | R Follow | B Wall(30G) | V Barrack(100G) | F Farm(100G) | U Upgrade | T Town | H Heal',
            12, this.canvas.height - 17
        );
    }
}

window.addEventListener('load', () => { 
    if (document.getElementById('gameCanvas') && document.getElementById('gameCanvas').style.display !== 'none') {
        window.game = new Game('gameCanvas'); 
    }
});
