precision highp float;

uniform float aspect;
uniform vec2 offset;
uniform float size;

attribute vec3 position; 
// plane positions: { (-1, 1, 0), (1, 1, 0), (-1, -1, 0), (1, -1, 0) }
/*
   0        1
    +------+
    |      |
    |      |
    +------+
   2        3
*/
varying vec2 vUv;

vec2 scale01(vec2 uv) 
{
    return uv * 0.5 + 0.5;
}

vec2 scale11(vec2 uv)
{
    return uv * 2.0 - 1.0;
}

void main() {
    vec2 uv = scale01(position.xy);
    vec2 pos01 = (uv * size * vec2(1.0, aspect) + offset);
    pos01.y = 1.0 - pos01.y;
    gl_Position = vec4(scale11(pos01), 0.0, 1.0); 
    uv.y = 1.0 - uv.y;
    vUv = uv;
}
