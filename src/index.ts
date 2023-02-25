import * as THREE from 'three';
import { Quadtree, getTiles } from './quadtree';
import { TileCache } from './tilecache';
import { GuiScene, QuadTreeScene } from './scenes';
import Stats from 'stats.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x00000000, 0);
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

const tileCache = new TileCache(renderer);
const quadtree = new Quadtree(renderer, tileCache);
const quadtreeScene = new QuadTreeScene(renderer, quadtree.texture, tileCache.colorTexture, tileCache.heightTexture);
//const clipMapScene = new ClipMapScene(renderer); TODO: reactivate clipmapscene
const guiScene = new GuiScene(renderer, quadtree.texture, tileCache.colorTexture, tileCache.heightTexture);

function animate() {
    requestAnimationFrame(animate);
    stats.begin();
    //clipMapScene.update();
    //clipMapScene.render();

    const scaledCameraPos = quadtree.globalToLocal(quadtreeScene.camera.position);
    const visibleTiles = getTiles(scaledCameraPos);
    tileCache.update(visibleTiles);
    quadtreeScene.update();
    quadtree.update(visibleTiles);
    quadtreeScene.render();
    guiScene.render();
    stats.end();
}
animate();
