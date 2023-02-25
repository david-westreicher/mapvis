import * as THREE from 'three';
import { LRUCache } from 'typescript-lru-cache';
import { QUADTREE_SIZE, TILE_WIDTH, TILECACHE_PIXEL_WIDTH, TILECACHE_WIDTH } from './constants';

const ALWAYS_IN_CACHE = [
    convertTileToKey(0, 0, QUADTREE_SIZE * 0.5),
    convertTileToKey(0, QUADTREE_SIZE * 0.5, QUADTREE_SIZE * 0.5),
    convertTileToKey(QUADTREE_SIZE * 0.5, 0, QUADTREE_SIZE * 0.5),
    convertTileToKey(QUADTREE_SIZE * 0.5, QUADTREE_SIZE * 0.5, QUADTREE_SIZE * 0.5),
];

function loadTexture(url: string, onError: () => void): Promise<THREE.Texture> {
    return new Promise((resolve) => {
        new THREE.TextureLoader().load(url, resolve, onError);
    });
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
    public downloaded = false;
    public colorTexture: THREE.Texture = null;
    public heightTexture: THREE.Texture = null;

    constructor(public x: number, public y: number) {}

    public async download(key: string, onFinishedLoading: () => void, onError: () => void) {
        this.key = key;
        if (this.colorTexture !== null || this.heightTexture !== null) {
            throw new Error('Texture was not disposed correctly');
        }
        const heightUrl = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${key}.png`;
        const colorUrl = `http://h2.ortho.tiles.virtualearth.net/tiles/a${this.toBingMapKey(key)}.jpeg?g=139`;
        const [heightTexture, colorTexture] = await Promise.all([
            loadTexture(heightUrl, onError),
            loadTexture(colorUrl, onError),
        ]);
        this.heightTexture = heightTexture;
        this.colorTexture = colorTexture;
        onFinishedLoading();
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
        this.downloaded = false;
        if (this.heightTexture) this.heightTexture.dispose();
        if (this.colorTexture) this.colorTexture.dispose();
        this.heightTexture = null;
        this.colorTexture = null;
    }
}

class TileCacheTexture {
    private camera = new THREE.OrthographicCamera(0, TILECACHE_PIXEL_WIDTH, TILECACHE_PIXEL_WIDTH, 0);
    private renderTarget = new THREE.WebGLRenderTarget(TILECACHE_PIXEL_WIDTH, TILECACHE_PIXEL_WIDTH, {
        //minFilter: THREE.NearestFilter,
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

    public renderIntoCache(tile: Tile, useColor: boolean) {
        console.log('render tile into cache', tile);
        this.mesh.material.map = useColor ? tile.colorTexture : tile.heightTexture;
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

export class TileCache {
    private cachedTiles = new LRUCache<string, Tile>({ maxSize: TILECACHE_WIDTH ** 2 });
    private downloadedTiles: Tile[] = [];
    private colorCache: TileCacheTexture;
    private heightCache: TileCacheTexture;

    constructor(renderer: THREE.WebGLRenderer, private priorityDownloader = new TilePriorityDownloader()) {
        this.colorCache = new TileCacheTexture(renderer);
        this.heightCache = new TileCacheTexture(renderer);
        for (let x = 0; x < TILECACHE_WIDTH; x++) {
            for (let y = 0; y < TILECACHE_WIDTH; y++) {
                this.cachedTiles.set(`${x}|${y}`, new Tile(x, y));
            }
        }
        ALWAYS_IN_CACHE.forEach((key) => this.downloadTile(key));
    }

    public get colorTexture(): THREE.Texture {
        return this.colorCache.texture;
    }

    public get heightTexture(): THREE.Texture {
        return this.heightCache.texture;
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
            this.colorCache.renderIntoCache(tile, true);
            this.heightCache.renderIntoCache(tile, false);
            tile.clear();
            tile.downloaded = true;
            //break; // render one tile per frame
        }
        this.keepWorldInCache();
    }

    public keepWorldInCache() {
        ALWAYS_IN_CACHE.forEach((key) => {
            const tile = this.cachedTiles.get(key);
            if (tile) this.cachedTiles.set(key, tile);
        });
    }

    public getEncodedTileColor(x: number, y: number, size: number): number {
        const key = convertTileToKey(x, y, size);
        const tile = this.cachedTiles.get(key);
        if (!tile || !tile.downloaded) {
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
                this.downloadedTiles.push(tile);
            },
            () => {
                tile.clear();
            }
        );
    }
}

class TilePriorityDownloader {
    public getTilesToDownload(visibleTiles: THREE.Vector3[]): string[] {
        return visibleTiles.map((tile) => convertTileToKey(tile.x, tile.y, tile.z));
    }
}

function convertTileToKey(x: number, y: number, z: number): string {
    const zoom = Math.log2(QUADTREE_SIZE) - Math.log2(z);
    const maxY = 2 ** zoom - 1;
    return `${zoom}/${x / z}/${maxY - y / z}`;
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
