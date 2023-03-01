import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
    QUADTREE_DEBUG_FRAGMENT_SHADER,
    HEIGHT_VERTEX_SHADER,
    HEIGHT_FRAGMENT_SHADER,
    QUADTREE_FRAGMENT_SHADER,
    QUADTREE_VERTEX_SHADER,
} from './shader';
import * as CLIPMAP from './clipmap';
import { QUADTREE_SIZE, TILECACHE_WIDTH, TILECACHE_PIXEL_WIDTH, WORLD_SIZE, HEIGHT_SCALE } from './constants';
import { Quadtree } from './quadtree';

export class ThreeDScene {
    protected scene: THREE.Scene = new THREE.Scene();
    public camera: THREE.PerspectiveCamera = this.constructCamera();
    public controls: OrbitControls = this.constructControls();
    constructor(protected renderer: THREE.Renderer) {}

    private constructControls(): OrbitControls {
        const controls = new OrbitControls(this.camera, this.renderer.domElement);
        controls.screenSpacePanning = false;
        controls.target.set(0, 0, 0);
        controls.maxPolarAngle = Math.PI * 0.5;
        controls.enableDamping = false;
        return controls;
    }

    private constructCamera(): THREE.PerspectiveCamera {
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 20000);
        camera.up.set(0, 0, 1);
        camera.position.set(0, 0, WORLD_SIZE * 0.5);
        return camera;
    }

    public update() {
        this.controls.update();
    }

    public render() {
        this.renderer.render(this.scene, this.camera);
    }
}

export class ClipMapScene extends ThreeDScene {
    constructor(protected renderer: THREE.WebGLRenderer, colorQuadtree: Quadtree, heightQuadtree: Quadtree) {
        super(renderer);
        const shaderUniforms: { [uniform: string]: THREE.IUniform } = {
            camPos: {
                value: this.camera.position, //TODO z-axis should use CPU height
            },
            colorQuadMap: {
                value: colorQuadtree.texture,
            },
            colorTextureCache: {
                value: colorQuadtree.tileCache.texture,
            },
            heightQuadMap: {
                value: heightQuadtree.texture,
            },
            heightTextureCache: {
                value: heightQuadtree.tileCache.texture,
            },
            HEIGHT_SCALE: {
                value: HEIGHT_SCALE,
            },
            QUADTREE_WIDTH: {
                value: QUADTREE_SIZE,
            },
            TILECACHE_WIDTH: {
                value: TILECACHE_WIDTH,
            },
            TILECACHE_PIXEL_WIDTH: {
                value: TILECACHE_PIXEL_WIDTH,
            },
            WORLD_SIZE: {
                value: WORLD_SIZE,
            },
        };
        const clipMapMesh = this.constructMesh(shaderUniforms);
        this.scene.add(clipMapMesh);
    }

    private constructMesh(uniforms: {
        [uniform: string]: THREE.IUniform;
    }): THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> {
        const clipMapMaterial = new THREE.ShaderMaterial({
            uniforms,
            vertexShader: HEIGHT_VERTEX_SHADER,
            fragmentShader: HEIGHT_FRAGMENT_SHADER,
            side: THREE.FrontSide,
            wireframe: false,
        });
        const geometry = CLIPMAP.buildGeometry();
        return new THREE.Mesh(geometry, clipMapMaterial);
    }
}

export class HeightDebugScene extends ThreeDScene {
    public meshes: THREE.Mesh[] = [];
    constructor(protected renderer: THREE.WebGLRenderer, private clipMapScene: ClipMapScene) {
        super(renderer);
        for (let i = 0; i < 100; i++) {
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 1),
                new THREE.MeshBasicMaterial({ color: 0x000000 })
            );
            mesh.position.z = 100;
            this.meshes.push(mesh);
            this.scene.add(mesh);
        }
    }

    public updateScene(heightGetter: (pos: THREE.Vector3) => number): void {
        super.update();
        const scale = Math.max(this.clipMapScene.camera.position.z / 50.0, 2.0);
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                const mesh = this.meshes[i * 10 + j];
                mesh.scale.setScalar(scale);
                mesh.position.x = this.clipMapScene.controls.target.x + i * scale * 2;
                mesh.position.y = this.clipMapScene.controls.target.y + j * scale * 2;
                const height = heightGetter(mesh.position) + scale * 0.5;
                mesh.position.z = height;
            }
        }
    }
    public render(): void {
        this.renderer.render(this.scene, this.clipMapScene.camera);
    }
}

