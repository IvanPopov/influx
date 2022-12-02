#ifndef __EXTERNALS_HLSL__
#define __EXTERNALS_HLSL__

/**
 * @node {elapsedTime}
 * @title Elapsed time frame
 * @desc Time elapsed since the last frame (ms).
 */
uniform float elapsedTime: ELAPSED_TIME;

/**
 * @node {elapsedTimeLevel}
 * @title Elapsed time level
 * @desc Time elapsed since the start of the level (ms). 
 */
uniform float elapsedTimeLevel: ELAPSED_TIME_LEVEL;

/**
 * @node {elapsedTimeThis}
 * @title Elapsed time 'this'
 * @desc Time elapsed since the start of the effect (ms).
 */
uniform float elapsedTimeThis: ELAPSED_TIME_THIS;


uniform float3 parentPosition: PARENT_POSITION;

uniform float3 cameraPosition: CAMERA_POSITION;

uniform uint frameNumber: FRAME_NUMBER;

#endif

