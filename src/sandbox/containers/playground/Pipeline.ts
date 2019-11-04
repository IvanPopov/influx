/* tslint:disable:typedef */
/* tslint:disable:variable-name */

import { assert, isDef, isNull, verbose } from '@lib/common';
import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import { i32ToU8Array } from '@lib/fx/bytecode/common';
import * as VM from '@lib/fx/bytecode/VM';
import { ICompileExprInstruction, IFunctionDeclInstruction } from '@lib/idl/IInstruction';
import { EPartFxPassGeometry, IPartFxInstruction } from '@lib/idl/IPartFx';

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
    instanceByteLength: number;
    prerenderRoutine: IRunnable;
    sorting: boolean;
    geometry: EPartFxPassGeometry;
    vertexShader?: IFunctionDeclInstruction;
    pixelShader?: IFunctionDeclInstruction;
}


class Pass {
    private _owner: Emitter;
    private _prerenderRoutine: IRunnable;
    private _prerenderedParticles: Uint8Array;
    private _matByteLength: number;
    private _sorting: boolean;
    private _geometry: EPartFxPassGeometry;


    // tslint:disable-next-line:member-ordering
    readonly $vertexShader: IFunctionDeclInstruction;
    // tslint:disable-next-line:member-ordering
    readonly $pixelShader: IFunctionDeclInstruction;

    constructor(desc: IPassDesc, owner: Emitter) {
        this._owner = owner;
        this._prerenderRoutine = desc.prerenderRoutine;
        this._matByteLength = desc.instanceByteLength;
        this._prerenderedParticles = new Uint8Array(this._matByteLength * this._owner.capacity);
        this._sorting = desc.sorting;
        this._geometry = desc.geometry;

        this.$vertexShader = desc.vertexShader;
        this.$pixelShader = desc.pixelShader;
    }

    // number of float elements in the prerendered particle (f32)
    get stride(): number {
        assert(this._matByteLength / 4 === Math.floor(this._matByteLength / 4));
        return this._matByteLength / 4;
    }

    get data(): Uint8Array {
        return this._prerenderedParticles;
    }

    get length(): number {
        return this._owner.length;
    }

    get sorting(): boolean {
        return this._sorting;
    }

    get geometry(): EPartFxPassGeometry {
        return this._geometry;
    }

    prerender(constants: IPipelineConstants): void {
        this._prerenderRoutine.setPipelineConstants(constants);
        for (let i = 0; i < this._owner.length; ++i) {
            const partPtr = this._owner.getParticlePtr(i);
            const prerenderedPartPtr = this.getPrerenderedParticlePtr(i);
            this._prerenderRoutine.run(partPtr, prerenderedPartPtr);

            // const ptr = prerenderedPartPtr;
            // const f32View = new Float32Array(ptr.buffer, ptr.byteOffset, 8);
            // verbose(`prerender (${i}) => pos: [${f32View[0]}, ${f32View[1]}, ${f32View[2]}], color: [${f32View[3]}, ${f32View[4]}, ${f32View[5]}, ${f32View[6]}], size: ${f32View[7]}`);
        }
    }

    shadowReload({ prerenderRoutine, sorting }) {
        this._prerenderRoutine = prerenderRoutine;
        this._sorting = sorting;
    }

    private getPrerenderedParticlePtr(i: number) {
        assert(i >= 0 && i < this._owner.capacity);
        // return new Uint8Array(this.prerenderedParticles, i * this.matByteLength, this.matByteLength);
        return this._prerenderedParticles.subarray(i * this._matByteLength, (i + 1) * this._matByteLength);
    }
}

export class Emitter {
    private static TEMP_INT32 = new Uint8Array(4);

    private nPartAddFloat: number;
    private nPartAdd: number;
    private nPart: number;          // number of alive particles

    private particles: Uint8Array;

    private spawnRoutine: IRunnable;
    private initRoutine: IRunnable;
    private updateRoutine: IRunnable;
    private partByteLength: number;
    private passList: Pass[];


