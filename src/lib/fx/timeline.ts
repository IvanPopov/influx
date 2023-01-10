import { verbose } from '@lib/common';

export function make() {
    let pauseTime: number;
    let pauseDelay: number;
    let startTime: number;
    let elapsedTimeLevel: number;
    let active: boolean;
    let paused: number;
    let frameNumber: number;

    const constants = {
        elapsedTime: 0,
        elapsedTimeLevel: 0,
        frameNumber: 0
    };

    function stop() {
        active = false;
        paused = 0;
        verbose('timeline stopped');
    }

    function start() {
        constants.elapsedTime = 0;
        constants.elapsedTimeLevel = 0;
        constants.frameNumber = 0;

        paused = 0;
        pauseDelay = 0;
        pauseTime = 0;
        frameNumber = 0;
        startTime = Date.now();
        elapsedTimeLevel = 0;
        active = true;
        verbose('timeline started');
    }

    function tick() {
        if (isStopped() || isPaused()) {
            return;
        }

        const dt = Date.now() - startTime - pauseDelay;
        constants.elapsedTime = (dt - elapsedTimeLevel) / 1000;
        constants.elapsedTimeLevel = elapsedTimeLevel / 1000;
        constants.frameNumber = ++frameNumber;
        elapsedTimeLevel = dt;
        // frameNumber++;
    }

    function isStopped() {
        return !active;
    }

    function isPaused() {
        return !!paused;
    }

    function pause()
    {
        if (isStopped())
            return;
        
        if (!isPaused()) {
            pauseTime = Date.now();
        }

        paused++;
    }

    function unpause()
    {
        if (isStopped() || !isPaused())
            return;
        
        paused--;

        if (!isPaused()) {
            pauseDelay += Date.now() - pauseTime;
        }
    }

    function getConstants()
    {
        return constants;
    }

    return {
        getConstants,
        start,
        stop,
        tick,
        isStopped,

        pause,
        unpause,
        isPaused
    };
}

export type ITimeline = ReturnType<typeof make>;
