import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HEIGHT_VERTEX_SHADER, HEIGHT_FRAGMENT_SHADER } from './shader';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

function buildGeometry(): THREE.BufferGeometry {
    const geom = new THREE.BufferGeometry();
    const verts: number[][] = [];
    const N = 500;
    const indices: number[] = [];
    const vertUvs: number[][] = [];
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            verts.push([i - N * 0.5 + 0.5, j - N * 0.5 + 0.5, 0]);
            vertUvs.push([i / (N - 1), j / (N - 1)]);
        }
    }
    for (let i = 0; i < N - 1; i++) {
        for (let j = 0; j < N - 1; j++) {
            /*
             A ----- B
             | S   / |
             |   /   |
             | /  T  |
             C ----- D
            */
            const vertA = i * N + j;
            const vertB = i * N + j + 1;
            const vertC = (i + 1) * N + j;
            const vertD = (i + 1) * N + j + 1;
            const triangleS = [vertA, vertC, vertB];
            const triangleT = [vertB, vertC, vertD];
            indices.push(...triangleS);
            indices.push(...triangleT);
        }
    }
    const pos: number[] = [];
    verts.forEach((x) => pos.push(...x));
    const uvs: number[] = [];
    vertUvs.forEach((x) => uvs.push(...x));

    geom.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(pos), 3)
    );
    geom.setAttribute(
        'uv',
        new THREE.BufferAttribute(new Float32Array(uvs), 2)
    );
    geom.setIndex(indices);
    return geom;
}

const geometry = buildGeometry();
const material = new THREE.ShaderMaterial({
    uniforms: {
        heightMap: {
            value: new THREE.TextureLoader().load('./assets/terrain.png'),
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
camera.position.set(0, 0, 200);

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();
