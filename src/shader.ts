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
