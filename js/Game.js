import { AssetLoader } from './AssetLoader.js';
import { Input } from './Input.js';
import { Player } from './Player.js';
import { World } from './World.js';
import { Camera } from './Camera.js';

export class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.assets = new AssetLoader();
        this.input = new Input();
        
        this.lastTime = 0;
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    async start() {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '30px "Segoe UI", sans-serif';
        this.ctx.fillText('Loading Kingdom...', 50, 50);

        await this.assets.load({
            playerIdle: '../image/main character idle.png',
            playerRun: '../image/main character run.png',
            mapTiles: '../image/map tiles.png'
        });

        this.world = new World(this);
        this.player = new Player(this);
        this.camera = new Camera(this);

        requestAnimationFrame((t) => this.loop(t));
    }

    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        const dt = Math.min(deltaTime, 0.1); 

        this.update(dt);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        this.player.update(dt, this.input);
        this.camera.update(this.player);
        this.world.update(dt);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.world.draw(this.ctx, this.camera);
        this.player.draw(this.ctx, this.camera);
        
        // UI
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(10, 10, 180, 40);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px monospace';
        this.ctx.fillText(`Gold: 0    Day: 1`, 20, 35);
    }
}
