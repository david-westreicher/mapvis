import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HEIGHT_VERTEX_SHADER, HEIGHT_FRAGMENT_SHADER } from './shader';
import * as CLIPMAP from './clipmap';

export class ClipMapScene {
    public camera: THREE.Camera = this.constructCamera();

    private scene: THREE.Scene = new THREE.Scene();
    private controls: OrbitControls = this.constructControls();
    private clipMapMesh: THREE.Mesh<
        THREE.BufferGeometry,
        THREE.ShaderMaterial
    > = this.constructMesh();

    constructor(
        private renderer: THREE.Renderer,
        private addWireframe: boolean = false
    ) {
        this.scene.add(this.clipMapMesh);
        if (this.addWireframe)
            this.scene.add(
                new THREE.Mesh(
                    this.clipMapMesh.geometry,
                    this.generateWireFrameMaterial(this.clipMapMesh.material)
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
            1000000000
        );
        camera.up.set(0, 0, 1);
        camera.position.set(0, 0, 2000);
        return camera;
    }

    private generateWireFrameMaterial(otherMaterial: THREE.ShaderMaterial) {
        const material = new THREE.ShaderMaterial();
        material.copy(otherMaterial);
        material.uniforms.camPos = { value: this.camera };
        material.uniforms.col = { value: [0.5, 1.0, 0.0] };
        material.wireframe = true;
        return material;
    }

    public render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
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
