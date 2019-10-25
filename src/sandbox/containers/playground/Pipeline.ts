/* tslint:disable:typedef */

import { assert, isNull, isDef } from '@lib/common';
import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import * as VM from '@lib/fx/bytecode/VM';
import { ICompileExprInstruction } from '@lib/idl/IInstruction';
import { IPartFxInstruction } from '@lib/idl/IPartFx';

type PartFx = IPartFxInstruction;

interface IRunnable {
    run(...input: Uint8Array[]): VM.INT32;
    setConstant(name: string, type: 'float32' | 'int32', value: number | Uint8Array): boolean;
    setPipelineConstants(constants: IPipelineConstants): IRunnable;
}

interface IPipelineConstants {
    elapsedTime: number;
    elapsedTimeLevel: number;
}


function prebuild(expr: ICompileExprInstruction): IRunnable {
    const program = Bytecode.translate(expr.function);
    const code = program.code;
    const bundle = VM.load(code);
    return {
        run(...input: Uint8Array[]) {
            return VM.play({ ...bundle, input });
        },

        setConstant(name: string, type: 'float32' | 'int32', value: number | Uint8Array): boolean {
            const layout = bundle.layout;
            const offset = layout[name];
            const constants = bundle.constants;

            if (!isDef(offset)) {
                return false;
            }

            // TODO: validate layout / constant type in memory / size
            switch (type) {
                case 'float32':
                    (new DataView(constants.buffer, constants.byteOffset + offset)).setFloat32(0, <number>value, true);
                    break;
                case 'int32':
                    (new DataView(constants.buffer, constants.byteOffset + offset)).setInt32(0, <number>value);
                    break;
                default:
                    assert(false, 'unsupported');
            }

            return true;
        },

        setPipelineConstants(constants: IPipelineConstants): IRunnable {
            this.setConstant('elapsedTime', 'float32', constants.elapsedTime);
            this.setConstant('elapsedTimeLevel', 'float32', constants.elapsedTimeLevel);
            return this;
        }
    };
}


interface IPassDesc {
    matByteLength: number;
    prerenderRoutine: IRunnable;
}


class Pass {
    private owner: Emitter;
    private prerenderRoutine: IRunnable;
    private prerenderedParticles: Uint8Array;
    private matByteLength: number;

    constructor(desc: IPassDesc, owner: Emitter) {
        this.owner = owner;
        this.prerenderRoutine = desc.prerenderRoutine;
        this.matByteLength = desc.matByteLength;
        this.prerenderedParticles = new Uint8Array(this.matByteLength * this.owner.capacity);
    }

    // number of float elements in the prerendered particle (f32)
    get stride(): number {
        assert(this.matByteLength / 4 === Math.floor(this.matByteLength / 4));
        return this.matByteLength / 4;
    }

    get data(): Uint8Array {
        return this.prerenderedParticles;
    }

    get length(): number {
        return this.owner.length;
    }

    prerender(constants: IPipelineConstants): void {
        this.prerenderRoutine.setPipelineConstants(constants);
        for (let i = 0; i < this.owner.length; ++i) {
            const partPtr = this.owner.getParticlePtr(i);
            const prerenderedPartPtr = this.getPrerenderedParticlePtr(i);
            this.prerenderRoutine.run(partPtr, prerenderedPartPtr);

            // const ptr = prerenderedPartPtr;
            // const f32View = new Float32Array(ptr.buffer, ptr.byteOffset, 8);
            // console.log(`prerender (${i}) => pos: [${f32View[0]}, ${f32View[1]}, ${f32View[2]}], color: [${f32View[3]}, ${f32View[4]}, ${f32View[5]}, ${f32View[6]}], size: ${f32View[7]}`);
        }
    }

    shadowReload({ prerenderRoutine }) {
        this.prerenderRoutine = prerenderRoutine;
    }

    private getPrerenderedParticlePtr(i: number) {
        assert(i >= 0 && i < this.owner.capacity);
        // return new Uint8Array(this.prerenderedParticles, i * this.matByteLength, this.matByteLength);
        return this.prerenderedParticles.subarray(i * this.matByteLength, (i + 1) * this.matByteLength);
    }
}

export class Emitter {
    // todo: load capacity from PartFx
    static CAPACITY = 1000;

    private nPartAddFloat: number;
    private nPartAdd: number;
    private nPart: number;          // number of alive particles

    private particles: Uint8Array;

    private spawnRoutine: IRunnable;
    private initRoutine: IRunnable;
    private updateRoutine: IRunnable;
    private partByteLength: number;
    private passList: Pass[];

    constructor({ spawnRoutine, initRoutine, updateRoutine, partByteLength, passList }) {
        this.nPartAdd = 0;
        this.nPartAddFloat = 0;
        this.nPart = 0;
        this.particles = new Uint8Array(partByteLength * this.capacity);

        this.partByteLength = partByteLength;
        this.initRoutine = initRoutine;
        this.spawnRoutine = spawnRoutine;
        this.updateRoutine = updateRoutine;

        this.passList = passList.map((desc: IPassDesc) => new Pass(desc, this));
    }


