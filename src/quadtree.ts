import * as THREE from 'three';
import { TileCache } from './tilecache';
import { QUADTREE_SIZE, WORLD_SIZE } from './constants';

class VectorCache {
    private tmpVectors = Array.from({ length: 80000 }, () => new THREE.Vector3());
    private i = 0;

    public get(x: number, y: number, z: number): THREE.Vector3 {
        return this.tmpVectors[this.i++].set(x, y, z);
    }

    public from(vec: THREE.Vector3): THREE.Vector3 {
        return this.tmpVectors[this.i++].copy(vec);
    }

    public planeDistanceTo(p: THREE.Vector3, x: number, y: number, size: number) {
        const vert = this.get.bind(this);
        let d = Number.MAX_VALUE;
        d = Math.min(d, p.distanceTo(vert(x, y, 0)));
        d = Math.min(d, p.distanceTo(vert(x + size, y, 0)));
        d = Math.min(d, p.distanceTo(vert(x, y + size, 0)));
        d = Math.min(d, p.distanceTo(vert(x + size, y + size, 0)));
        d = Math.min(d, p.distanceTo(vert(x + size * 0.5, y + size * 0.5, 0)));
        return d;
    }

    public reset() {
        this.i = 0;
    }
}

const vectorCache = new VectorCache();

export class Quadtree {
    private _render: () => void;
    private meshes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[] = [];
    public texture: THREE.Texture;
    public offset = new THREE.Vector3();
    constructor(private renderer: THREE.WebGLRenderer, public tileCache: TileCache) {
        const camera = new THREE.OrthographicCamera(0, QUADTREE_SIZE, QUADTREE_SIZE, 0);
        const bufferScene = new THREE.Scene();
        for (let i = 0; i < 300; i++) {
            const color = new THREE.Color();
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({ color }));
            this.meshes.push(mesh);
            bufferScene.add(mesh);
        }
        const renderTarget = new THREE.WebGLRenderTarget(QUADTREE_SIZE, QUADTREE_SIZE, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
        });
        this.texture = renderTarget.texture;
        this._render = () => {
            this.renderer.setRenderTarget(renderTarget);
            this.renderer.clearColor();
            this.renderer.render(bufferScene, camera);
            this.renderer.setRenderTarget(null);
        };
    }

    public update(visibleTiles: THREE.Vector3[], cameraPos: THREE.Vector3) {
        this.offset
            .copy(cameraPos)
            .add(new THREE.Vector3(-QUADTREE_SIZE * 0.5, -QUADTREE_SIZE * 0.5))
            .floor();
        this.offset.z = 0;
        //this.offset.set(0, 0, 0);
        this.tileCache.update(visibleTiles);
        let i = 0;
        for (const quadTile of visibleTiles) {
            if (i >= this.meshes.length) break;
            const mesh = this.meshes[i++];
            mesh.position.set(quadTile.x + quadTile.z / 2, quadTile.y + quadTile.z / 2, -1).sub(this.offset);
            mesh.scale.set(quadTile.z, quadTile.z, 1);
            const tileColor = this.tileCache.getEncodedTileColor(quadTile.x, quadTile.y, quadTile.z);
            mesh.material.color.setHex(tileColor);
            mesh.visible = true;
        }
        while (i < this.meshes.length) {
            this.meshes[i++].visible = false;
        }
        this._render();
    }
}

export function globalToLocal(pos: THREE.Vector3): THREE.Vector3 {
    return pos
        .clone()
        .multiplyScalar(QUADTREE_SIZE / WORLD_SIZE)
        .add(new THREE.Vector3(QUADTREE_SIZE * 0.5, QUADTREE_SIZE * 0.5, 0));
}

export function getVisibleTiles(camPos: THREE.Vector3): THREE.Vector3[] {
    const res: THREE.Vector3[] = [];
    getTilesVisitor((x, y, size) => {
        if (size == 1 || vectorCache.planeDistanceTo(camPos, x, y, size) > size * 0.7) {
            res.push(new THREE.Vector3(x, y, size));
            return false;
        }
        return true;
    });
    res.sort(
        (a, b) =>
            vectorCache.planeDistanceTo(camPos, a.x, a.y, a.z) - vectorCache.planeDistanceTo(camPos, b.x, b.y, b.z)
    );
    return res;
}

export function getTilesVisitor(visitor: (x: number, y: number, size: number) => boolean) {
    vectorCache.reset();
    const stack = [vectorCache.get(0, 0, QUADTREE_SIZE)];
    while (stack.length) {
        const { x, y, z } = stack.pop();
        const shouldContinue = visitor(x, y, z);
        const size = z;
        if (!shouldContinue || size == 1) {
            continue;
        }
        stack.push(vectorCache.get(x, y, size / 2));
        stack.push(vectorCache.get(x + size / 2, y, size / 2));
        stack.push(vectorCache.get(x, y + size / 2, size / 2));
        stack.push(vectorCache.get(x + size / 2, y + size / 2, size / 2));
    }
}
