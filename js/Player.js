export class Player {
    constructor(game) {
        this.game = game;
        this.x = 200;
        this.y = 0;
        this.width = 150; // The original sprite is 1024, scale down drastically
        this.height = 150;
        this.vx = 0;
        this.vy = 0;
        this.speed = 250; // pixels per sec
        this.facingRight = true;
        
        this.time = 0;
        this.state = 'idle'; 
        this.stamina = 100;
    }

    update(deltaTime, input) {
        this.time += deltaTime;

        // Gravity
        this.vy += 1200 * deltaTime;
        this.y += this.vy * deltaTime;

        // Ground collision
        if (this.y > this.game.world.groundY - this.height) {
            this.y = this.game.world.groundY - this.height;
            this.vy = 0;
        }

        // Movement
        this.vx = 0;
        this.state = 'idle';
        let isRunning = (input.isDown('ShiftLeft') || input.isDown('ShiftRight')) && this.stamina > 0;
        let currentSpeed = isRunning ? this.speed * 1.8 : this.speed;

        if (isRunning && (input.isDown('KeyA') || input.isDown('ArrowLeft') || input.isDown('KeyD') || input.isDown('ArrowRight'))) {
            this.stamina -= 20 * deltaTime;
        } else if (this.stamina < 100) {
            this.stamina += 10 * deltaTime;
        }

        if (input.isDown('KeyA') || input.isDown('ArrowLeft')) {
            this.vx = -currentSpeed;
            this.facingRight = false;
            this.state = 'run';
        }
        if (input.isDown('KeyD') || input.isDown('ArrowRight')) {
            this.vx = currentSpeed;
            this.facingRight = true;
            this.state = 'run';
        }

        this.x += this.vx * deltaTime;
    }

    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y;

        ctx.save();
        
        // Pick image source
        let img = this.game.assets.get(this.state === 'run' ? 'playerRun' : 'playerIdle');
        
        // Simulating animation body-bobbing
        let bobY = 0;
        if (this.state === 'run') {
            bobY = Math.abs(Math.sin(this.time * 15)) * 8; 
        } else {
            bobY = Math.sin(this.time * 2) * 3; // slow breathing
        }

        // Apply visual transformation
        if (!this.facingRight) {
            ctx.translate(screenX + this.width, screenY - bobY);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, this.width, this.height);
        } else {
            ctx.translate(screenX, screenY - bobY);
            ctx.drawImage(img, 0, 0, this.width, this.height);
        }
        
        ctx.restore();

        // Draw stamina bar underneath
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(screenX + 25, screenY + this.height + 10, 100, 6);
        ctx.fillStyle = '#32cd32';
        ctx.fillRect(screenX + 25, screenY + this.height + 10, this.stamina, 6);
    }
}
