import * as THREE from 'three';
import { LRUCache } from 'typescript-lru-cache';
import { QUADTREE_SIZE, TILE_WIDTH, TILECACHE_PIXEL_WIDTH, TILECACHE_WIDTH, HEIGHT_SCALE } from './constants';
import { getTilesVisitor } from './quadtree';

const ALWAYS_IN_CACHE = [
    convertTileToKey(0, 0, QUADTREE_SIZE),
    convertTileToKey(0, 0, QUADTREE_SIZE * 0.5),
    convertTileToKey(0, QUADTREE_SIZE * 0.5, QUADTREE_SIZE * 0.5),
    convertTileToKey(QUADTREE_SIZE * 0.5, 0, QUADTREE_SIZE * 0.5),
    convertTileToKey(QUADTREE_SIZE * 0.5, QUADTREE_SIZE * 0.5, QUADTREE_SIZE * 0.5),
];

function loadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
        new THREE.TextureLoader().load(url, resolve, () => undefined, reject);
    });
}

export enum TileStyle {
    BING_AERIAL_RGB,
    AWS_HEIGHT,
    GOOGLE_AERIAL_RGB,
}

class Tile {
    /*
        `https://tile.openstreetmap.org/${key}.png`,
        http://h0.ortho.tiles.virtualearth.net/tiles/tre12023013031.jpeg?g=131
        'http://h2.ortho.tiles.virtualearth.net/tiles/tre12023013.jpeg?g=131',
        `http://h2.ortho.tiles.virtualearth.net/tiles/a1202033${this.toBingMapKey(key)}.jpeg?g=139`,
            BING format: tiles/{h,a,tre}
                        h: aerial with streets
                        a: only aerial
                        tre: relief + height?
                        r: only streets
        `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${key}.png`,
        `http://h2.ortho.tiles.virtualearth.net/tiles/a120230${this.toBingMapKey(key)}.jpeg?g=139`,
        `http://h2.ortho.tiles.virtualearth.net/tiles/a${this.toBingMapKey(key)}.jpeg?g=139`,
    */
    public key = '';
    public onGPU = false;
    public texture: THREE.Texture = null;

    constructor(public x: number, public y: number, private tileStyle: TileStyle) {}

    public async download(key: string, onFinishedLoading: () => void, onError: () => void) {
        this.key = key;
        if (this.texture !== null) {
            throw new Error('Texture was not disposed correctly');
        }
        try {
            this.texture = await loadTexture(this.getURL());
        } catch {
            onError();
            return;
        }
        onFinishedLoading();
    }

    private getURL(): string {
        switch (this.tileStyle) {
            case TileStyle.AWS_HEIGHT:
                return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${this.key}.png`;
            case TileStyle.BING_AERIAL_RGB:
                return `http://h2.ortho.tiles.virtualearth.net/tiles/a${this.toBingMapKey(this.key)}.jpeg?g=139`;
            case TileStyle.GOOGLE_AERIAL_RGB:
                return `http://mts0.google.com/vt/lyrs=s&${this.toGoogleKey(this.key)}`;
        }
    }

    private toGoogleKey(key: string): string {
        const [z, x, y] = key.split('/');
        return `x=${x}&y=${y}&z=${z}`;
    }

    private toBingMapKey(key: string): string {
        let [z, x, y] = key.split('/').map((x) => parseInt(x));
        const res: string[] = [];
        while (z > 0) {
            const quad = (y % 2) * 2 + (x % 2);
            res.push(quad.toString());
            x = Math.floor(x / 2);
            y = Math.floor(y / 2);
            z -= 1;
        }
        return res.reverse().join('');
    }

    public clear() {
        this.key = '';
        this.onGPU = false;
        if (this.texture) this.texture.dispose();
        this.texture = null;
    }
}

