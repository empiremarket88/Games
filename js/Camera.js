export class Camera {
    constructor(game) {
        this.game = game;
        this.x = 0;
    }
    update(player) {
        // Center camera on player
        const targetX = player.x - this.game.canvas.width / 2 + player.width / 2;
        // Smooth follow
        this.x += (targetX - this.x) * 0.1;
    }
}
