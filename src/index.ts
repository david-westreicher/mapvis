import * as THREE from 'three';
import { ClipMapScene, GuiScene } from './scenes';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x00000000, 0);
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

const clipMapScene = new ClipMapScene(renderer);
const guiScene = new GuiScene(renderer);

function animate() {
    requestAnimationFrame(animate);
    clipMapScene.render();
    guiScene.render(clipMapScene.camera.position);
}
animate();
