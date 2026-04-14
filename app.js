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

// ─── INPUT ────────────────────────────────────────────────────────────────────
class Input {
    constructor() {
        this.keys = {}; this.pressed = {};
        window.addEventListener('keydown', e => {
            sfx.init();
            if (!this.keys[e.code]) this.pressed[e.code] = true;
            this.keys[e.code] = true;
            e.preventDefault();
        });
        window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    }
    isDown(c) { return !!this.keys[c]; }
    justPressed(c) { if (this.pressed[c]) { this.pressed[c] = false; return true; } return false; }
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
    constructor(x, y, color, vx, vy) {
        this.x = x; this.y = y;
        this.vx = vx !== undefined ? vx : (Math.random() - 0.5) * 200;
        this.vy = vy !== undefined ? vy : -Math.random() * 200 - 80;
        this.life = 1.0; this.color = color;
    }
    update(dt) { this.vy += 500 * dt; this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt * 2; }
    draw(ctx, cam) {
        if (this.life <= 0) return;
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - cam.x, this.y, 6, 6);
        ctx.globalAlpha = 1;
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
        this.world = world; this.x = x; this.y = world.groundY - 40;
        this.w = 36; this.h = 40; this.maxHp = 60; this.hp = 60;
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
        ctx.beginPath(); // clear residual stroke path
        ctx.fillStyle = '#500'; ctx.fillRect(sx, this.y - 7, this.w, 4);
        ctx.fillStyle = '#d4930a'; ctx.fillRect(sx, this.y - 7, (this.hp / this.maxHp) * this.w, 4);
        ctx.restore();
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
            if (this.level === 1) ctx.fillText('Upgrade Farm 150G [U]', sx, sy - 71);
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
            const targets = [this.world.game.player, ...this.world.soldiers, ...this.world.workers, ...this.world.archers, this.world.outpost];
            for (const t of targets) {
                if (!t || t.dead) continue;
                if (Math.abs(t.x - this.x) < 30 && (t === this.world.outpost || Math.abs(t.y - this.y) < 50)) {
                    if (t.takeDamage) t.takeDamage(15);
                    else {
                        t.hp -= 15; sfx.playHit();
                        if (t.hp <= 0) t.dead = true;
                    }
                    this.dead = true; return;
                }
            }
        } else {
            for (const e of this.world.enemies) {
                if (e.dead) continue;
                if (Math.abs(e.x - this.x) < 28 && Math.abs(e.y - this.y) < 45) {
                    e.hp -= this.dmg; sfx.playHit();
                    if (e.hp <= 0) { e.dead = true; e.die(this.world); }
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
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(18, -3); ctx.lineTo(18, 3); ctx.fill();
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
        const targets = [...this.world.farms, ...this.world.barracks, this.world.outpost, this.world.game.player, ...this.world.soldiers, ...this.world.archers, ...this.world.workers];
        for (const t of targets) {
            if (!t || t.dead) continue;
            const dist = Math.abs(t.x - this.x);
            const range = t === this.world.outpost ? 60 : 40;
            if (dist < range && (Math.abs(t.y - this.y) < 60 || t.hp !== undefined)) {
                if (t.takeDamage) t.takeDamage(this.dmg);
                else {
                    t.hp -= this.dmg; sfx.playHit();
                    if (t.hp <= 0 && t !== this.world.outpost) t.dead = true;
                }
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

// ─── ARCHER ───────────────────────────────────────────────────────────────────
class Archer {
    constructor(world, x) {
        this.world = world; this.x = x; this.y = 0;
        this.vx = 0; this.vy = 0;
        this.facingRight = true; this.time = 0;
        this.maxHp = 70; this.hp = 70;
        this.dead = false; this.following = false;
        this.guardX = x; this.shootCd = 0; this.state = 'idle';
        this.shootRange = 320; this.preferDist = 200;
        this.drawingBow = false; this.drawTimer = 0;
        this.dialogue = ''; this.dialogueTimer = 0;
        this.spawnWalkTimer = 1.5;
    }
    update(dt, player) {
        this.time += dt;
        this.vy += 1200 * dt; this.y += this.vy * dt;
        if (this.y > this.world.groundY - 60) { this.y = this.world.groundY - 60; this.vy = 0; }
        if (this.shootCd > 0) this.shootCd -= dt;
        if (this.dialogueTimer > 0) this.dialogueTimer -= dt;

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
        ctx.save();
        const bob = this.state === 'walk' ? Math.abs(Math.sin(this.time * 12)) * 3 : 0;
        ctx.translate(sx, sy - bob);
        if (!this.facingRight) { ctx.translate(30, 0); ctx.scale(-1, 1); }
        const ls = this.state === 'walk' ? Math.sin(this.time * 12) * 7 : 0;
        ctx.fillStyle = '#3a2800'; ctx.fillRect(5 - ls, 40, 8, 20); ctx.fillRect(17 + ls, 40, 8, 20);
        ctx.fillStyle = '#7a5c2e'; ctx.fillRect(0, 15, 30, 30);
        ctx.fillStyle = '#5a3c18'; ctx.fillRect(0, 28, 30, 4);
        ctx.fillStyle = '#5a7c3a'; ctx.fillRect(4, -8, 22, 10); ctx.fillRect(3, -5, 4, 8); ctx.fillRect(23, -5, 4, 8);
        ctx.fillStyle = '#ffccaa'; ctx.fillRect(5, -5, 20, 20);
        ctx.fillStyle = '#6a4820'; ctx.fillRect(-2, 15, 6, 18);
        ctx.save();
        ctx.translate(22, 18);
        if (this.drawingBow) {
            const drawFraction = Math.min(1, this.drawTimer / 1.0);
            ctx.rotate(-0.8 - drawFraction * 0.3);
        }
        ctx.fillStyle = '#6a4820'; ctx.fillRect(-3, 0, 8, 20);
        ctx.fillStyle = '#ffccaa'; ctx.fillRect(-2, 20, 7, 7);
        ctx.strokeStyle = '#5c3010'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(6, 10, 20, -1.2, 1.2); ctx.stroke();
        ctx.beginPath();
        if (this.drawingBow) {
            const pull = Math.min(1, this.drawTimer / 1.0) * 12;
            ctx.strokeStyle = '#e8d8b0'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(22, -10); ctx.lineTo(10 + pull, 10); ctx.lineTo(22, 30); ctx.stroke();
            ctx.beginPath();
            ctx.fillStyle = '#8b4513'; ctx.fillRect(8 + pull, 8, 20, 2);
            ctx.fillStyle = '#bbb'; ctx.fillRect(26 + pull, 7, 5, 4);
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
        this.height = 160 + Math.random() * 40;
        this.y = world.groundY;
        this.health = 3; this.dead = false;
        this.hitAnimation = 0; this.respawnTimer = 0;
    }
    hit() {
        if (this.dead) return;
        this.health -= 1; this.hitAnimation = 0.2; sfx.playChop();
        for (let i = 0; i < 8; i++) this.world.particles.push(new Particle(this.x + 10, this.y - 50, '#8b4513'));
        if (this.health <= 0) {
            this.dead = true; this.respawnTimer = 30;
            // Drop logs on the ground for pickup
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
        ctx.fillStyle = '#1a0d00'; ctx.fillRect(sx, this.y - this.height, 20, this.height);
        ctx.fillStyle = '#32cd32';
        ctx.beginPath(); ctx.moveTo(sx - 40, this.y - this.height * 0.3); ctx.lineTo(sx + 10, this.y - this.height - 50); ctx.lineTo(sx + 60, this.y - this.height * 0.3); ctx.fill();
        ctx.beginPath(); ctx.moveTo(sx - 50, this.y); ctx.lineTo(sx + 10, this.y - this.height * 0.6); ctx.lineTo(sx + 70, this.y); ctx.fill();
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
    constructor(world, x) {
        this.world = world; this.x = x; this.y = 0;
        this.vx = 0; this.vy = 0; this.facingRight = false;
        this.time = 0; this.maxHp = 60; this.hp = 60;
        this.speed = 80; this.dead = false; this.attackCd = 0;
        this.coinDropped = false;
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
        // Check wood blocks
        for (const b of this.world.woodBlocks) {
            if (b.dead) continue;
            if (Math.sign(b.x - this.x) === Math.sign(this.world.outpost.x - this.x)) {
                const d = Math.abs(this.x - b.x);
                if (d < bestDist) { bestDist = d; best = { x: b.x, entity: b, type: 'block' }; }
            }
        }
        // Ultimate target: outpost
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

        const target = this._findTarget();
        if (!target) return;
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
                const t = target.entity;
                if (target.type === 'block') { t.takeDamage(10); }
                else if (target.type === 'player') { t.takeDamage(15); }
                else if (target.type === 'soldier' || target.type === 'worker') { t.hp -= 18; sfx.playHit(); if (t.hp <= 0) t.dead = true; }
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
        ctx.save();
        const bob = Math.abs(Math.sin(this.time * 10)) * 4;
        ctx.translate(sx, sy - bob);
        if (!this.facingRight) { ctx.translate(30, 0); ctx.scale(-1, 1); }
        const ls = this.vx !== 0 ? Math.sin(this.time * 10) * 8 : 0;
        ctx.fillStyle = '#1a0022'; ctx.fillRect(5 - ls, 40, 8, 20); ctx.fillRect(17 + ls, 40, 8, 20);
        ctx.fillStyle = '#2d003d'; ctx.fillRect(0, 15, 30, 30);
        ctx.fillStyle = 'purple'; ctx.fillRect(8, 18, 14, 10);
        ctx.fillStyle = '#2d003d'; ctx.fillRect(24, 15, 6, 18);
        ctx.fillStyle = '#888'; ctx.fillRect(26, 33, 3, 20);
        ctx.fillStyle = '#ccc'; ctx.fillRect(24, 52, 7, 4); ctx.fillRect(26, 56, 3, 8);
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
    constructor(world, x) {
        super(world, x);
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
        ctx.save();
        const bob = Math.abs(Math.sin(this.time * 10)) * 4;
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
    constructor(world, x) {
        super(world, x);
        this.maxHp = 300; this.hp = 300;
        this.speed = 40;
        this.attackCd = 0; this.shootCd = 0;
    }
    _findTargetDragon() {
        let best = null; let bestDist = Infinity;
        const targets = [
            ...this.world.farms, ...this.world.barracks, this.world.outpost,
            this.world.game.player, ...this.world.soldiers, ...this.world.archers
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
        // Land-based: no gravity/flight, stay on ground
        this.y = this.world.groundY - 50; 
        this.vy = 0;
        if (this.attackCd > 0) this.attackCd -= dt;
        if (this.shootCd > 0) this.shootCd -= dt;

        // Ambient Smoke/Bubbles (Cute)
        if (!this.dead && Math.random() < 0.1) {
            const mx = this.x + (this.facingRight ? 80 : -20), my = this.y - 10;
            this.world.particles.push(new Particle(mx, my, '#ffaa00', (Math.random() - 0.5) * 30, -Math.random() * 50));
        }

        const target = this._findTargetDragon() || this._findTarget();
        if (!target) return;
        const dist = Math.abs(this.x - target.x);

        if (dist > 180) {
            const dir = Math.sign(target.x - this.x);
            this.vx = dir * this.speed; this.facingRight = dir > 0;
            this.x += this.vx * dt;
        } else {
            this.vx = 0;
            const dir = Math.sign(target.x - this.x);
            this.facingRight = dir > 0;
            if (this.shootCd <= 0) {
                this.shootCd = 3.0;
                // Shoot fireball from head height
                this.world.arrows.push(new Fireball(this.world, this.x + (this.facingRight ? 60 : -20), this.y - 10, target.x, target.entity.y || this.world.groundY - 30));
                sfx.playHit();
            }
            if (dist < 100 && this.attackCd <= 0) {
                this.attackCd = 2.0;
                const t = target.entity;
                if (t.takeDamage) t.takeDamage(40);
                else { t.hp -= 25; sfx.playHit(); if (t.hp < 0) { t.hp = 0; if (t !== this.world.outpost) t.dead = true; } }
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
        // Subtle waddle bob
        const bob = Math.sin(this.time * 5) * 5;
        const legWalk = Math.sin(this.time * 8);
        ctx.translate(sx, sy + bob);
        if (!this.facingRight) { ctx.translate(100, 0); ctx.scale(-1, 1); }

        const color = '#e63946';
        const dark = '#1d3557';
        const gold = '#ffd700';

        // ═══ LEGS (4 stubby legs) ═══
        ctx.fillStyle = dark;
        // Back legs (drawn behind body)
        ctx.fillRect(10 + legWalk * 10, 30, 15, 25);
        ctx.fillRect(60 - legWalk * 10, 30, 15, 25);
        
        // ═══ TAIL ═══
        const tailWag = Math.sin(this.time * 4) * 15;
        ctx.strokeStyle = color; ctx.lineWidth = 18; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 20); ctx.quadraticCurveTo(-40, 10 + tailWag, -70, 40 + tailWag); ctx.stroke();
        // Spines
        ctx.fillStyle = dark;
        for(let i=1; i<4; i++) {
            ctx.beginPath(); ctx.arc(-15 * i, 20 + i * 5 + tailWag * (i / 4), 6, 0, Math.PI * 2); ctx.fill();
        }

        // ═══ BODY (Chubby) ═══
        const gr = ctx.createLinearGradient(0, 0, 0, 60);
        gr.addColorStop(0, color); gr.addColorStop(1, '#900');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.ellipse(40, 15, 55, 40, 0, 0, Math.PI * 2);
        ctx.fill();
        // Belly (Lighter)
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.ellipse(45, 25, 35, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // ═══ FRONT LEGS ═══
        ctx.fillStyle = dark;
        ctx.fillRect(25 - legWalk * 10, 40, 16, 25);
        ctx.fillRect(75 + legWalk * 10, 40, 16, 25);

        // ═══ HEAD (Chibi) ═══
        ctx.save();
        ctx.translate(85, -5);
        ctx.rotate(Math.sin(this.time * 4) * 0.1); 
        // Neck
        ctx.fillStyle = color;
        ctx.fillRect(-10, 0, 30, 30);
        // Face
        ctx.beginPath();
        ctx.moveTo(0, -10); ctx.lineTo(60, 0); ctx.lineTo(60, 40); ctx.lineTo(0, 45); ctx.closePath();
        ctx.fill();
        // Small Horns
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.moveTo(10, -5); ctx.lineTo(15, -25); ctx.lineTo(25, -5); ctx.fill();
        ctx.beginPath(); ctx.moveTo(25, -2); ctx.lineTo(30, -20); ctx.lineTo(40, -2); ctx.fill();
        // Big Cute Eyes
        const eyeSize = 14;
        const eyeGlow = 0.8 + Math.sin(this.time * 10) * 0.2;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(20, 15, eyeSize, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = gold;
        ctx.globalAlpha = eyeGlow;
        ctx.beginPath(); ctx.arc(20, 15, eyeSize - 3, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(23, 13, 4, 0, Math.PI * 2); ctx.fill(); 
        ctx.restore();

        ctx.restore();
        
        // HP Bar
        const hpY = sy - 80;
        ctx.fillStyle = '#400'; ctx.fillRect(sx - 20, hpY, 140, 10);
        ctx.fillStyle = '#e00'; ctx.fillRect(sx - 20, hpY, (this.hp / this.maxHp) * 140, 10);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(sx - 20, hpY, 140, 10);
    }
}

// ─── SHOP ─────────────────────────────────────────────────────────────────────
class Shop {
    constructor(world, x, type) {
        this.world = world; this.x = x; this.y = world.groundY; this.type = type;
    }
    draw(ctx, cam, player) {
        const sx = this.x - cam.x, dist = Math.abs(this.x - player.x);
        ctx.fillStyle = '#8b4513'; ctx.fillRect(sx - 30, this.y - 60, 60, 60);
        ctx.fillStyle = '#fff'; ctx.fillRect(sx - 40, this.y - 70, 80, 10);
        const shopColor = this.type === 'axe' ? '#ff4444' : '#22aa22';
        ctx.fillStyle = shopColor;
        for (let i = 0; i < 8; i += 2) ctx.fillRect(sx - 40 + i * 10, this.y - 70, 10, 10);

        // Draw shop icon/emblem
        if (this.type === 'axe') {
            // Weapon sign
            ctx.fillStyle = '#ddd'; ctx.fillRect(sx - 5, this.y - 55, 10, 3);
            ctx.fillStyle = '#aaa'; ctx.fillRect(sx - 2, this.y - 52, 4, 20);
            ctx.fillStyle = '#ccc'; ctx.fillRect(sx - 8, this.y - 38, 16, 6);
        } else if (this.type === 'hammer') {
            // Hammer sign
            ctx.fillStyle = '#ff4400'; ctx.beginPath(); ctx.moveTo(sx, this.y - 55); ctx.lineTo(sx - 12, this.y - 40); ctx.lineTo(sx + 12, this.y - 40); ctx.fill();
        } else if (this.type === 'refuge') {
            // Refuge sign
            ctx.fillStyle = '#ffeedd'; ctx.beginPath(); ctx.moveTo(sx, this.y - 55); ctx.lineTo(sx - 12, this.y - 45); ctx.lineTo(sx + 12, this.y - 45); ctx.fill();
            ctx.fillRect(sx - 8, this.y - 45, 16, 12);
            ctx.fillStyle = '#8b4513'; ctx.fillRect(sx - 3, this.y - 40, 6, 7);
        } else {
            // Sell sign
            ctx.fillStyle = '#ffd700'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('$', sx, this.y - 30); ctx.textAlign = 'left';
        }

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
                ctx.fillRect(sx - 100, this.y - 130, 200, 50);
                ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
                const cost = this.world.outpost.level >= 2 ? 5 : 2;
                ctx.fillText(`Hire Worker ${cost} Wheat [E]`, sx, this.y - 116);
                ctx.fillStyle = '#aaa'; ctx.font = '11px sans-serif';
                ctx.fillText('Chops trees automatically', sx, this.y - 100);
                ctx.textAlign = 'left';
            } else {
                ctx.fillRect(sx - 110, this.y - 145, 220, 85);
                ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Sell Wood 2G each', sx, this.y - 128);
                ctx.fillText('Sell Wheat 3G each', sx, this.y - 112);
                ctx.fillStyle = '#f5c842'; ctx.font = 'bold 10px sans-serif';
                ctx.fillText('Press E : 1 Wood  /  Press R : 1 Wheat', sx, this.y - 96);
                ctx.fillText('Hold  E : All Wood /  Hold  R : All Wheat', sx, this.y - 82);
                ctx.textAlign = 'left';
            }
        }
    }
}

// ─── NPC CIVILIAN ─────────────────────────────────────────────────────────────
class NPC {
    constructor(world, x) {
        this.world = world; this.x = x; this.y = 0; this.vx = 0; this.vy = 0;
        this.facingRight = true; this.time = 0; this.state = 'idle';
        this.stateTimer = Math.random() * 2; this.targetX = x;
        this.tunicColor = `hsl(${Math.random() * 60 + 20},50%,40%)`;
        this.dialogue = ''; this.dialogueTimer = 0;
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
        if (this.state === 'walk') { const d = Math.sign(this.targetX - this.x); this.vx = d * 90; this.x += this.vx * dt; if (Math.abs(this.targetX - this.x) < 5) this.state = 'idle'; } else this.vx = 0;
        if (this.dialogueTimer > 0) this.dialogueTimer -= dt;
        else if (Math.random() < 0.003) {
            const lines = ['Long live the king!', 'Need more wood?', 'Build more walls!', 'Stay safe!', 'The army is coming...', 'Lovely night...'];
            this.dialogue = lines[Math.floor(Math.random() * lines.length)];
            this.dialogueTimer = 3;
        }
    }
    draw(ctx, cam) {
        const sx = this.x - cam.x, sy = this.y;
        ctx.save();
        const bob = this.state === 'walk' ? Math.abs(Math.sin(this.time * 12)) * 3 : Math.sin(this.time * 2);
        ctx.translate(sx, sy - bob);
        if (!this.facingRight) { ctx.translate(30, 0); ctx.scale(-1, 1); }
        ctx.fillStyle = '#111'; ctx.fillRect(8, 15, 6, 15);
        ctx.fillStyle = '#222'; ctx.fillRect(5, 40, 8, 20); ctx.fillRect(17, 40, 8, 20);
        ctx.fillStyle = this.tunicColor; ctx.fillRect(0, 15, 30, 30);
        ctx.fillStyle = this.tunicColor; ctx.fillRect(12, 15, 8, 18);
        ctx.fillStyle = '#ffccaa'; ctx.fillRect(12, 33, 6, 5);
        ctx.fillStyle = '#ffccaa'; ctx.fillRect(5, -5, 20, 20);
        ctx.restore();
        if (this.dialogueTimer > 0) {
            ctx.fillStyle = 'white'; ctx.fillRect(sx - 15, sy - 52, 120, 18);
            ctx.fillStyle = '#333'; ctx.font = '11px sans-serif';
            ctx.fillText(this.dialogue, sx - 10, sy - 38);
        }
    }
}

// ─── WORKER ───────────────────────────────────────────────────────────────────
class Worker {
    constructor(world, x) {
        this.world = world; this.x = x; this.y = 0; this.vx = 0; this.vy = 0;
        this.facingRight = true; this.time = 0; this.state = 'idle';
        this.targetTree = null; this.chopTimer = 0; this.carryingLogs = 0;
        this.maxHp = 40; this.hp = 40; this.dead = false;
        this.tunicColor = '#b57b45';
        this.dialogueTimer = 0; this.dialogue = '';
    }
    update(dt) {
        if (this.dead) return;
        this.time += dt;
        this.vy += 1200 * dt; this.y += this.vy * dt;
        if (this.y > this.world.groundY - 60) { this.y = this.world.groundY - 60; this.vy = 0; }

        if (this.dialogueTimer > 0) this.dialogueTimer -= dt;

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
                this.vx = dir * 100; this.facingRight = dir > 0;
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
                this.vx = dir * 100; this.facingRight = dir > 0;
            }
        }
        this.x += this.vx * dt;
    }
    draw(ctx, cam) {
        if (this.dead) return;
        const sx = this.x - cam.x, sy = this.y;
        ctx.save();
        const isWalk = this.state === 'walk_to_tree' || this.state === 'return_with_logs';
        const bob = isWalk ? Math.abs(Math.sin(this.time * 12)) * 3 : Math.sin(this.time * 2);
        ctx.translate(sx, sy - bob);
        if (!this.facingRight) { ctx.translate(30, 0); ctx.scale(-1, 1); }

        ctx.fillStyle = '#111'; ctx.fillRect(8, 15, 6, 15);
        ctx.fillStyle = '#222'; ctx.fillRect(5, 40, 8, 20); ctx.fillRect(17, 40, 8, 20);
        ctx.fillStyle = this.tunicColor; ctx.fillRect(0, 15, 30, 30);
        ctx.fillStyle = '#8b4513'; ctx.fillRect(12, 15, 8, 18);
        ctx.fillStyle = '#ffccaa'; ctx.fillRect(12, 33, 6, 5);
        ctx.fillStyle = '#ffccaa'; ctx.fillRect(5, -5, 20, 20);

        if (this.state === 'chopping') {
            ctx.translate(20, 15);
            ctx.rotate(Math.sin(this.time * 10) * 0.8);
            ctx.fillStyle = '#b78'; ctx.fillRect(0, -5, 4, 20);
            ctx.fillStyle = '#888'; ctx.fillRect(-2, -5, 10, 8);
        } else if (this.carryingLogs > 0) {
            ctx.fillStyle = '#6b3a1f'; ctx.fillRect(15, 5, 20, 10);
            ctx.fillStyle = '#8b4513'; ctx.fillRect(16, 6, 18, 8);
        }
        ctx.restore();

        // HP bar
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

// ─── SOLDIER ──────────────────────────────────────────────────────────────────
class Soldier {
    constructor(world, x) {
        this.world = world; this.x = x; this.y = 0; this.vx = 0; this.vy = 0;
        this.facingRight = true; this.time = 0;
        this.maxHp = 100; this.hp = 100;
        this.dead = false; this.following = false;
        this.guardX = x; this.attackCd = 0; this.state = 'idle';
        this.dialogue = ''; this.dialogueTimer = 0;
        this.spawnWalkTimer = 1.5;
    }
    update(dt, player) {
        this.time += dt;
        this.vy += 1200 * dt; this.y += this.vy * dt;
        if (this.y > this.world.groundY - 60) { this.y = this.world.groundY - 60; this.vy = 0; }
        if (this.attackCd > 0) this.attackCd -= dt;
        if (this.dialogueTimer > 0) this.dialogueTimer -= dt;

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
            const dir = Math.sign(nearestEnemy.x - this.x);
            this.vx = dir * 150; this.facingRight = dir > 0; this.state = 'walk';
            if (nearestDist < 65 && this.attackCd <= 0) {
                this.attackCd = 1.0; nearestEnemy.hp -= 22; sfx.playHit();
                if (nearestEnemy.hp <= 0) {
                    nearestEnemy.dead = true; nearestEnemy.die(this.world);
                }
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
        ctx.save();
        const bob = this.state === 'walk' ? Math.abs(Math.sin(this.time * 12)) * 3 : Math.sin(this.time * 2);
        ctx.translate(sx, sy - bob);
        if (!this.facingRight) { ctx.translate(30, 0); ctx.scale(-1, 1); }
        const ls = this.state === 'walk' ? Math.sin(this.time * 12) * 8 : 0;
        ctx.fillStyle = '#2c1810'; ctx.fillRect(5 - ls, 40, 8, 20); ctx.fillRect(17 + ls, 40, 8, 20);
        ctx.fillStyle = '#2e5b1e'; ctx.fillRect(0, 15, 30, 30);
        ctx.fillStyle = 'gold'; ctx.fillRect(11, 20, 8, 8);
        ctx.fillStyle = '#1e3d14'; ctx.fillRect(2, 18, 6, 18);
        ctx.fillStyle = '#1e3d14'; ctx.fillRect(22, 18, 6, 18);
        ctx.fillStyle = '#ffccaa'; ctx.fillRect(22, 36, 6, 5);
        ctx.fillStyle = '#bbb'; ctx.fillRect(25, 41, 3, 22);
        ctx.fillStyle = '#c8a000'; ctx.fillRect(21, 39, 10, 3);
        ctx.fillStyle = '#ffccaa'; ctx.fillRect(5, -5, 20, 20);
        ctx.fillStyle = '#1a3a10'; ctx.fillRect(4, -8, 22, 10); ctx.fillRect(3, -5, 4, 8); ctx.fillRect(23, -5, 4, 8);
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
        this.inventory = { gold: 30, wood: 0, hasAxe: false, hasSword: false, wheat: 0, hasHammer: false };
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
        this.invincibleTimer = 1.2; this.hurtTimer = 0.3;
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
        // Pick up ground items
        for (const item of this.world.groundItems) {
            if (item.picked) continue;
            if (Math.abs(item.x - this.x) < 40 && Math.abs(item.y - this.y) < 50) {
                item.picked = true; sfx.playPickup();
                if (item.type === 'wheat') this.inventory.wheat += 1;
                else if (item.type === 'log') this.inventory.wood += 1;
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
        if (wp === 'sword') return -1.5 + progress * 3.0; // horizontal slash
        return -2.0 + progress * 3.0; // axe overhead chop
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
        ctx.save();
        // Hurt flash
        if (this.hurtTimer > 0) ctx.globalAlpha = 0.5 + Math.sin(this.time * 40) * 0.5;
        const bspd = this.state === 'run' ? 20 : (this.state === 'walk' ? 12 : 2);
        const bamt = this.state === 'run' ? 6 : (this.state === 'walk' ? 3 : 1);
        const bob = Math.abs(Math.sin(this.time * bspd)) * bamt;
        ctx.translate(sx, sy - bob);
        if (!this.facingRight) { ctx.translate(30, 0); ctx.scale(-1, 1); }

        // Cape
        ctx.fillStyle = '#c8102e'; ctx.beginPath(); ctx.moveTo(10, 15);
        const fl = Math.sin(this.time * 15) * (this.state === 'run' ? 15 : (this.state === 'walk' ? 8 : 4));
        ctx.lineTo(-22 - fl, 56); ctx.lineTo(-6 - fl, 60); ctx.lineTo(20, 15); ctx.fill();
        // Legs
        const lg = this.state !== 'idle' && this.state !== 'action' ? Math.sin(this.time * 12) * 8 : (this.state === 'action' ? 5 : 0);
        ctx.fillStyle = '#111'; ctx.fillRect(5 - lg, 40, 8, 20); ctx.fillRect(17 + lg, 40, 8, 20);
        // Body
        ctx.fillStyle = '#2a5298'; ctx.fillRect(0, 15, 30, 30);
        ctx.fillStyle = '#3e2723'; ctx.fillRect(-2, 35, 34, 5);
        ctx.fillStyle = 'gold'; ctx.fillRect(10, 34, 7, 7);
        // Back arm
        ctx.fillStyle = '#1a3070'; ctx.fillRect(-2, 15, 6, 18);

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
            ctx.fillStyle = '#ffccaa'; ctx.fillRect(-2, 20, 7, 7); // hand
            if (this.weapon === 'sword') {
                ctx.fillStyle = '#ccd8e0'; ctx.fillRect(0, 22, 5, 34);
                ctx.fillStyle = '#e8f0ff'; ctx.fillRect(1, 22, 2, 34);
                ctx.beginPath(); ctx.moveTo(0, 56); ctx.lineTo(2, 62); ctx.lineTo(5, 56); ctx.fill();
                ctx.fillStyle = '#c8a000'; ctx.fillRect(-5, 20, 15, 4);
                ctx.fillStyle = '#8b0000'; ctx.fillRect(0, 18, 5, 3);
            } else if (this.weapon === 'axe') {
                ctx.fillStyle = '#654321'; ctx.fillRect(0, 22, 4, 28);
                ctx.fillStyle = '#bbb'; ctx.fillRect(4, 44, 16, 12);
                ctx.fillStyle = '#999'; ctx.fillRect(-8, 44, 8, 12);
                ctx.fillStyle = '#ddd';
                ctx.beginPath(); ctx.moveTo(4, 44); ctx.lineTo(20, 50); ctx.lineTo(4, 56); ctx.fill();
            } else if (this.weapon === 'hammer') {
                ctx.fillStyle = '#3a2010'; ctx.fillRect(0, 22, 5, 40);
                ctx.fillStyle = '#222'; ctx.fillRect(-15, 55, 35, 20);
                ctx.fillStyle = '#ff4400'; ctx.fillRect(-15, 55, 35, 4);
                ctx.fillStyle = '#ffaa00'; ctx.fillRect(-10, 55, 25, 2);
                if (Math.random() < 0.2) this.world.particles.push(new Particle(this.x + (this.facingRight ? 40 : -40), this.y, '#ff4400'));
            }
        } else {
            // PUNCH animation — arm thrusts forward horizontally
            const extendY = -punch * 18; // arm lifts and extends
            const extendX = punch * 22;  // punches out horizontally
            ctx.fillStyle = '#1e3c72';
            ctx.fillRect(-3 + extendX * 0.3, 0 + extendY * 0.3, 8, 20);
            // Fist (closed hand, bigger when punching)
            const fistSize = 7 + punch * 4;
            ctx.fillStyle = '#ffccaa';
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
        ctx.fillStyle = '#ffccaa'; ctx.fillRect(5, -5, 20, 20);
        ctx.fillStyle = '#ffbc00';
        ctx.beginPath(); ctx.moveTo(4, -5); ctx.lineTo(4, -16); ctx.lineTo(10, -10); ctx.lineTo(15, -17); ctx.lineTo(20, -10); ctx.lineTo(26, -16); ctx.lineTo(26, -5); ctx.fill();
        ctx.fillStyle = 'red'; ctx.fillRect(13, -13, 4, 4);
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
            // ── OUTPOST ──
            ctx.fillStyle = '#f5deb3'; ctx.beginPath(); ctx.moveTo(sx, sy - 120); ctx.lineTo(sx - 80, sy); ctx.lineTo(sx + 80, sy); ctx.fill();
            ctx.fillStyle = '#222'; ctx.beginPath(); ctx.moveTo(sx, sy - 60); ctx.lineTo(sx - 30, sy); ctx.lineTo(sx + 30, sy); ctx.fill();
            ctx.fillStyle = '#5c4033'; ctx.fillRect(sx - 3, sy - 160, 6, 160);
            const fl = Math.sin(this.time * 5) * 10;
            ctx.fillStyle = '#c8102e'; ctx.beginPath(); ctx.moveTo(sx, sy - 160); ctx.lineTo(sx + 40 + fl, sy - 155); ctx.lineTo(sx + 40 + fl, sy - 140); ctx.lineTo(sx, sy - 145); ctx.fill();
            ctx.beginPath();
            // Upgrade hint
            const player = this.world.game.player;
            if (Math.abs(this.x - player.x) < 120) {
                ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(sx - 110, sy - 185, 220, 22);
                ctx.fillStyle = '#ffd700'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Upgrade to Town 500G [T]', sx, sy - 169); ctx.textAlign = 'left';
            }
        }
        // HP bar
        ctx.fillStyle = '#500'; ctx.fillRect(sx - 52, sy - 144, 104, 10);
        ctx.fillStyle = 'lime'; ctx.fillRect(sx - 52, sy - 144, (this.hp / 100) * 104, 10);
        ctx.fillStyle = '#0f0'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${this.level >= 2 ? 'Town' : 'Outpost'} ${Math.ceil(this.hp)}/100`, sx, sy - 147); ctx.textAlign = 'left';
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
        ctx.fillStyle = '#666'; ctx.fillRect(sx - 55, sy - 80, 110, 80);
        ctx.fillStyle = '#555';
        for (let i = -55; i < 60; i += 20) ctx.fillRect(sx + i, sy - 100, 14, 22);
        ctx.fillStyle = '#3e2000'; ctx.fillRect(sx - 15, sy - 50, 30, 50);
        ctx.fillStyle = '#a0500a'; ctx.beginPath(); ctx.arc(sx, sy - 50, 15, Math.PI, 0); ctx.fill();
        ctx.fillStyle = isTown ? '#ffd700' : '#c8a000'; ctx.fillRect(sx - 35, sy - 98, 70, 15);
        ctx.fillStyle = '#000'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(isTown ? 'BARRACKS★' : 'BARRACKS', sx, sy - 87); ctx.textAlign = 'left';
        ctx.fillStyle = '#2e5b1e'; ctx.fillRect(sx + 55, sy - 130, 4, 55);
        const fl = Math.sin(this.time * 4) * 8;
        ctx.beginPath(); ctx.moveTo(sx + 59, sy - 130); ctx.lineTo(sx + 85 + fl, sy - 125); ctx.lineTo(sx + 85 + fl, sy - 110); ctx.lineTo(sx + 59, sy - 115); ctx.fill();
        ctx.beginPath();
        // Hire menu
        if (Math.abs(this.x - player.x) < 80) {
            if (isTown) {
                // Show 2-option menu
                ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(sx - 110, sy - 158, 220, 52);
                ctx.fillStyle = '#0f0'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('[1] Soldier 30G  [2] Archer 50G', sx, sy - 138);
                ctx.fillStyle = '#aaa'; ctx.font = '11px sans-serif';
                ctx.fillText('[E] to open menu', sx, sy - 118);
                ctx.textAlign = 'left';
            } else {
                ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(sx - 75, sy - 142, 150, 20);
                ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Hire Soldier 30G [E]', sx, sy - 128);
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

// ─── WORLD ────────────────────────────────────────────────────────────────────
class World {
    constructor(game) {
        this.game = game;
        this.groundY = game.canvas.height - 150;
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
        // Right-side trees: original dense forest east of outpost
        for (let i = 0; i < 8; i++) this.foregroundTrees.push(new ForegroundTree(this, 1400 + i * (180 + Math.random() * 120)));
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
        this.refugeShop = new Shop(this, 1300, 'refuge');
        this.hammerShop = new Shop(this, 1600, 'hammer');
        this.outpost = new Outpost(this, 1150);
        this.barracks = [new Barrack(this, 950)];
        this.farms = [];
        this.soldiers = [];
        this.archers = [];
        this.arrows = [];
        this.woodBlocks = [];
        this.enemies = [];
        this.groundItems = [];
        this.particles = [];
        this.npcs = [];
        this.workers = [];
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
    }
    update(dt, input) {
        this.time += dt;
        this.groundY = this.game.canvas.height - 150;
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
        if (input.justPressed('KeyV')) this._buildBarrack(player);
        if (input.justPressed('KeyF')) this._buildFarm(player);
        if (input.justPressed('KeyU')) this._upgradeFarm(player);
        if (input.justPressed('KeyH')) this._healSoldier(player);
        if (input.justPressed('KeyT')) this._upgradeTown(player);
        // Hire menu selection (1 = soldier, 2 = archer)
        if (this.hiringBarrack && input.justPressed('Digit1')) this._hireFromMenu(player, 'soldier');
        if (this.hiringBarrack && input.justPressed('Digit2')) this._hireFromMenu(player, 'archer');
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
        this.farms.forEach(f => f.update(dt));
        this.farms = this.farms.filter(f => !f.dead);
        this.foregroundTrees.forEach(t => t.update(dt));
        this.woodBlocks.forEach(b => b.update(dt));
        this.woodBlocks = this.woodBlocks.filter(b => !b.dead);
        this.npcs.forEach(n => n.update(dt));
        this.workers.forEach(w => w.update(dt));
        this.workers = this.workers.filter(w => !w.dead);
        this.soldiers.forEach(s => s.update(dt, player));
        this.soldiers = this.soldiers.filter(s => !s.dead);
        this.archers.forEach(a => a.update(dt, player));
        this.archers = this.archers.filter(a => !a.dead);
        this.arrows.forEach(a => a.update(dt));
        this.arrows = this.arrows.filter(a => !a.dead);
        this.enemies.forEach(e => e.update(dt));
        this.enemies.filter(e => e.dead && !e.coinDropped).forEach(e => e.die(this));
        this.enemies = this.enemies.filter(e => !e.dead);
        // Clear hiring menu if player walks away
        if (this.hiringBarrack && Math.abs(this.hiringBarrack.x - player.x) > 100) this.hiringBarrack = null;
        this.groundItems.forEach(i => i.update(dt));
        this.groundItems = this.groundItems.filter(i => !i.picked);
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => p.life > 0);
    }
    _buildWoodBlock(p) {
        if (p.inventory.gold < 30) return;
        const bx = p.x + (p.facingRight ? 55 : -55);
        this.woodBlocks.push(new WoodBlock(this, bx));
        p.inventory.gold -= 30; sfx.playBuild();
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
        if (nearest && p.inventory.gold >= 150) {
            p.inventory.gold -= 150; nearest.level = 2; sfx.playRepair();
        }
    }
    _healSoldier(p) {
        if (p.inventory.wheat <= 0) return;
        const targets = [...this.soldiers, ...this.archers, ...this.workers];
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
        if (p.inventory.gold < 500) return;
        p.inventory.gold -= 500;
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
            sol.guardX = b.x; this.soldiers.push(sol); sfx.playHire();
        } else if (type === 'archer') {
            if (this.outpost.level < 2 || p.inventory.gold < 50) return;
            p.inventory.gold -= 50;
            const arc = new Archer(this, b.x + (Math.random() - 0.5) * 40);
            arc.guardX = b.x; this.archers.push(arc); sfx.playHire();
        }
        this.hiringBarrack = null;
    }
    _spawnWave() {
        this.waveNumber++;
        const count = 4 + this.waveNumber * 2;
        for (let i = 0; i < count; i++) {
            if (this.waveNumber >= 6 && Math.random() < 0.3) {
                this.enemies.push(new EnemyArcher(this, 4000 + Math.random() * 500 + i * 120));
            } else {
                this.enemies.push(new Enemy(this, 4000 + Math.random() * 500 + i * 120));
            }
        }
        if (this.waveNumber >= 1) {
            this.enemies.push(new EnemyDragon(this, 4500 + Math.random() * 500));
        }
    }
    _handleE(player) {
        // Repair outpost
        if (this.outpost.dead && Math.abs(this.outpost.x - player.x) < 120 && player.inventory.gold >= 100) {
            player.inventory.gold -= 100; this.outpost.hp = 100; sfx.playRepair(); return;
        }
        // Open/close barracks hire menu
        for (const barrack of this.barracks) {
            if (Math.abs(barrack.x - player.x) < 80) {
                if (this.outpost.level >= 2) {
                    // Toggle menu — player presses 1 or 2 to hire
                    this.hiringBarrack = this.hiringBarrack === barrack ? null : barrack;
                    sfx.playCoin(); return;
                } else {
                    // Old behaviour: directly hire soldier
                    if (player.inventory.gold >= barrack.hireCost) {
                        player.inventory.gold -= barrack.hireCost;
                        const sol = new Soldier(this, barrack.x + (Math.random() - 0.5) * 60);
                        sol.guardX = barrack.x; this.soldiers.push(sol); sfx.playHire(); return;
                    }
                }
            }
        }
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
        // Hire worker at Refuge shop
        if (Math.abs(this.refugeShop.x - player.x) < 60) {
            const cost = this.outpost.level >= 2 ? 5 : 2;
            if (player.inventory.wheat >= cost) {
                player.inventory.wheat -= cost;
                this.workers.push(new Worker(this, this.refugeShop.x));
                sfx.playHire(); return;
            }
        }
        // Attack / chop
        const swingTime = player.weapon === 'sword' ? 0.35 : player.weapon === 'fists' ? 0.3 : 0.5;
        player.actionTimer = swingTime;
        let hit = false;
        for (const tree of this.foregroundTrees) {
            if (!tree.dead && Math.abs(tree.x - player.x) < 80) { tree.hit(); hit = true; break; }
        }
        if (!hit) {
            for (const enemy of this.enemies) {
                if (Math.abs(enemy.x - player.x) < 80) {
                    enemy.hp -= player.weaponDmg; sfx.playHit();
                    if (enemy.hp <= 0) { enemy.dead = true; enemy.die(this); }
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
        this.foregroundTrees.forEach(t => t.draw(ctx, cam));
        ctx.beginPath();
        this.npcs.forEach(n => n.draw(ctx, cam));
        this.workers.forEach(w => w.draw(ctx, cam));
        this.soldiers.forEach(s => s.draw(ctx, cam));
        this.archers.forEach(a => a.draw(ctx, cam));
        this.enemies.forEach(e => e.draw(ctx, cam));
        ctx.beginPath();
        this.arrows.forEach(a => a.draw(ctx, cam));
        this.meteors.forEach(m => m.draw(ctx, cam));
        ctx.beginPath();
        this.groundItems.forEach(i => i.draw(ctx, cam));
        ctx.beginPath();
        this.particles.forEach(p => p.draw(ctx, cam));
        ctx.beginPath();

        // Hold E/R Progress Bars
        if (this.eHoldTimer > 0 || this.rHoldTimer > 0) {
            const timer = this.eHoldTimer > 0 ? this.eHoldTimer : this.rHoldTimer;
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
        this.canvas.addEventListener('click', e => this._onClick(e));
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
    _toGameOver() { this.state = 'gameover'; this.gameOverTime = 0; }

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
                woodBlocks: this.world.woodBlocks.filter(b => !b.dead).map(b => ({ x: b.x, hp: b.hp }))
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
            return true;
        } catch (e) { console.error('Load failed', e); return false; }
    }
    _deleteSave() { localStorage.removeItem('kingdom_save'); this.hasSave = false; }

    // ── Input ─────────────────────────────────────────────────────────────────
    _onClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
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
        ctx.fillStyle = '#ffd700'; ctx.font = `bold ${Math.round(W * 0.085)}px serif`;
        ctx.textAlign = 'center'; ctx.fillText('KINGDOM', W / 2, titleY);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#c8c8c8'; ctx.font = `${Math.round(W * 0.025)}px sans-serif`;
        ctx.fillText('A Kingdom Demake', W / 2, titleY + 48);
        ctx.textAlign = 'left';
        // Buttons
        const btnW = 240, btnH = 52, btnX = W / 2 - btnW / 2;
        const newY = H * 0.56;
        // New Game button
        const ngHover = false;
        ctx.fillStyle = 'rgba(200,160,0,0.9)';
        ctx.beginPath(); ctx.roundRect(btnX, newY, btnW, btnH, 8); ctx.fill();
        ctx.fillStyle = '#1a0d00'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('⚔  New Game', W / 2, newY + 34);
        this._btns.newGame = { x: btnX, y: newY, w: btnW, h: btnH };
        // Continue button
        const contY = newY + 70;
        ctx.fillStyle = this.hasSave ? 'rgba(40,100,60,0.9)' : 'rgba(50,50,50,0.5)';
        ctx.beginPath(); ctx.roundRect(btnX, contY, btnW, btnH, 8); ctx.fill();
        ctx.fillStyle = this.hasSave ? '#8fffb0' : '#666'; ctx.font = 'bold 22px sans-serif';
        ctx.fillText(this.hasSave ? '💾  Continue' : '💾  No Save', W / 2, contY + 34);
        this._btns.continue = { x: btnX, y: contY, w: btnW, h: btnH };
        ctx.textAlign = 'left';
        // Subtitle hints
        ctx.fillStyle = 'rgba(150,150,180,0.7)'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Build · Defend · Survive', W / 2, contY + btnH + 30);
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
        const pad = 14;

        // ── Stat Panel (top-left) ──
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(8, 8, 260, 110);

        // HP bar
        ctx.fillStyle = '#aaa'; ctx.font = 'bold 13px sans-serif';
        ctx.fillText('HP', pad, 30);
        ctx.fillStyle = '#400'; ctx.fillRect(40, 17, 170, 14);
        ctx.fillStyle = p.hp > 50 ? '#22cc44' : p.hp > 25 ? '#f5a623' : '#e00';
        ctx.fillRect(40, 17, (p.hp / p.maxHp) * 170, 14);
        ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif';
        ctx.fillText(`${Math.ceil(p.hp)}/${p.maxHp}`, 44, 28);

        // Stamina bar
        ctx.fillStyle = '#aaa'; ctx.font = 'bold 13px sans-serif';
        ctx.fillText('SP', pad, 52);
        ctx.fillStyle = '#330'; ctx.fillRect(40, 39, 170, 14);
        ctx.fillStyle = '#f5e642';
        ctx.fillRect(40, 39, (p.stamina / p.maxStamina) * 170, 14);

        // Gold / Wood / Wheat
        ctx.fillStyle = '#ffd700'; ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`⬡ ${p.inventory.gold}`, pad, 74);
        ctx.fillStyle = '#8b4513';
        ctx.fillText(`🪵 ${p.inventory.wood}`, 75, 74);
        ctx.fillStyle = '#f5c842';
        ctx.fillText(`🌾 ${p.inventory.wheat}`, 135, 74);

        // Equipped weapon + Wave timer
        const weaponName = p.weapon === 'hammer' ? 'Hammer' : p.weapon === 'sword' ? 'Sword' : p.weapon === 'axe' ? 'Axe' : 'Fists';
        const weaponColor = p.weapon === 'hammer' ? '#ffaa00' : p.weapon === 'sword' ? '#88ccff' : p.weapon === 'axe' ? '#adf' : '#ccc';
        ctx.fillStyle = weaponColor; ctx.font = '12px sans-serif';
        ctx.fillText(`⚔ ${weaponName} (${p.weaponDmg}dmg)`, pad, 95);

        const wt = Math.ceil(Math.max(0, this.world.waveTimer));
        ctx.fillText(`Wave ${this.world.waveNumber + 1} in ${wt}s`, pad, 110);
        ctx.fillStyle = '#ccc';
        const u = this.world.soldiers.length, a = this.world.archers.length;
        ctx.fillText(`Units: ${u + a} (Sol:${u} Arc:${a})`, 140, 110);

        // Wave warning
        if (this.world.waveTimer < 15 && this.world.waveTimer > 0) {
            ctx.fillStyle = `rgba(255,${Math.floor(60 + Math.sin(this.world.time * 6) * 60)},50,0.9)`;
            ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(`⚠ Enemy wave approaching! ⚠`, this.canvas.width / 2, 40);
            ctx.textAlign = 'left';
        }

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

window.addEventListener('load', () => { new Game('gameCanvas'); });
