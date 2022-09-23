precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute vec3 position;
attribute vec4 color;
attribute float size;
attribute vec3 offset;

varying vec4 vColor;

void main() {
    vColor = color;
    vec4 viewPos = modelViewMatrix * vec4(offset, 1.0) + vec4(position * size, 0.0);
    gl_Position = projectionMatrix * viewPos;
}
