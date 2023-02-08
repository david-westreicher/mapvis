export const HEIGHT_VERTEX_SHADER = `
    uniform sampler2D heightMap;
    uniform vec3 camPos;
    uniform float heightScale;

    varying vec2 pos2D;

    void main() {
        float xOffset = ceil(camPos.x / (position.z));
        float yOffset = ceil(camPos.y / (position.z));
        pos2D = (position.xy + vec2(xOffset, yOffset) * position.z) / 5000.0;

        vec4 texFetch = textureLod(heightMap, pos2D, log(position.z)/log(2.0)-1.0);
        float zPos = texFetch.a * heightScale;
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
