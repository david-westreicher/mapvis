const VIRTUAL_TEXTURE_FUNCTIONALITY = `
    uniform float QUADTREE_WIDTH;
    uniform float TILECACHE_WIDTH;
    uniform float TILECACHE_PIXEL_WIDTH;

    vec2 physicalTextureCoord(sampler2D quadMap, vec2 uvVar) {
        vec4 indirectionMap = texture2D(quadMap, uvVar);
        float tileSize = exp2(indirectionMap.b * 255.0);
        vec2 tileCoord = vec2(indirectionMap.r, indirectionMap.g) * 255.0 / TILECACHE_WIDTH;
        vec2 inTileCoord = mod(uvVar * QUADTREE_WIDTH, tileSize);
        float fac = 255.0/256.0;
        vec2 textureCoord = (inTileCoord / tileSize / TILECACHE_WIDTH)*fac + tileCoord + 0.5/TILECACHE_PIXEL_WIDTH;
        return textureCoord;
    }

    float elevation(sampler2D height, vec2 uv) {
        vec3 heightTex = texture2D(height, uv).rgb;
        return ((heightTex.r*256.0 * 256.0 + heightTex.g * 256.0 + heightTex.b)  - 32768.0) / 50.0 - 14.0;
    }

`;

export const HEIGHT_VERTEX_SHADER = `
    ${VIRTUAL_TEXTURE_FUNCTIONALITY}
    uniform sampler2D heightQuadMap;
    uniform sampler2D heightTextureCache;
    uniform vec3 camPos;
    uniform float WORLD_SIZE;

    varying vec2 uv2D;

    void main() {
        float gridSnap = 1.0;//max(256.0, floor(camPos.z * 0.5) * 2.0);
        vec2 offset = floor(camPos.xy / gridSnap + 0.5) * gridSnap;
        vec2 pos2D = (position.xy + offset);
        uv2D = clamp(pos2D / WORLD_SIZE + 0.5, 0.0, 1.0);

        float height = elevation(heightTextureCache, physicalTextureCoord(heightQuadMap, uv2D));
        vec4 newPosition = vec4(pos2D, height, 1.0);
        vec4 mvPosition = modelViewMatrix * newPosition;
        gl_Position = projectionMatrix * mvPosition;
    }
`;

export const HEIGHT_FRAGMENT_SHADER = `
    ${VIRTUAL_TEXTURE_FUNCTIONALITY}
    uniform sampler2D colorQuadMap;
    uniform sampler2D colorTextureCache;

    varying vec2 uv2D;

    void main() {
        vec3 colorTex = texture2D(colorTextureCache, physicalTextureCoord(colorQuadMap, uv2D)).rgb;
        gl_FragColor = vec4(colorTex, 1.0);
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
    ${VIRTUAL_TEXTURE_FUNCTIONALITY}
    uniform sampler2D colorTextureCache;
    uniform sampler2D heightTextureCache;

    varying vec2 uvVar;

    void main() {
        vec2 textureCoord = physicalTextureCoord(uvVar);
        vec3 colorTex = texture2D(colorTextureCache, textureCoord).rgb;
        vec3 heightTex = texture2D(heightTextureCache, textureCoord).rgb;
        float elevation = ((heightTex.r*256.0 * 256.0 + heightTex.g * 256.0 + heightTex.b)  - 32768.0) / 8000.0;
        elevation = 1.0;
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