    shadowReload({ spawnRoutine, initRoutine, updateRoutine, passList }) {
        this.initRoutine = initRoutine;
        this.spawnRoutine = spawnRoutine;
        this.updateRoutine = updateRoutine;
        passList.forEach((desc: IPassDesc, i: number) => {
            const prerenderRoutine = desc.prerenderRoutine;
            this.passList[i].shadowReload({ prerenderRoutine });
        });
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


    getParticlePtr(i: number): Uint8Array {
        assert(i >= 0 && i < this.capacity);
        return this.particles.subarray(i * this.partByteLength, (i + 1) * this.partByteLength);
        // return new Uint8Array(this.particles, i * this.partByteLength, this.partByteLength);
    }

    tick(constants: IPipelineConstants) {
        this.update(constants);
        this.spawn(constants);
        this.prerender(constants);
    }


    private spawn(constants: IPipelineConstants) {
        const nSpawn = this.spawnRoutine.run();

        this.nPartAddFloat += nSpawn * constants.elapsedTime;
        this.nPartAdd = Math.floor(this.nPartAddFloat);
        this.nPartAddFloat -= this.nPartAdd;

        this.nPartAdd = Math.min(this.nPartAdd, this.capacity - this.nPart);

        this.initRoutine.setPipelineConstants(constants);
        for (let i = this.nPart; i < this.nPart + this.nPartAdd; ++i) {
            const ptr = this.getParticlePtr(i);
            this.initRoutine.run(ptr);

            // const f32View = new Float32Array(ptr.buffer, ptr.byteOffset, 4);
            // console.log(`init (${i}) => pos: [${f32View[0]}, ${f32View[1]}, ${f32View[2]}], size: ${f32View[3]}`);
        }

        if (this.nPartAdd > 0) {
            // console.log(`spawn ${this.nPartAdd} particles`);
            this.nPart += this.nPartAdd;
        }

        if (this.nPart === this.capacity) {
            console.warn('capacity is reached.');
        }
    }


    private update(constants: IPipelineConstants) {
        this.updateRoutine.setPipelineConstants(constants);
        for (let i = 0; i < this.nPart; ++i) {
            const currPtr = this.getParticlePtr(i);
            if (!this.updateRoutine.run(currPtr)) {
                // swap last particle with current in order to remove particle
                let lastPtr = this.getParticlePtr(this.nPart - 1);
                currPtr.set(lastPtr);
                this.nPart--;
            }

            // const f32View = new Float32Array(ptr.buffer, ptr.byteOffset, 4);
            // console.log(`update(${i}) => pos: [${f32View[0]}, ${f32View[1]}, ${f32View[2]}], size: ${f32View[3]}`);
        }
    }

    private prerender(constants: IPipelineConstants) {
        this.passList.forEach((pass) => {
            pass.prerender(constants);
        });
    }
}



function Pipeline(fx: PartFx) {

    let emitter: Emitter = null;

    let $startTime: number;
    let $elapsedTimeLevel: number;
    let $interval = null;

    let constants: IPipelineConstants = {
        elapsedTime: 0,
        elapsedTimeLevel: 0
    };

    function load(fx: PartFx) {

        const spawnRoutine = prebuild(fx.spawnRoutine);
        const initRoutine = prebuild(fx.initRoutine);
        const updateRoutine = prebuild(fx.updateRoutine);
        const partByteLength = fx.particle.size;
        const passList: IPassDesc[] = fx.passList.filter(pass => pass.material != null).map(pass => {
            return {
                matByteLength: pass.material.size,
                prerenderRoutine: prebuild(pass.prerenderRoutine)
            };
        });

        if (isNull(emitter)) {
            emitter = new Emitter({ spawnRoutine, initRoutine, updateRoutine, partByteLength, passList });
            play();
        } else {
            emitter.shadowReload({ spawnRoutine, initRoutine, updateRoutine, passList });
        }
    }

    function stop() {
        clearInterval($interval);
        $interval = null;
        console.log('pipeline stopped');
    }

    function play() {
        constants.elapsedTime = 0.0;
        constants.elapsedTimeLevel = 0.0;

        $startTime = Date.now();
        $elapsedTimeLevel = 0;
        // todo: replace with requestAnimationFrame() ?
        $interval = setInterval(update, 33);
    }

    function update() {
        emitter.tick(constants);


        const dt = Date.now() - $startTime;
        constants.elapsedTime = (dt - $elapsedTimeLevel) / 1000;
        constants.elapsedTimeLevel = $elapsedTimeLevel / 1000;
        $elapsedTimeLevel = dt;
    }

    function isStopped() {
        return $interval === null;
    }

    // todo: check capacity
    const fxHash = (fx: PartFx) => `${fx.particle.hash}:${fx.passList
        .map(pass => pass.material.hash)
        .reduce((commonHash, passHash) => `${commonHash}:${passHash}`)}`;

    // console.log(fxHash(fx));

    const isReplaceable = (fxNext: PartFx) => fxHash(fxNext) === fxHash(fx);

    function shadowReload(fxNext: PartFx): boolean {
        if (!isReplaceable(fxNext)) {
            return false;
        }

        console.log('pipeline reloaded from the shadow');
        load(fxNext);
        return true;
    }

    load(fx);

    return { stop, play, isStopped, emitter, shadowReload };
}


export default Pipeline;