class TileCacheTexture {
    private camera = new THREE.OrthographicCamera(0, TILECACHE_PIXEL_WIDTH, TILECACHE_PIXEL_WIDTH, 0);
    private renderTarget = new THREE.WebGLRenderTarget(TILECACHE_PIXEL_WIDTH, TILECACHE_PIXEL_WIDTH, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.LinearFilter,
    });
    private scene = new THREE.Scene();
    private mesh = new THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>(
        new THREE.PlaneGeometry(TILE_WIDTH, TILE_WIDTH),
        new THREE.MeshBasicMaterial({ map: null })
    );
    constructor(private renderer: THREE.WebGLRenderer) {
        this.renderTarget.scissorTest = true;
        this.mesh.position.set(TILE_WIDTH * 0.5, TILE_WIDTH * 0.5, -1);
        this.scene.add(this.mesh);
    }

    public get texture(): THREE.Texture {
        return this.renderTarget.texture;
    }

    public renderIntoCache(tile: Tile) {
        console.log('render tile into cache', tile);
        this.mesh.material.map = tile.texture;
        const left = tile.x * TILE_WIDTH;
        const bottom = tile.y * TILE_WIDTH;
        const oldViewport = this.renderer.getCurrentViewport(new THREE.Vector4());
        this.mesh.position.set(left + TILE_WIDTH * 0.5, bottom + TILE_WIDTH * 0.5, -1);
        this.renderer.setViewport(left, bottom, TILE_WIDTH, TILE_WIDTH);
        this.renderTarget.scissor = new THREE.Vector4(left, bottom, TILE_WIDTH, TILE_WIDTH);

        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.render(this.scene, this.camera);

        this.renderer.setRenderTarget(null);
        this.renderer.setViewport(oldViewport);
    }
}

class CPUTileCacheTexture {
    private ctx: CanvasRenderingContext2D;

    constructor() {
        const canvas = document.createElement('canvas');
        canvas.width = TILECACHE_PIXEL_WIDTH;
        canvas.height = TILECACHE_PIXEL_WIDTH;
        this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    }

    public renderIntoCache(tile: Tile) {
        this.ctx.drawImage(tile.texture.image, tile.x * TILE_WIDTH, tile.y * TILE_WIDTH, TILE_WIDTH, TILE_WIDTH);
    }

    public getHeight(tile: Tile, x: number, y: number) {
        //TODO: could use linear subsampling
        const imageData = this.ctx.getImageData(tile.x * TILE_WIDTH + x, tile.y * TILE_WIDTH + TILE_WIDTH - y, 1, 1);
        const pixel = imageData.data;
        const height = (pixel[0] * 256.0 + pixel[1] + pixel[2] / 256.0 - 32768.0) * HEIGHT_SCALE;
        return height;
    }
}

export class TileCache {
    private cachedTiles = new LRUCache<string, Tile>({ maxSize: TILECACHE_WIDTH ** 2 });
    private downloadedTiles: Tile[] = [];
    private tileCache: TileCacheTexture;
    public cpuCache: CPUTileCacheTexture;

    constructor(
        renderer: THREE.WebGLRenderer,
        private tileStyle: TileStyle,
        private priorityDownloader = new TilePriorityDownloader()
    ) {
        this.tileCache = new TileCacheTexture(renderer);
        if (tileStyle == TileStyle.AWS_HEIGHT) this.cpuCache = new CPUTileCacheTexture();
        for (let x = 0; x < TILECACHE_WIDTH; x++) {
            for (let y = 0; y < TILECACHE_WIDTH; y++) {
                this.cachedTiles.set(`${x}|${y}`, new Tile(x, y, tileStyle));
            }
        }
    }

    public get texture(): THREE.Texture {
        return this.tileCache.texture;
    }

    public update(visibleTiles: THREE.Vector3[]) {
        const tilesToDownload = this.priorityDownloader.getTilesToDownload(visibleTiles);
        for (const tile of tilesToDownload) {
            if (this.cachedTiles.has(tile)) continue;
            this.downloadTile(tile);
            break;
        }
        while (this.downloadedTiles.length > 0) {
            const tile = this.downloadedTiles.pop();
            this.tileCache.renderIntoCache(tile);
            if (this.tileStyle == TileStyle.AWS_HEIGHT) this.cpuCache.renderIntoCache(tile);
            tile.clear();
            tile.onGPU = true;
        }
        this.keepWorldInCache();
    }

