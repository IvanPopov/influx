/* tslint:disable:typedef */

import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import * as VM from '@lib/fx/bytecode/VM';
import { ICompileExprInstruction } from '@lib/idl/IInstruction';
import { IPartFxInstruction } from '@lib/idl/IPartFx';

type PartFx = IPartFxInstruction;

interface IRunnable {
    run(): VM.INT32;
}

function prebuild(expr: ICompileExprInstruction): IRunnable {
    const code = Bytecode.translate(expr.function).code;
    const bundle = VM.load(code);
    return {
        run() {
            return VM.play(bundle);
        }
    }
}

class Emitter {
    nPartAddFloat: number;
    nPartAdd: number;

    constructor() {
        this.nPartAdd = 0;
        this.nPartAddFloat = 0;
    }

    spawn(nPart: number, elapsedTime: number) {
        this.nPartAddFloat += nPart * elapsedTime;
        this.nPartAdd = Math.floor(this.nPartAddFloat);
        this.nPartAddFloat -= this.nPartAdd;

        if (this.nPartAdd > 0) {
            console.log(`spawn ${this.nPartAdd} particles`);
        }
    }
}

function Pipeline(fx: PartFx) {

    let emitter: Emitter;

    let elapsedTime: number;
    let elapsedTimeLevel: number;

    let spawnRoutine: IRunnable;

    let $startTime: number;
    let $elapsedTimeLevel: number;
    let $interval = null;

    function load(fx: PartFx) {
        emitter = new Emitter();
        play();
    }

    function stop() {
        clearInterval($interval);
        $interval = null;
        console.log('pipeline stopped');
    }

    function play() {
        elapsedTime = 0;
        elapsedTimeLevel = 0;
        spawnRoutine = prebuild(fx.spawnRoutine);

        $startTime = Date.now();
        $elapsedTimeLevel = 0;
        $interval = setInterval(() => {

            const nPart = spawnRoutine.run();
            emitter.spawn(nPart, elapsedTime);

            const dt = Date.now() - $startTime;
            elapsedTime = (dt - $elapsedTimeLevel) / 1000;
            elapsedTimeLevel = $elapsedTimeLevel / 1000;
            $elapsedTimeLevel = dt;
        },                      33);
    }

    function isStopped() {
        return $interval === null;
    }

    load(fx);

    return { stop, play, isStopped, emitter };
}


export default Pipeline;
