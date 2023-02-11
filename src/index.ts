import * as THREE from 'three';
import * as QUADTREE from './quadtree';
import { GuiScene, QuadTreeScene } from './scenes';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x00000000, 0);
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

const quadtree = new QUADTREE.Renderer(renderer);
const physicalTexture = new THREE.TextureLoader().load(
    'assets/physical_texture.png',
    (texture) => {
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
    }
);
const quadtreeScene = new QuadTreeScene(
    renderer,
    quadtree.texture,
    physicalTexture
);
//const clipMapScene = new ClipMapScene(renderer);
const guiScene = new GuiScene(renderer, quadtree.texture, physicalTexture);

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
