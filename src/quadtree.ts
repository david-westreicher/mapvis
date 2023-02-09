import * as THREE from 'three';
import { Mesh, MeshBasicMaterial, WebGLRenderer } from 'three';

const QUADTREE_SIZE = 1024;

class VectorCache {
    private tmpVectors = Array.from(
        { length: 10000 },
        () => new THREE.Vector3()
    );
    private i = 0;

    public minDistance(
        pos: THREE.Vector3,
        x: number,
        y: number,
        size: number
    ): number {
        const startIndex = this.i;
        this.get(x, y, 0);
        this.get(x + size, y, 0);
        this.get(x, y + size, 0);
        this.get(x + size, y + size, 0);
        this.get(x + size / 2, y + size / 2, 0);
        let minDistance = Number.MAX_VALUE;
        for (let i = 0; i < 5; i++) {
            minDistance = Math.min(
                minDistance,
                this.tmpVectors[i + startIndex].distanceTo(pos)
            );
        }
        return minDistance;
    }

    public get(x: number, y: number, z: number): THREE.Vector3 {
        return this.tmpVectors[this.i++].set(x, y, z);
    }

    public reset() {
        this.i = 0;
    }
}

const vectorCache = new VectorCache();

export class Renderer {
    private _render: (renderer: WebGLRenderer) => void;
    private meshes: THREE.Mesh<
        THREE.BufferGeometry,
        THREE.MeshBasicMaterial
    >[] = [];
    private colorCache: { [key: string]: number } = {};
    public texture: THREE.Texture;
    constructor() {
        const camera = new THREE.OrthographicCamera(
            0,
            QUADTREE_SIZE,
            QUADTREE_SIZE,
            0
        );
        const bufferScene = new THREE.Scene();
        for (let i = 0; i < 300; i++) {
            const color = new THREE.Color();
            const mesh = new Mesh(
                new THREE.PlaneGeometry(1.0, 1.0),
                new MeshBasicMaterial({ color })
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
        this._render = (renderer) => {
            renderer.setRenderTarget(renderTarget);
            renderer.clearColor();
            renderer.render(bufferScene, camera);
            renderer.setRenderTarget(null);
        };
    }

    public render(renderer: WebGLRenderer, camPos: THREE.Vector3) {
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
        console.log(
            Math.min(...getTiles(camPos).map((tile) => tile.z)),
            getTiles(camPos).length
        );
        while (i < this.meshes.length) {
            this.meshes[i++].visible = false;
        }
        const lastmesh = this.meshes.at(-1);
        lastmesh.visible = true;
        lastmesh.position.set(camPos.x, camPos.y, -1);
        lastmesh.scale.set(3, 3, 1);
        this._render(renderer);
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
        const distance = vectorCache.minDistance(camPos, x, y, size);
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
