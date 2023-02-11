import * as THREE from 'three';
import * as QUADTREE from './quadtree';
import { GuiScene, QuadTreeScene } from './scenes';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x00000000, 0);
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

const quadtree = new QUADTREE.Renderer(renderer);
const quadtreeScene = new QuadTreeScene(renderer, quadtree.texture);
//const clipMapScene = new ClipMapScene(renderer);
const guiScene = new GuiScene(renderer, quadtree.texture);

function animate() {
    requestAnimationFrame(animate);
    //clipMapScene.update();
    //clipMapScene.render();

    quadtreeScene.update();
    const scaledCameraPos = quadtree.globalToLocal(
        quadtreeScene.camera.position
    );
    quadtree.update(scaledCameraPos);
    quadtreeScene.render();
    guiScene.render();
}
animate();
