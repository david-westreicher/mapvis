import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HEIGHT_VERTEX_SHADER, HEIGHT_FRAGMENT_SHADER } from './shader';
import { buildGeometry } from './clipmap';

const ADD_WIREFRAME = false;
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

const heightMap = new THREE.TextureLoader().load('./assets/terrain2.png');
heightMap.wrapS = THREE.MirroredRepeatWrapping;
heightMap.wrapT = THREE.MirroredRepeatWrapping;
const geometry = buildGeometry(5, 200);
const camPos = [0, 0, 0];
const clipMapMaterial = new THREE.ShaderMaterial({
    uniforms: {
        heightMap: {
            value: heightMap,
        },
        camPos: {
            value: camPos,
        },
        heightScale: {
            value: 2000.0,
        },
        col: {
            value: [1.0, 1.0, 1.0],
        },
    },
    vertexShader: HEIGHT_VERTEX_SHADER,
    fragmentShader: HEIGHT_FRAGMENT_SHADER,
    side: THREE.FrontSide,
    wireframe: false,
});

function generateWireFrameMaterial() {
    const material = new THREE.ShaderMaterial();
    material.copy(clipMapMaterial);
    material.uniforms.camPos = { value: camPos };
    material.uniforms.col = { value: [0.5, 1.0, 0.0] };
    material.wireframe = true;
    return material;
}
scene.add(new THREE.Mesh(geometry, clipMapMaterial));
if (ADD_WIREFRAME)
    scene.add(new THREE.Mesh(geometry, generateWireFrameMaterial()));

camera.up.set(0, 0, 1);
camera.position.set(1000, 1000, 2000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.screenSpacePanning = false;
controls.target.set(0, 0, 100);

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    camPos[0] = controls.target.x;
    camPos[1] = controls.target.y;
    renderer.render(scene, camera);
}
animate();