    public keepWorldInCache() {
        ALWAYS_IN_CACHE.forEach((key) => {
            const tile = this.cachedTiles.get(key);
            if (tile) this.cachedTiles.set(key, tile);
            else this.downloadTile(key);
        });
    }

    public getEncodedTileColor(x: number, y: number, size: number): number {
        const key = convertTileToKey(x, y, size);
        const tile = this.cachedTiles.get(key);
        if (!tile || !tile.onGPU) {
            if (size == QUADTREE_SIZE) return Math.log2(QUADTREE_SIZE);
            const nextSize = size * 2;
            return this.getEncodedTileColor(
                Math.floor(x / nextSize) * nextSize,
                Math.floor(y / nextSize) * nextSize,
                nextSize
            );
        }
        let color = 0;
        color |= tile.x << 16;
        color |= tile.y << 8;
        color |= Math.log2(size);
        return color;
    }

    public downloadTile(key: string) {
        const tile = this.cachedTiles.oldest.value;
        tile.clear();
        tile.key = key;
        this.cachedTiles.set(tile.key, tile);
        tile.download(
            key,
            () => {
                if (key === tile.key) this.downloadedTiles.push(tile);
            },
            () => {
                console.log('error downloading', tile);
                tile.clear();
            }
        );
    }

    public getHeight(posX: number, posY: number) {
        const lastTile = new THREE.Vector3();
        getTilesVisitor((x: number, y: number, size: number) => {
            const key = convertTileToKey(x, y, size);
            const tile = this.cachedTiles.get(key);
            const inTile = x <= posX && posX <= x + size && y <= posY && posY <= y + size;
            const isGoodTile = tile && tile.onGPU && inTile;
            if (isGoodTile) lastTile.set(x, y, size);
            return inTile;
        });
        const tile = this.cachedTiles.get(convertTileToKey(lastTile.x, lastTile.y, lastTile.z));
        if (!tile) return 0;
        const offsetX = ((posX % lastTile.z) * TILE_WIDTH) / lastTile.z;
        const offsetY = ((posY % lastTile.z) * TILE_WIDTH) / lastTile.z;
        return this.cpuCache.getHeight(tile, offsetX, offsetY);
    }

    public clear() {
        const tiles: Tile[] = Array.from(this.cachedTiles.values());
        this.cachedTiles.clear();
        for (const tile of tiles) {
            this.cachedTiles.set(this.cachedTiles.size.toString(), tile);
            tile.clear();
        }
    }
}

class TilePriorityDownloader {
    public getTilesToDownload(visibleTiles: THREE.Vector3[]): string[] {
        return visibleTiles.map((tile) => convertTileToKey(tile.x, tile.y, tile.z));
    }
}

function convertTileToKey(x: number, y: number, size: number): string {
    const zoom = Math.log2(QUADTREE_SIZE) - Math.log2(size);
    const maxY = 2 ** zoom - 1;
    //return `${zoom}/${x / z}/${maxY - y / z}`;
    return `${zoom + 6}/${34 * 2 ** zoom + x / size}/${maxY - (y / size - 22 * 2 ** zoom)}`; // TODO: remove IBK
}

/* TODO: TilePriorityDownloader
         use 2 LRU caches:
              * lru_priority[tileKey]: should store how many frames the tile is already visible
              * lru_lastframevis[tileKey]: stores on which frame the tile was last visible
         every frame get a list of visible tiles:
              * if tile is already in texture cache => skip
              * if tile not in lru_priority or lru_lastframevis[tile] != curr_frame - 1 =>
                      lru_priority[tile] = 1, lru_lastframevis[tile] = curr_frame
              * if tile in lru_priority and lru_lastframevis[tile] == curr_frame - 1 =>
                      lru_priority[tile] += 1, lru_lastframevis[tile] = curr_frame
                      if lru_priority[tile] is now > 30 => download tile
*/
