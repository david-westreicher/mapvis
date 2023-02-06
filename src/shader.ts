export const HEIGHT_VERTEX_SHADER = `
	uniform sampler2D heightMap;
	uniform vec3 camPos;

	varying vec3 vColor;

	void main() {
	    vec2 texPos = (uv+camPos.xy)*20000.0;
		vec4 newPosition = vec4(position.xy, texture2D(heightMap, texPos).r*1000.0, 1.0);
		vec4 mvPosition = modelViewMatrix * newPosition;
		gl_Position = projectionMatrix * mvPosition;
		vColor = texture2D(heightMap, texPos).rgb;
	}
`;
export const HEIGHT_FRAGMENT_SHADER = `
	varying vec3 vColor;
	void main() {
		gl_FragColor = vec4(vColor.rgb, 1.0);
	}
`;
