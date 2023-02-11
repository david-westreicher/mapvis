import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HEIGHT_VERTEX_SHADER, HEIGHT_FRAGMENT_SHADER } from './shader';
import * as CLIPMAP from './clipmap';

export class ThreeDScene {
    protected scene: THREE.Scene = new THREE.Scene();
    public camera: THREE.Camera = this.constructCamera();
    protected controls: OrbitControls = this.constructControls();
    constructor(protected renderer: THREE.Renderer) {}

    private constructControls(): OrbitControls {
        const controls = new OrbitControls(
            this.camera,
            this.renderer.domElement
        );
        controls.screenSpacePanning = false;
        controls.target.set(0, 0, 100);
        controls.maxPolarAngle = Math.PI * 0.5;
        return controls;
    }

    private constructCamera(): THREE.Camera {
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            1,
            100000000
        );
        camera.up.set(0, 0, 1);
        camera.position.set(0, 0, 2000);
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
    constructor(
        protected renderer: THREE.Renderer,
        private addWireframe: boolean = false
    ) {
        super(renderer);
        const clipMapMesh = this.constructMesh();
        this.scene.add(clipMapMesh);
        if (this.addWireframe)
            this.scene.add(
                new THREE.Mesh(
                    clipMapMesh.geometry,
                    this.generateWireFrameMaterial(clipMapMesh.material)
                )
            );
    }

    private constructMesh(): THREE.Mesh<
        THREE.BufferGeometry,
        THREE.ShaderMaterial
    > {
        const heightMap = new THREE.TextureLoader().load(
            'assets/terrain2.png'
            //'https://ecn.t1.tiles.virtualearth.net/tiles/a12022131232333223.jpeg?g=13352'
        );
        heightMap.wrapS = THREE.MirroredRepeatWrapping;
        heightMap.wrapT = THREE.MirroredRepeatWrapping;
        heightMap.minFilter = THREE.LinearMipMapLinearFilter;

        const clipMapMaterial = new THREE.ShaderMaterial({
            uniforms: {
                heightMap: {
                    value: heightMap,
                },
                camPos: {
                    value: this.camera.position,
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
        const geometry = CLIPMAP.buildGeometry(5, 200);
        return new THREE.Mesh(geometry, clipMapMaterial);
    }

    private generateWireFrameMaterial(otherMaterial: THREE.ShaderMaterial) {
        const material = new THREE.ShaderMaterial();
        material.copy(otherMaterial);
        material.uniforms.camPos = { value: this.camera };
        material.uniforms.col = { value: [0.5, 1.0, 0.0] };
        material.wireframe = true;
        return material;
    }
}

export class GuiScene {
    public camera: THREE.Camera = new THREE.OrthographicCamera(
        0,
        window.innerWidth,
        window.innerHeight,
        0
    );

    private scene: THREE.Scene = new THREE.Scene();

    constructor(
        private renderer: THREE.WebGLRenderer,
        quadTreeTexture: THREE.Texture
    ) {
        this.scene.add(this.constructFullScreenMesh(quadTreeTexture));
    }

    public constructFullScreenMesh(quadTreeTexture: THREE.Texture): THREE.Mesh {
        const planeSize = 200;
        const planeMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(planeSize, planeSize),
            new THREE.MeshBasicMaterial({ map: quadTreeTexture })
        );
        planeMesh.position.set(planeSize / 2, planeSize / 2, -1);
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
        quadTreeTexture: THREE.Texture
    ) {
        super(renderer);
        this.scene.add(this.constructFullScreenMesh(quadTreeTexture));
        this.scene.add(this.cameraMesh);
    }

    public update(): void {
        super.update();
        this.cameraMesh.position.copy(this.camera.position);
        const scale = this.camera.position.z / 100;
        this.cameraMesh.position.z = scale;
        this.cameraMesh.scale.setScalar(scale);
    }

    public constructFullScreenMesh(quadTreeTexture: THREE.Texture): THREE.Mesh {
        const planeSize = 1024 * 1024;
        const planeMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(planeSize, planeSize),
            new THREE.MeshBasicMaterial({ map: quadTreeTexture })
        );
        return planeMesh;
    }
}
