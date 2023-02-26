import * as THREE from 'three';
import { Quadtree, getTiles, globalToLocal } from './quadtree';
import { TileCache, TileStyle } from './tilecache';
import { ClipMapScene, GuiScene } from './scenes';
import Stats from 'stats.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x00000000, 0);
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

const colorQuadtree = new Quadtree(renderer, new TileCache(renderer, TileStyle.BING_AERIAL_RGB));
const heightQuadtree = new Quadtree(renderer, new TileCache(renderer, TileStyle.AWS_HEIGHT));
const clipMapScene = new ClipMapScene(renderer, colorQuadtree, heightQuadtree);
const guiScene = new GuiScene(renderer, colorQuadtree, heightQuadtree);

function getHeight(pos: THREE.Vector3) {
    const scaledPos = globalToLocal(pos);
    const height = heightQuadtree.tileCache.getHeight(scaledPos.x, scaledPos.y) / 50;
    return height;
}

function animate() {
    requestAnimationFrame(animate);
    stats.begin();

    clipMapScene.controls.target.z = getHeight(clipMapScene.controls.target);
    clipMapScene.update();
    clipMapScene.camera.position.z = Math.max(
        clipMapScene.camera.position.z,
        getHeight(clipMapScene.camera.position) + 3.0
    );
    /*
    clipMapScene.meshes.forEach((m) => m.scale.setScalar(clipMapScene.camera.position.z / 50));
    const scale = clipMapScene.camera.position.z / 50;
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            const mesh = clipMapScene.meshes[i * 10 + j];
            mesh.scale.setScalar(scale);
            mesh.position.x = clipMapScene.controls.target.x + i * scale * 2;
            mesh.position.y = clipMapScene.controls.target.y + j * scale * 2;
            mesh.scale.z = scale * 10;
            const scaledPos = globalToLocal(mesh.position);
            const height = heightQuadtree.tileCache.getHeight(scaledPos.x, scaledPos.y) / 50 + scale;
            mesh.position.z = height;
        }
    }
    */
    const scaledCameraPos = globalToLocal(clipMapScene.camera.position);
    scaledCameraPos.z = clipMapScene.camera.position.z - getHeight(clipMapScene.controls.target) - 3.0;
    const visibleTiles = getTiles(scaledCameraPos);
    colorQuadtree.update(visibleTiles);
    heightQuadtree.update(visibleTiles);

    guiScene.render();
    clipMapScene.render();

    stats.end();
}
animate();