export class GuiScene {
    public camera: THREE.Camera = new THREE.OrthographicCamera(0, window.innerWidth, window.innerHeight, 0);

    private scene: THREE.Scene = new THREE.Scene();
    private static readonly PLANE_SIZE = 200;

    constructor(private renderer: THREE.WebGLRenderer, colorQuadtree: Quadtree, heightQuadtree: Quadtree) {
        this.scene.add(this.constructFullScreenMesh(this.getDebugShader(colorQuadtree)));
        this.scene.add(
            this.constructFullScreenMesh(new THREE.MeshBasicMaterial({ map: colorQuadtree.tileCache.texture }))
        );
        this.scene.add(this.constructFullScreenMesh(this.getDebugShader(heightQuadtree)));
        this.scene.add(
            this.constructFullScreenMesh(new THREE.MeshBasicMaterial({ map: heightQuadtree.tileCache.texture }))
        );
    }

    private getDebugShader(quadTree: Quadtree) {
        return new THREE.ShaderMaterial({
            uniforms: {
                map: {
                    value: quadTree.texture,
                },
                QUADTREE_WIDTH: {
                    value: QUADTREE_SIZE,
                },
            },
            fragmentShader: QUADTREE_DEBUG_FRAGMENT_SHADER,
            vertexShader: QUADTREE_VERTEX_SHADER,
        });
    }

    public constructFullScreenMesh(material: THREE.Material): THREE.Mesh {
        const planeMesh = new THREE.Mesh(new THREE.PlaneGeometry(GuiScene.PLANE_SIZE, GuiScene.PLANE_SIZE), material);
        planeMesh.position.set(
            GuiScene.PLANE_SIZE / 2 + GuiScene.PLANE_SIZE * this.scene.children.length,
            GuiScene.PLANE_SIZE / 2,
            -1
        );
        return planeMesh;
    }

    public render() {
        this.renderer.render(this.scene, this.camera);
    }
}

export class QuadTreeScene extends ThreeDScene {
    private cameraMesh: THREE.Mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    constructor(
        protected renderer: THREE.WebGLRenderer,
        quadTreeTexture: THREE.Texture,
        colorTexture: THREE.Texture,
        heightTexture: THREE.Texture
    ) {
        super(renderer);
        this.scene.add(this.constructFullScreenMesh(quadTreeTexture, colorTexture, heightTexture));
        this.scene.add(this.cameraMesh);
    }

    public update(): void {
        super.update();
        this.cameraMesh.position.copy(this.camera.position);
        const scale = this.camera.position.z / 100;
        this.cameraMesh.position.z = scale;
        this.cameraMesh.scale.setScalar(scale);
    }

    public constructFullScreenMesh(
        quadTreeTexture: THREE.Texture,
        colorTexture: THREE.Texture,
        heightTexture: THREE.Texture
    ): THREE.Mesh {
        const planeSize = WORLD_SIZE;
        const planeMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(planeSize, planeSize),
            new THREE.ShaderMaterial({
                uniforms: {
                    quadMap: {
                        value: quadTreeTexture,
                    },
                    colorTextureCache: {
                        value: colorTexture,
                    },
                    heightTextureCache: {
                        value: heightTexture,
                    },
                    HEIGHT_SCALE: {
                        value: HEIGHT_SCALE,
                    },
                    QUADTREE_WIDTH: {
                        value: QUADTREE_SIZE,
                    },
                    TILECACHE_WIDTH: {
                        value: TILECACHE_WIDTH,
                    },
                    TILECACHE_PIXEL_WIDTH: {
                        value: TILECACHE_PIXEL_WIDTH,
                    },
                },
                vertexShader: QUADTREE_VERTEX_SHADER,
                fragmentShader: QUADTREE_FRAGMENT_SHADER,
            })
        );
        return planeMesh;
    }
}
