export const HEIGHT_VERTEX_SHADER = `
    uniform sampler2D heightMap;
    uniform vec3 camPos;
    uniform float heightScale;
    uniform vec3 col;

    varying vec3 vColor;

    void main() {
        float xOffset = ceil(camPos.x / (position.z));
        float yOffset = ceil(camPos.y / (position.z));
        vec2 pos2D = position.xy + vec2(xOffset, yOffset) * position.z;

        //vec4 texFetch = textureLod(heightMap, pos2D / 5000.0, log(position.z)/log(2.0));
        vec4 texFetch = texture2D(heightMap, pos2D / 5000.0);
        float zPos = texFetch.a * heightScale;
        vec4 newPosition = vec4(pos2D, zPos, 1.0);
        vec4 mvPosition = modelViewMatrix * newPosition;
        gl_Position = projectionMatrix * mvPosition;

        vColor = texFetch.rgb  * col;
    }
`;
export const HEIGHT_FRAGMENT_SHADER = `
    varying vec3 vColor;
    void main() {
        gl_FragColor = vec4(vColor.rgb, 1.0);
    }
`;
