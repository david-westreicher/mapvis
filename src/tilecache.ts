import * as THREE from 'three';

const TILECACHE_PIXEL_WIDTH = 4096;
const TILE_WIDTH = 256;
const TILECACHE_WIDTH = TILECACHE_PIXEL_WIDTH / TILE_WIDTH;

class Tile {
    private key = '';
    public texture: THREE.Texture = null;

    constructor(public x: number, public y: number) {}

    public download(key: string, onFinishedLoading: () => void, onError: () => void) {
        this.key = key;
        if (this.texture !== null) {
            throw new Error('Texture was not disposed correctly');
        }
        new THREE.TextureLoader().load(
            Math.random() < 0.5 ? 'assets/test.png' : 'assets/terrain.png',
            async (texture) => {
                texture.source;
                this.texture = texture;
                onFinishedLoading();
            },
            onError
        );
    }

    public clear() {
        this.key = '';
        this.texture.dispose();
        this.texture = null;
    }
}

export class TileCache {
    private camera = new THREE.OrthographicCamera(0, TILECACHE_PIXEL_WIDTH, TILECACHE_PIXEL_WIDTH, 0);
    private renderTarget = new THREE.WebGLRenderTarget(TILECACHE_PIXEL_WIDTH, TILECACHE_PIXEL_WIDTH);
    private scene = new THREE.Scene();
    private mesh = new THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>(
        new THREE.PlaneGeometry(TILE_WIDTH, TILE_WIDTH),
        new THREE.MeshBasicMaterial({ map: null })
    );
    private freeTiles: Tile[] = [];
    private downloadedTiles: Tile[] = [];
    private colorCache: { [key: string]: number } = {};

    constructor(private renderer: THREE.WebGLRenderer) {
        for (let x = 0; x < TILECACHE_WIDTH; x++) {
            for (let y = 0; y < TILECACHE_WIDTH; y++) {
                this.freeTiles.push(new Tile(x, y));
            }
        }
        this.freeTiles.reverse();
        this.renderTarget.scissorTest = true;
        this.mesh.position.set(TILE_WIDTH * 0.5, TILE_WIDTH * 0.5, -1);
        this.scene.add(this.mesh);
        this.downloadTile(0, 0, 0);
        this.downloadTile(0, 0, 0);
        this.downloadTile(0, 0, 0);
        this.downloadTile(0, 0, 0);
        this.downloadTile(0, 0, 0);
        this.downloadTile(0, 0, 0);
        this.downloadTile(0, 0, 0);
        this.downloadTile(0, 0, 0);
    }

    public get texture(): THREE.Texture {
        return this.renderTarget.texture;
    }

    public update() {
        while (this.downloadedTiles.length > 0) {
            const tile = this.downloadedTiles.pop();
            this.renderIntoCache(tile);
            break; // render one tile per frame
        }
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
    }

    public getEncodedTileColor(x: number, y: number, size: number): number {
        const key = `${x}|${y}|${size}`;
        if (!(key in this.colorCache)) {
            const tileNumber = Math.floor(8 * Math.random());
            let color = 0;
            color |= (tileNumber / TILECACHE_WIDTH) << 16;
            color |= tileNumber % TILECACHE_WIDTH << 8;
            color |= Math.log2(size);
            this.colorCache[key] = color;
        }
        return this.colorCache[key];
    }

    public downloadTile(x: number, y: number, size: number) {
        const tile = this.freeTiles.pop();
        const key = `${x}|${y}|${size}`;
        tile.download(
            key,
            () => {
                this.downloadedTiles.push(tile);
            },
            () => {
                this.freeTiles.push(tile);
            }
        );
    }
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
