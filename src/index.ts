import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HEIGHT_VERTEX_SHADER, HEIGHT_FRAGMENT_SHADER } from './shader';
import { buildGrid } from './clipmap';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1000000000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const heightMap = new THREE.TextureLoader().load('./assets/terrain.png');
heightMap.wrapS = THREE.MirroredRepeatWrapping;
heightMap.wrapT = THREE.MirroredRepeatWrapping;
const geometry = buildGrid(20, 81);
const camPos = [0, 0, 0];
const material = new THREE.ShaderMaterial({
    uniforms: {
        heightMap: {
            value: heightMap,
        },
        camPos: {
            value: camPos,
        },
    },
    vertexShader: HEIGHT_VERTEX_SHADER,
    fragmentShader: HEIGHT_FRAGMENT_SHADER,
    side: THREE.FrontSide,
    wireframe: true,
});
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const controls = new OrbitControls(camera, renderer.domElement);
controls.panSpeed = 0.00000001;
camera.position.set(0, 0, 10000);

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    camPos[0] = controls.target.x;
    camPos[1] = controls.target.y;
    renderer.render(scene, camera);
}
animate();
