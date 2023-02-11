import * as THREE from 'three';

const QUADTREE_SIZE = 1024;

class VectorCache {
    private tmpVectors = Array.from(
        { length: 10000 },
        () => new THREE.Vector3()
    );
    private i = 0;

    public get(x: number, y: number, z: number): THREE.Vector3 {
        return this.tmpVectors[this.i++].set(x, y, z);
    }

    public from(vec: THREE.Vector3): THREE.Vector3 {
        return this.tmpVectors[this.i++].copy(vec);
    }

    public reset() {
        this.i = 0;
    }
}

const vectorCache = new VectorCache();

export class Renderer {
    private _render: () => void;
    private meshes: THREE.Mesh<
        THREE.BufferGeometry,
        THREE.MeshBasicMaterial
    >[] = [];
    private colorCache: { [key: string]: number } = {};
    public texture: THREE.Texture;
    constructor(private renderer: THREE.WebGLRenderer) {
        const camera = new THREE.OrthographicCamera(
            0,
            QUADTREE_SIZE,
            QUADTREE_SIZE,
            0
        );
        const bufferScene = new THREE.Scene();
        for (let i = 0; i < 300; i++) {
            const color = new THREE.Color();
            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(1.0, 1.0),
                new THREE.MeshBasicMaterial({ color })
            );
            mesh.position.z = -1;
            this.meshes.push(mesh);
            bufferScene.add(mesh);
        }
        const renderTarget = new THREE.WebGLRenderTarget(
            QUADTREE_SIZE,
            QUADTREE_SIZE
        );
        this.texture = renderTarget.texture;
        this.texture.minFilter = THREE.NearestFilter;
        this.texture.magFilter = THREE.NearestFilter;
        this._render = () => {
            this.renderer.setRenderTarget(renderTarget);
            this.renderer.clearColor();
            this.renderer.render(bufferScene, camera);
            this.renderer.setRenderTarget(null);
        };
    }

    public update(camPos: THREE.Vector3) {
        let i = 0;
        for (const tile of getTiles(camPos)) {
            if (i >= this.meshes.length) break;
            const mesh = this.meshes[i++];
            mesh.position.set(tile.x + tile.z / 2, tile.y + tile.z / 2, -1);
            mesh.scale.set(tile.z, tile.z, 1);
            const key = `${tile.x}|${tile.y}|${tile.z}`;
            const color = this.colorCache[key] || 0xffffff * Math.random();
            this.colorCache[key] = color;
            mesh.material.color.setHex(color);
            mesh.visible = true;
        }
        while (i < this.meshes.length) {
            this.meshes[i++].visible = false;
        }
        this._render();
    }

    public globalToLocal(pos: THREE.Vector3): THREE.Vector3 {
        return pos
            .clone()
            .multiplyScalar(1 / QUADTREE_SIZE)
            .add(
                new THREE.Vector3(QUADTREE_SIZE * 0.5, QUADTREE_SIZE * 0.5, 0)
            );
    }
}

export function getTiles(camPos: THREE.Vector3): THREE.Vector3[] {
    const res = [];
    vectorCache.reset();
    const stack = [vectorCache.get(0, 0, QUADTREE_SIZE)];
    while (stack.length) {
        const { x, y, z } = stack.pop();
        const size = z;
        if (size == 1) {
            res.push(new THREE.Vector3(x, y, size));
            continue;
        }
        const mid = vectorCache.get(x + size / 2, y + size / 2, 0);
        const distance = mid.distanceTo(camPos);
        if (distance > size) {
            res.push(new THREE.Vector3(x, y, size));
            continue;
        }
        stack.push(vectorCache.get(x, y, size / 2));
        stack.push(vectorCache.get(x + size / 2, y, size / 2));
        stack.push(vectorCache.get(x, y + size / 2, size / 2));
        stack.push(vectorCache.get(x + size / 2, y + size / 2, size / 2));
    }
    return res;
}
