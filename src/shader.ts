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

export const VIRTUAL_TEXTURE_FUNCTIONALITY = `
    uniform sampler2D quadMap;
    uniform float QUADTREE_WIDTH;
    uniform float TILECACHE_WIDTH;
    uniform float TILECACHE_PIXEL_WIDTH;

    varying vec2 uvVar;

    vec2 physicalTextureCoord() {
        vec4 indirectionMap = texture2D(quadMap, uvVar);
        float tileSize = exp2(indirectionMap.b * 255.0);
        vec2 tileCoord = vec2(indirectionMap.r, indirectionMap.g) * 255.0 / TILECACHE_WIDTH;
        vec2 inTileCoord = mod(uvVar * QUADTREE_WIDTH, tileSize);
        float fac = 255.0/256.0;
        vec2 textureCoord = (inTileCoord / tileSize / TILECACHE_WIDTH)*fac + tileCoord + 0.5/TILECACHE_PIXEL_WIDTH;
        return textureCoord;
    }

`;

export const QUADTREE_FRAGMENT_SHADER = `
    ${VIRTUAL_TEXTURE_FUNCTIONALITY}
    uniform sampler2D colorTextureCache;
    uniform sampler2D heightTextureCache;

    void main() {
        vec2 textureCoord = physicalTextureCoord();
        vec3 colorTex = texture2D(colorTextureCache, textureCoord).rgb;
        vec3 heightTex = texture2D(heightTextureCache, textureCoord).rgb;
        float elevation = ((heightTex.r*256.0 * 256.0 + heightTex.g * 256.0 + heightTex.b)  - 32768.0) / 8000.0;
        gl_FragColor = vec4(colorTex * elevation, 1.0);
    }
`;
export const QUADTREE_DEBUG_FRAGMENT_SHADER = `
    uniform sampler2D map;
    uniform float QUADTREE_WIDTH;
    varying vec2 uvVar;

    void main() {
        vec4 indirectionMap = texture2D(map, uvVar);
        float tileSize = exp2(indirectionMap.b * 255.0);
        vec2 inTileCoord = mod(uvVar * QUADTREE_WIDTH, tileSize) / tileSize;
        float tileSizeColor = indirectionMap.b * 256.0 / 10.0;
        gl_FragColor = vec4(vec2(inTileCoord), tileSizeColor, 1.0);
    }
`;
