export class AssetLoader {
    constructor() {
        this.images = {};
    }
    async load(assets) {
        const promises = Object.entries(assets).map(([key, src]) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = src;
                img.onload = () => {
                    this.images[key] = img;
                    resolve(img);
                };
                img.onerror = reject;
            });
        });
        await Promise.all(promises);
    }
    get(key) {
        return this.images[key];
    }
}
