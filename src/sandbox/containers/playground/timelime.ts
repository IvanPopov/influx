import { verbose } from '@lib/common';
import { Uniforms } from './idl/IEmitter';


export function make() {
    let startTime: number;
    let elapsedTimeLevel: number;
    let active: boolean;

    const constants = {
        elapsedTime: 0,
        elapsedTimeLevel: 0
    };

    function stop() {
        active = false;
        verbose('timeline stopped');
    }

    function start() {
        constants.elapsedTime = 0;
        constants.elapsedTimeLevel = 0;

        startTime = Date.now();
        elapsedTimeLevel = 0;
        active = true;
        verbose('timeline started');
    }

    function tick() {
        if (!active) {
            return;
        }

        const dt = Date.now() - startTime;
        constants.elapsedTime = (dt - elapsedTimeLevel) / 1000;
        constants.elapsedTimeLevel = elapsedTimeLevel / 1000;
        elapsedTimeLevel = dt;
    }

    function isStopped() {
        return !active;
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
        isStopped
    };
}

export type ITimeline = ReturnType<typeof make>;
