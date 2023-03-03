import * as THREE from 'three';
import { Quadtree, globalToLocal, getVisibleTiles } from './quadtree';
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

    const scaledCameraPos = clipMapScene.updateSceneAndGetScaledCamera(getHeight, colorQuadtree.offset);
    guiScene.updateScene(colorQuadtree.offset);
    const visibleTiles = getVisibleTiles(scaledCameraPos);
    colorQuadtree.update(visibleTiles, scaledCameraPos);
    heightQuadtree.update(visibleTiles, scaledCameraPos);

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
