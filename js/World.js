export class World {
    constructor(game) {
        this.game = game;
        this.groundY = this.game.canvas.height - 150;
        this.mapTilesImage = this.game.assets.get('mapTiles');
        this.tileSize = 64; 
    }
    update(deltaTime) {
        // Adjust ground level dynamically if resize occurs
        this.groundY = this.game.canvas.height - 150;
    }
    draw(ctx, camera) {
        // Draw the moon/sun
        ctx.fillStyle = '#ffffe0';
        ctx.beginPath();
        // Moon parallax (very slow)
        ctx.arc(this.game.canvas.width / 2 - camera.x * 0.05, 150, 40, 0, Math.PI * 2);
        ctx.fill();

        // Let's create a scrolling ground parallax
        const startX = Math.floor(camera.x / this.tileSize) * this.tileSize;
        const endX = startX + this.game.canvas.width + this.tileSize;
        
        for (let x = startX; x < endX; x += this.tileSize) {
            // Parallax offset
            const screenX = x - camera.x;
            
            // Draw ground tile using a generic soil-looking chunk from the atlas
            // The atlas is a big mesh of chunks, coordinate (128, 512) has some grassy dirt
            ctx.drawImage(
                this.mapTilesImage,
                128, 512, 128, 128,          // Source rect from sprite (guessing some grass)
                screenX, this.groundY, this.tileSize + 1, this.game.canvas.height - this.groundY // +1 prevents seams
            );
            
            // Add a stylistic tint over it
            ctx.fillStyle = 'rgba(20, 40, 20, 0.3)'; 
            ctx.fillRect(screenX, this.groundY, this.tileSize + 1, this.game.canvas.height - this.groundY);
        }

        // Draw parallax background trees
        const treeSpacing = 250;
        const startTreeX = Math.floor(camera.x / treeSpacing) * treeSpacing;
        for (let x = startTreeX - treeSpacing; x < startTreeX + this.game.canvas.width + treeSpacing; x += treeSpacing) {
            const screenX = x - (camera.x * 0.4); // 0.4 parallax (distant)
            
            ctx.fillStyle = '#0a141a'; // Very dark distant silhoutte
            const treeHeight = 250;
            const treeWidth = 30;
            ctx.fillRect(screenX, this.groundY - treeHeight, treeWidth, treeHeight);
            
            ctx.beginPath();
            ctx.moveTo(screenX - 40, this.groundY - window.innerHeight * 0.1);
            ctx.lineTo(screenX + treeWidth / 2, this.groundY - treeHeight - 100);
            ctx.lineTo(screenX + treeWidth + 40, this.groundY - window.innerHeight * 0.1);
            ctx.fill();
        }

        // Draw foreground trees (parallax 0.8)
        const fgSpacing = 400;
        const startFgX = Math.floor(camera.x / fgSpacing) * fgSpacing;
        for (let x = startFgX - fgSpacing; x < startFgX + this.game.canvas.width + fgSpacing; x += fgSpacing) {
            const screenX = x - (camera.x * 0.8);
            
            ctx.fillStyle = '#081208'; // darker
            const treeHeight = 350;
            const treeWidth = 40;
            ctx.fillRect(screenX, this.groundY - treeHeight, treeWidth, treeHeight);
            
            // Pine look
            ctx.beginPath();
            ctx.moveTo(screenX - 60, this.groundY - 100);
            ctx.lineTo(screenX + treeWidth / 2, this.groundY - treeHeight - 80);
            ctx.lineTo(screenX + treeWidth + 60, this.groundY - 100);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(screenX - 80, this.groundY);
            ctx.lineTo(screenX + treeWidth / 2, this.groundY - treeHeight + 50);
            ctx.lineTo(screenX + treeWidth + 80, this.groundY);
            ctx.fill();
        }
    }
}
