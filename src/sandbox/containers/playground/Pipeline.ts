/* tslint:disable:typedef */

import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import * as VM from '@lib/fx/bytecode/VM';
import { ICompileExprInstruction } from '@lib/idl/IInstruction';
import { IPartFxInstruction } from '@lib/idl/IPartFx';
import { assert } from '@lib/common';

type PartFx = IPartFxInstruction;

interface IRunnable {
    run(input?: Uint8Array): VM.INT32;
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


interface IPassDesc {
    matByteLength: number;
    prerenderRoutine: IRunnable;
}


class Pass {
    private owner: Emitter;
    private prerenderRoutine: IRunnable;
    private prerenderedParticles: ArrayBuffer;
    private matByteLength: number;

    constructor(desc: IPassDesc, owner: Emitter) {
        this.owner = owner;
        this.prerenderRoutine = desc.prerenderRoutine;
        this.matByteLength = desc.matByteLength;
        this.prerenderedParticles = new ArrayBuffer(this.matByteLength * this.owner.capacity);
    }

    // number of float elements in the prerendered particle (f32)
    get stride(): number {
        assert(this.matByteLength / 4 === Math.floor(this.matByteLength / 4));
        return this.matByteLength / 4;
    }

    get data(): Uint8Array {
        return new Uint8Array(this.prerenderedParticles, 0, this.owner.capacity);
    }

    get length(): number {
        return this.owner.length;
    }

    prerender(): void {
        for (let i = 0; i < this.owner.length; ++i) {
            const ptr = this.getPrerenderedParticlePtr(i);
            this.prerenderRoutine.run(ptr);
        }
    }

    private getPrerenderedParticlePtr(i: number) {
        assert(i >= 0 && i < this.owner.capacity);
        return new Uint8Array(this.prerenderedParticles, i * this.matByteLength, this.matByteLength);
    }
}

export class Emitter {
    static CAPACITY = 50;

    private nPartAddFloat: number;
    private nPartAdd: number;
    private nPart: number;          // number of alive particles

    private particles: ArrayBuffer;

    private spawnRoutine: IRunnable;
    private initRoutine: IRunnable;
    private updateRoutine: IRunnable;
    private partByteLength: number;
    private passList: Pass[];

    constructor({ spawnRoutine, initRoutine, updateRoutine, partByteLength, passList }) {
        this.nPartAdd = 0;
        this.nPartAddFloat = 0;
        this.nPart = 0;
        this.particles = new ArrayBuffer(partByteLength * this.capacity);

        this.partByteLength = partByteLength;
        this.initRoutine = initRoutine;
        this.spawnRoutine = spawnRoutine;
        this.updateRoutine = updateRoutine;

        this.passList = passList.map(desc => new Pass(desc, this));
    }


    get capacity(): number {
        return Emitter.CAPACITY;
    }

    get length(): number {
        return this.nPart;
    }

    get passes(): Pass[] {
        return this.passList;
    }

    tick(elapsedTime: number) {
        this.update(elapsedTime);
        this.spawn(elapsedTime);
        this.prerender();
    }


    private spawn(elapsedTime: number) {
        const nSpawn = this.spawnRoutine.run();

        this.nPartAddFloat += nSpawn * elapsedTime;
        this.nPartAdd = Math.floor(this.nPartAddFloat);
        this.nPartAddFloat -= this.nPartAdd;

        this.nPartAdd = Math.min(this.nPartAdd, this.capacity - this.nPart);

        for (let i = this.nPart; i < this.nPart + this.nPartAdd; ++i) {
            const ptr = this.getParticlePtr(i);
            this.initRoutine.run(ptr);
        }

        if (this.nPartAdd > 0) {
            console.log(`spawn ${this.nPartAdd} particles`);
            this.nPart += this.nPartAdd;
        }

        if (this.nPart === this.capacity) {
            console.warn('capacity is reached.');
        }
    }

    private init() {
        for (let i = 0; i < this.nPart; ++i) {
            const ptr = this.getParticlePtr(i);
            this.initRoutine.run(ptr);
        }
    }


    private update(elapsedTime: number) {
        for (let i = 0; i < this.nPart; ++i) {
            const ptr = this.getParticlePtr(i);
            this.updateRoutine.run(ptr);
        }
    }

    private prerender() {
        this.passList.forEach((pass) => {
            pass.prerender();
        });
    }

    private getParticlePtr(i: number): Uint8Array {
        assert(i >= 0 && i < this.capacity);
        return new Uint8Array(this.particles, i * this.partByteLength, this.partByteLength);
    }
}

function Pipeline(fx: PartFx) {

    let emitter: Emitter;

    let elapsedTime: number;
    let elapsedTimeLevel: number;

    let $startTime: number;
    let $elapsedTimeLevel: number;
    let $interval = null;

    function load() {

        const spawnRoutine = prebuild(fx.spawnRoutine);
        const initRoutine = prebuild(fx.initRoutine);
        const updateRoutine = prebuild(fx.updateRoutine);
        const partByteLength = fx.particle.size;
        const passList: IPassDesc[] = fx.passList.map(pass => {
            return {
                matByteLength: pass.material.size,
                prerenderRoutine: prebuild(pass.prerenderRoutine)
            };
        });

        emitter = new Emitter({ spawnRoutine, initRoutine, updateRoutine, partByteLength, passList });

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

        $startTime = Date.now();
        $elapsedTimeLevel = 0;
        // todo: replace with requestAnimationFrame() ?
        $interval = setInterval(update, 33);
    }

    function update() {
        emitter.tick(elapsedTime);

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
