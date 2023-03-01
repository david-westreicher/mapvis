import * as THREE from 'three';
import { Quadtree, getTiles, globalToLocal } from './quadtree';
import { TileCache, TileStyle } from './tilecache';
import { ClipMapScene, GuiScene } from './scenes';
import Stats from 'stats.js';
import { CAMERA_HEIGHT_OFFSET } from './constants';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x00000000, 0);
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

const colorQuadtree = new Quadtree(renderer, new TileCache(renderer, TileStyle.GOOGLE_AERIAL_RGB));
const heightQuadtree = new Quadtree(renderer, new TileCache(renderer, TileStyle.AWS_HEIGHT));
const clipMapScene = new ClipMapScene(renderer, colorQuadtree, heightQuadtree);
const guiScene = new GuiScene(renderer, colorQuadtree, heightQuadtree);

function getHeight(pos: THREE.Vector3): number {
    const scaledPos = globalToLocal(pos);
    return heightQuadtree.tileCache.getHeight(scaledPos.x, scaledPos.y);
}

function animate() {
    requestAnimationFrame(animate);
    stats.begin();

    clipMapScene.controls.target.z = getHeight(clipMapScene.controls.target) + CAMERA_HEIGHT_OFFSET;
    clipMapScene.update();
    clipMapScene.camera.position.z = Math.max(
        clipMapScene.camera.position.z,
        getHeight(clipMapScene.camera.position) + CAMERA_HEIGHT_OFFSET
    );
    const scaledCameraPos = globalToLocal(clipMapScene.camera.position);
    scaledCameraPos.z = Math.max(0, clipMapScene.camera.position.z - getHeight(clipMapScene.camera.position) - 5.0);

    const visibleTiles = getTiles(scaledCameraPos);
    colorQuadtree.update(visibleTiles);
    heightQuadtree.update(visibleTiles);

    guiScene.render();
    clipMapScene.render();

    stats.end();
}
animate();

document.onkeydown = function (e) {
    if (e.code === 'Space') {
        colorQuadtree.tileCache.clear();
        heightQuadtree.tileCache.clear();
    }
};
