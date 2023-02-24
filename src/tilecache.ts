import * as THREE from 'three';
import { LRUCache } from 'typescript-lru-cache';
import { QUADTREE_SIZE, TILE_WIDTH, TILECACHE_PIXEL_WIDTH, TILECACHE_WIDTH } from './constants';

const WORLD_KEY = convertTileToKey(0, 0, 1024);

class Tile {
    public key = '';
    public downloaded = false;
    public texture: THREE.Texture = null;

    constructor(public x: number, public y: number) {}

    public download(key: string, onFinishedLoading: () => void, onError: () => void) {
        this.key = key;
        if (this.texture !== null) {
            throw new Error('Texture was not disposed correctly');
        }
        new THREE.TextureLoader().load(
            `https://tile.openstreetmap.org/${key}.png`,
            async (texture) => {
                this.texture = texture;
                onFinishedLoading();
            },
            onError
        );
    }

    public clear() {
        this.key = '';
        this.downloaded = false;
        if (this.texture) this.texture.dispose();
        this.texture = null;
    }
}

export class TileCache {
    private camera = new THREE.OrthographicCamera(0, TILECACHE_PIXEL_WIDTH, TILECACHE_PIXEL_WIDTH, 0);
    private renderTarget = new THREE.WebGLRenderTarget(TILECACHE_PIXEL_WIDTH, TILECACHE_PIXEL_WIDTH, {
        //minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
    });
    private scene = new THREE.Scene();
    private mesh = new THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>(
        new THREE.PlaneGeometry(TILE_WIDTH, TILE_WIDTH),
        new THREE.MeshBasicMaterial({ map: null })
    );
    private cachedTiles = new LRUCache<string, Tile>({ maxSize: TILECACHE_WIDTH ** 2 });
    private downloadedTiles: Tile[] = [];

    constructor(private renderer: THREE.WebGLRenderer, private priorityDownloader = new TilePriorityDownloader()) {
        for (let x = 0; x < TILECACHE_WIDTH; x++) {
            for (let y = 0; y < TILECACHE_WIDTH; y++) {
                this.cachedTiles.set(`${x}|${y}`, new Tile(x, y));
            }
        }
        this.renderTarget.scissorTest = true;
        this.mesh.position.set(TILE_WIDTH * 0.5, TILE_WIDTH * 0.5, -1);
        this.scene.add(this.mesh);
        this.downloadTile(WORLD_KEY);
    }

    public get texture(): THREE.Texture {
        return this.renderTarget.texture;
    }

    public update(visibleTiles: THREE.Vector3[]) {
        const tilesToDownload = this.priorityDownloader.getTilesToDownload(visibleTiles);
        for (const tile of tilesToDownload) {
            if (this.cachedTiles.has(tile)) continue;
            this.downloadTile(tile);
        }
        while (this.downloadedTiles.length > 0) {
            const tile = this.downloadedTiles.pop();
            this.renderIntoCache(tile);
            //break; // render one tile per frame
        }
        this.keepWorldInCache();
    }

    public keepWorldInCache() {
        const tile = this.cachedTiles.get(WORLD_KEY);
        if (tile) this.cachedTiles.set(WORLD_KEY, tile);
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

        tile.clear();
        tile.downloaded = true;
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
