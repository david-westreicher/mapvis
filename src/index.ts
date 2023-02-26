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

function animate() {
    requestAnimationFrame(animate);
    stats.begin();

    clipMapScene.update();
    const scaledCameraPos = globalToLocal(clipMapScene.camera.position);
    const visibleTiles = getTiles(scaledCameraPos);
    colorQuadtree.update(visibleTiles);
    heightQuadtree.update(visibleTiles);

    guiScene.render();
    clipMapScene.render();

    stats.end();
}
animate();
