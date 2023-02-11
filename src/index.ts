import * as THREE from 'three';
import * as QUADTREE from './quadtree';
import { ClipMapScene, GuiScene } from './scenes';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x00000000, 0);
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

const quadtree = new QUADTREE.Renderer(renderer);
const clipMapScene = new ClipMapScene(renderer);
const guiScene = new GuiScene(renderer, quadtree.texture);

function animate() {
    requestAnimationFrame(animate);
    clipMapScene.render();

    const scaledCameraPos = new THREE.Vector3()
        .copy(clipMapScene.camera.position)
        .multiplyScalar(1 / 100);
    quadtree.update(scaledCameraPos);
    guiScene.render();
}
animate();
