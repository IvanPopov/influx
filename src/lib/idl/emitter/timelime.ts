import { verbose } from '@lib/common';
import { Uniforms } from '@lib/idl/emitter';


export function make() {
    let pauseTime: number;
    let pauseDelay: number;
    let startTime: number;
    let elapsedTimeLevel: number;
    let active: boolean;
    let paused: boolean;

    const constants = {
        elapsedTime: 0,
        elapsedTimeLevel: 0
    };

    function stop() {
        active = false;
        paused = false;
        verbose('timeline stopped');
    }

    function start() {
        constants.elapsedTime = 0;
        constants.elapsedTimeLevel = 0;

        paused = false;
        pauseDelay = 0;
        pauseTime = 0;
        startTime = Date.now();
        elapsedTimeLevel = 0;
        active = true;
        verbose('timeline started');
    }

    function tick() {
        if (paused || !active) {
            return;
        }

        const dt = Date.now() - startTime - pauseDelay;
        constants.elapsedTime = (dt - elapsedTimeLevel) / 1000;
        constants.elapsedTimeLevel = elapsedTimeLevel / 1000;
        elapsedTimeLevel = dt;
    }

    function isStopped() {
        return !active;
    }

    function pause()
    {
        if (paused || !active)
            return;
        
        paused = true;
        pauseTime = Date.now();
    }

    function unpause()
    {
        if (!paused || !active)
            return;
        
        pauseDelay += Date.now() - pauseTime;
        paused = false;
    }

    function getConstants(): Uniforms
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
        unpause
    };
}

export type ITimeline = ReturnType<typeof make>;
