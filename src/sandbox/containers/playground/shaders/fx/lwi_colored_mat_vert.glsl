precision highp float;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

/*

struct LwiInstance {
    float4 dynData[2]: META;
    float3x4 worldMatr: TRANSFORM0;
    float3x4 worldMatrPrev: TRANSFORM1;
};

webgl doesn't support non-squared matrices or arrays in attributes (!)

*/

attribute vec4 a_dynData_0;
attribute vec4 a_dynData_1;

attribute vec4 a_worldMat_0;
attribute vec4 a_worldMat_1;
attribute vec4 a_worldMat_2;

attribute vec4 a_worldMatPrev_0;
attribute vec4 a_worldMatPrev_1;
attribute vec4 a_worldMatPrev_2;

varying vec4 vColor;

void main() 
{
    vec4 zero = vec4(position, 1.0);
    
    vec4 pos;
    pos.x = dot(a_worldMat_0, zero);
    pos.y = dot(a_worldMat_1, zero);
    pos.z = dot(a_worldMat_2, zero);
    pos.w = 1.0;

    vec4 viewPos = viewMatrix * pos;
    gl_Position = projectionMatrix * viewPos;

    vec3 lightDir;
    lightDir = normalize(vec3(1.0, 4.0, 1.0));

    float NdL;
    NdL = max(0.0, dot(normal, lightDir) * 0.75);
    vColor = vec4(vec3(NdL), 0.0) + vec4(0.25, 0.25, 0.25, 1.0) * a_dynData_0;
}
