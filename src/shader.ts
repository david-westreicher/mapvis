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
    float PHYSICAL_TEXTURE_TILE_WIDTH = 4.0;
    float QUADTREE_WIDTH = 1024.0;
    varying vec2 uvVar;

    void main() {
        vec4 indirectionMap = texture2D(quadMap, uvVar);
        float tileSize = exp2(indirectionMap.b * 255.0);
        vec2 tileCoord = vec2(indirectionMap.r, indirectionMap.g) * 255.0 / PHYSICAL_TEXTURE_TILE_WIDTH;
        vec2 inTileCoord = mod(uvVar * QUADTREE_WIDTH, tileSize);
        gl_FragColor = texture2D(tile, inTileCoord / tileSize / PHYSICAL_TEXTURE_TILE_WIDTH + tileCoord);
    }
`;
export const QUADTREE_DEBUG_FRAGMENT_SHADER = `
    uniform sampler2D map;
    varying vec2 uvVar;

    void main() {
        vec4 indirectionMap = texture2D(map, uvVar);
        float tileSize = exp2(indirectionMap.b * 255.0);
        vec2 inTileCoord = mod(uvVar * 1024.0, tileSize) / tileSize;
        float tileSizeColor = indirectionMap.b * 256.0 / 10.0;
        gl_FragColor = vec4(vec2(inTileCoord), tileSizeColor, 1.0);
    }
`;