    constructor({ spawnRoutine, initRoutine, updateRoutine, partByteLength, capacity = -1, passList }) {

        if (capacity < 0) {
            capacity = 1024;
        }

        this.nPartAdd = 0;
        this.nPartAddFloat = 0;
        this.nPart = 0;
        this.particles = new Uint8Array(partByteLength * capacity);

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
        passList.forEach(({ prerenderRoutine, sorting, geometry }, i) => {
            this.passList[i].shadowReload({ prerenderRoutine, sorting });
        });
    }


    get capacity(): number {
        return this.particles.byteLength / this.partByteLength;
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
            const partId = Emitter.TEMP_INT32;
            partId.set(i32ToU8Array(i));

            this.initRoutine.run(ptr, partId);

            // const f32View = new Float32Array(ptr.buffer, ptr.byteOffset, 4);
            // verbose(`init (${i}) => pos: [${f32View[0]}, ${f32View[1]}, ${f32View[2]}], size: ${f32View[3]}`);
        }

        if (this.nPartAdd > 0) {
            // verbose(`spawn ${this.nPartAdd} particles`);
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
            const partId = Emitter.TEMP_INT32;
            partId.set(i32ToU8Array(i));

            if (!this.updateRoutine.run(currPtr, partId)) {
                // swap last particle with current in order to remove particle
                const lastPtr = this.getParticlePtr(this.nPart - 1);
                currPtr.set(lastPtr);
                this.nPart--;
            }

            // const f32View = new Float32Array(ptr.buffer, ptr.byteOffset, 4);
            // verbose(`update(${i}) => pos: [${f32View[0]}, ${f32View[1]}, ${f32View[2]}], size: ${f32View[3]}`);
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

    const constants: IPipelineConstants = {
        elapsedTime: 0,
        elapsedTimeLevel: 0
    };

    let $name: string = null;
    function name() {
        return $name;
    }

    function load(fx: PartFx) {
        const spawnRoutine = prebuild(fx.spawnRoutine);
        const initRoutine = prebuild(fx.initRoutine);
        const updateRoutine = prebuild(fx.updateRoutine);
        const partByteLength = fx.particle.size;
        const capacity = fx.capacity;
        const passList = fx.passList
            .filter(pass => pass.particleInstance != null)
            .map(({ particleInstance, prerenderRoutine, sorting, geometry, vertexShader, pixelShader }): IPassDesc => {
                return {
                    instanceByteLength: particleInstance.size,
                    prerenderRoutine: prebuild(prerenderRoutine),
                    sorting,
                    geometry,
                    vertexShader,
                    pixelShader
                };
            });

        if (isNull(emitter)) {
            emitter = new Emitter({ spawnRoutine, initRoutine, updateRoutine, partByteLength, passList, capacity });
            play();
        } else {
            emitter.shadowReload({ spawnRoutine, initRoutine, updateRoutine, passList });
            emitter.tick(constants);
        }

        $name = fx.name;
    }

    function stop() {
        clearInterval($interval);
        $interval = null;
        verbose('pipeline stopped');
    }

    function play() {
        constants.elapsedTime = 0;
        constants.elapsedTimeLevel = 0;

        $startTime = Date.now();
        $elapsedTimeLevel = 0;
        // TODO: replace with requestAnimationFrame() ?
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
    const fxHash = (fx: PartFx) => `${fx.particle.hash}:${fx.capacity}:${fx.passList
        .map(pass => `${pass.particleInstance.hash}:${pass.geometry}`)
        .reduce((commonHash, passHash) => `${commonHash}:${passHash}`)}`;

    // verbose(fxHash(fx));

    const isReplaceable = (fxNext: PartFx) => fxHash(fxNext) === fxHash(fx);

    function shadowReload(fxNext: PartFx): boolean {
        if (!isReplaceable(fxNext)) {
            return false;
        }

        verbose('pipeline reloaded from the shadow');
        load(fxNext);
        return true;
    }

    load(fx);

    return { stop, play, isStopped, emitter, shadowReload, name };
}


export default Pipeline;


export type IPipeline = ReturnType<typeof Pipeline>;
