import * as THREE from 'three';
import { Quadtree } from './quadtree';
import { TileCache } from './tilecache';
import { ClipMapScene, GuiScene, QuadTreeScene } from './scenes';
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
const quadtreeScene = new QuadTreeScene(renderer, quadtree.texture, tileCache.texture);
const clipMapScene = new ClipMapScene(renderer);
const guiScene = new GuiScene(renderer, quadtree.texture, tileCache.texture);

function animate() {
    requestAnimationFrame(animate);
    stats.begin();
    clipMapScene.update();
    clipMapScene.render();

    tileCache.update();
    quadtreeScene.update();
    const scaledCameraPos = quadtree.globalToLocal(quadtreeScene.camera.position);
    quadtree.update(scaledCameraPos);
    quadtreeScene.render();
    guiScene.render();
    stats.end();
}
animate();
