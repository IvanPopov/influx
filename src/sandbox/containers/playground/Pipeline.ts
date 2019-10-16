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
        run(input: Uint8Array = null) {
            bundle.input = input;
            return VM.play(bundle);
        }
    }
}


class Particle {
    static BYTE_SIZE = 9 * 4; // stride in bytes

    static POSITION_BYTE_OFFSET = 0;
    static COLOR_BYTE_OFFSET = 3 * 4;
    static ALPHA_BYTE_OFFSET = 6 * 4;
    static SIZE_BYTE_OFFSET = 7 * 4;
    static TIMELIFE_BYTE_OFFSET = 8 * 4;

    static POSITION_SIZE = 3;
    static COLOR_SIZE = 3;
    static ALPHA_SIZE = 1;
    static SIZE_SIZE = 1;
    static TIMELIFE_SIZE = 1;


    static decode(i: number, data: ArrayBuffer) {
        const byteOffset = i * Particle.BYTE_SIZE;
        const position = new Float32Array(data, byteOffset + Particle.POSITION_BYTE_OFFSET, Particle.POSITION_SIZE);
        const color = new Float32Array(data, byteOffset + Particle.COLOR_BYTE_OFFSET, Particle.COLOR_SIZE);
        const alpha = new Float32Array(data, byteOffset + Particle.ALPHA_BYTE_OFFSET, Particle.ALPHA_SIZE);
        const size = new Float32Array(data, byteOffset + Particle.SIZE_BYTE_OFFSET, Particle.SIZE_SIZE);
        const timelife = new Float32Array(data, byteOffset + Particle.TIMELIFE_BYTE_OFFSET, Particle.TIMELIFE_SIZE);

        return { position, color, alpha, size, timelife };
    }

    // position: { x: number; y: number; z: number };
    // color: { r: number; g: number; b: number };
    // alpha: number;
    // size: number;
    // timelife: number;
}


class Emitter {
    static CAPACITY = 1000;

    nPartAddFloat: number;
    nPartAdd: number;

    particles: ArrayBuffer;
    nPart: number;          // number of alive particles


    constructor() {
        this.nPartAdd = 0;
        this.nPartAddFloat = 0;
        this.nPart = 0;
        this.particles = new ArrayBuffer(Particle.BYTE_SIZE * Emitter.CAPACITY);
    }

    spawn(nPart: number, elapsedTime: number) {
        this.nPartAddFloat += nPart * elapsedTime;
        this.nPartAdd = Math.floor(this.nPartAddFloat);
        this.nPartAddFloat -= this.nPartAdd;

        if (this.nPartAdd > 0) {
            console.log(`spawn ${this.nPartAdd} particles`);
        }
    }

    getParticle(i: number) {
        // todo
    }

    init() {
        for (let i = this.nPart; i < this.nPart + this.nPartAdd; ++ i) {
            // this.particles[i];
        }
    }
}

function Pipeline(fx: PartFx) {

    let emitter: Emitter;

    let elapsedTime: number;
    let elapsedTimeLevel: number;

    let spawnRoutine: IRunnable;
    let initRoutine: IRunnable;
    let updateRoutine: IRunnable;

    let $startTime: number;
    let $elapsedTimeLevel: number;
    let $interval = null;

    function load() {
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
        initRoutine = prebuild(fx.initRoutine);
        updateRoutine = prebuild(fx.updateRoutine);

        $startTime = Date.now();
        $elapsedTimeLevel = 0;
        // todo: replace with requestAnimationFrame() ?
        $interval = setInterval(update, 33);
    }

    function update() {
        const nPart = spawnRoutine.run();
        emitter.spawn(nPart, elapsedTime);
        // todo

        const dt = Date.now() - $startTime;
        elapsedTime = (dt - $elapsedTimeLevel) / 1000;
        elapsedTimeLevel = $elapsedTimeLevel / 1000;
        $elapsedTimeLevel = dt;
    }

    function isStopped() {
        return $interval === null;
    }

    load();

    return { stop, play, isStopped, emitter };
}


export default Pipeline;
