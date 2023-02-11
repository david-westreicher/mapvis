export const HEIGHT_VERTEX_SHADER = `
    uniform sampler2D heightMap;
    uniform vec3 camPos;
    uniform float heightScale;

    varying vec2 pos2D;

    void main() {
        float gridSnap = max(256.0, floor(camPos.z * 0.5) * 2.0);
        vec2 offset = floor(camPos.xy / gridSnap + 0.5) * gridSnap;
        pos2D = (position.xy + offset) / 5000.0;

        float zPos = textureLod(heightMap, pos2D, 0.0).a * heightScale;
        vec4 newPosition = vec4(pos2D * 5000.0, zPos, 1.0);
        vec4 mvPosition = modelViewMatrix * newPosition;
        gl_Position = projectionMatrix * mvPosition;
    }
`;
export const HEIGHT_FRAGMENT_SHADER = `
    uniform sampler2D heightMap;
    uniform vec3 col;

    varying vec2 pos2D;

    void main() {
        gl_FragColor = vec4(texture2D(heightMap, pos2D).rgb * col, 1.0);
    }
`;
export const QUADTREE_VERTEX_SHADER = `
    varying vec2 uvVar;
    void main() {
        uvVar = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
`;
export const QUADTREE_FRAGMENT_SHADER = `
    uniform sampler2D quadMap;
    uniform sampler2D tile;
    varying vec2 uvVar;

    void main() {
        vec4 indirectionMap = texture2D(quadMap, uvVar);
        float tileSize = exp2(indirectionMap.b * 255.0);
        vec2 tileCoord = mod(uvVar * 1024.0, tileSize);
        gl_FragColor = texture2D(tile, tileCoord / tileSize);
    }
`;
