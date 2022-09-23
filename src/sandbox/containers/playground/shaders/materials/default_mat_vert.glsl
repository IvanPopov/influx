precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

varying vec4 vColor;

void main() {
    vColor = vec4(uv.x, uv.y, 0.0, 1.0);
    vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPos;
}
