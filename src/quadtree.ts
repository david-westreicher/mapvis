import * as THREE from 'three';
import { Mesh, MeshBasicMaterial, WebGLRenderer } from 'three';

const QUADTREE_SIZE = 1024;

export class Renderer {
    private _render: (renderer: WebGLRenderer) => void;
    private meshes: THREE.Mesh[];
    public texture: THREE.Texture;
    public target: THREE.WebGLRenderTarget;
    constructor() {
        const camera = new THREE.OrthographicCamera(
            0,
            QUADTREE_SIZE,
            QUADTREE_SIZE,
            0
        );
        const bufferScene = new THREE.Scene();
        this.meshes = [];
        for (let i = 0; i < 500; i++) {
            const mesh = new Mesh(
                new THREE.PlaneGeometry(0.5, 0.5),
                new MeshBasicMaterial({
                    color: i == 99 ? 0x000000 : Math.random() * 0xffffff,
                })
            );
            mesh.position.z = -1;
            this.meshes.push(mesh);
            bufferScene.add(mesh);
        }
        const renderTarget = new THREE.WebGLRenderTarget(
            QUADTREE_SIZE,
            QUADTREE_SIZE
        );
        this.target = renderTarget;
        this.texture = renderTarget.texture;
        this._render = (renderer) => {
            renderer.setRenderTarget(renderTarget);
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
            mesh.scale.set(tile.z * 2, tile.z * 2, 1);
            mesh.visible = true;
        }
        while (i < this.meshes.length) {
            this.meshes[i++].visible = false;
        }
        const lastmesh = this.meshes.at(-1);
        lastmesh.visible = true;
        lastmesh.position.set(camPos.x, camPos.y, -1);
        lastmesh.scale.set(20, 20, 1);
        this._render(renderer);
    }
}

export function getTiles(camPos: THREE.Vector3): THREE.Vector3[] {
    const res = [];
    const stack = [[0, 0, QUADTREE_SIZE]];
    while (stack.length) {
        const [x, y, size] = stack.pop();
        if (size == 1) {
            res.push(new THREE.Vector3(x, y, size));
            continue;
        }
        const vertA = new THREE.Vector3(x, y, 0);
        const vertB = new THREE.Vector3(x + size, y, 0);
        const vertC = new THREE.Vector3(x, y + size, 0);
        const vertD = new THREE.Vector3(x + size, y + size, 0);
        const verts = [vertA, vertB, vertC, vertD];
        if (!verts.some((vert) => vert.distanceTo(camPos) < size)) {
            res.push(new THREE.Vector3(x, y, size));
            continue;
        }
        stack.push([x, y, size / 2]);
        stack.push([x + size / 2, y, size / 2]);
        stack.push([x, y + size / 2, size / 2]);
        stack.push([x + size / 2, y + size / 2, size / 2]);
    }
    return res;
}
