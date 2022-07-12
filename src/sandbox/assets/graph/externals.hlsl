#ifndef __EXTERNALS_HLSL__
#define __EXTERNALS_HLSL__

/**
 * @node {elapsedTime}
 * @title Elapsed time
 */
uniform float elapsedTime: ELAPSED_TIME;

/**
 * @node {elapsedTimeLevel}
 * @title Time passed from the beginning in ms. 
 */
uniform float elapsedTimeLevel: ELAPSED_TIME_LEVEL;

uniform float3 parentPosition: PARENT_POSITION;

uniform float3 cameraPosition: CAMERA_POSITION;

#endif

