precision highp float;
uniform sampler2D map;
varying vec2 vUv;

void main() {
    gl_FragColor = texture2D(map, vUv);//vec4(1.0, 1.0, 1.0, 1.0);
}
