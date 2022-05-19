/* tslint:disable:typedef */
/* tslint:disable:variable-name */
/* tslint:disable:member-ordering */

import { assert, isDef, isNull, verbose } from '@lib/common';
import { type } from '@lib/fx/analisys/helpers';
import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import { i32ToU8Array, u8ArrayAsI32 } from '@lib/fx/bytecode/common';
import * as VM from '@lib/fx/bytecode/VM';
import * as Glsl from '@lib/fx/translators/GlslEmitter';
import { ICompileExprInstruction, ITypeInstruction } from '@lib/idl/IInstruction';
import { EPartFxPassGeometry, IPartFxInstruction } from '@lib/idl/part/IPartFx';
import * as THREE from 'three';
import { IPass, IEmitter } from './IEmitter';

type PartFx = IPartFxInstruction;

interface IRunnable {
    run(...input: Uint8Array[]): Uint8Array;
    setPipelineConstants(constants: IEmitterConstants): IRunnable;
}

interface IEmitterConstants {
    elapsedTime: number;
    elapsedTimeLevel: number;
}


function prebuild(expr: ICompileExprInstruction): IRunnable {
    const program = Bytecode.translate(expr.function);
    const code = program.code;
    const bundle = VM.load(code);
    return {
        run(...inputs: Uint8Array[]) {
            return VM.play(bundle, inputs.map(input => new Int32Array(input.buffer, input.byteOffset, input.byteLength >> 2)));
        },

        setPipelineConstants(constants: IEmitterConstants): IRunnable {
            VM.setConstant(bundle, 'elapsedTime', constants.elapsedTime);
            VM.setConstant(bundle, 'elapsedTimeLevel', constants.elapsedTimeLevel);
            return this;
        }
    };
}

function fxHash(fx: PartFx) {

    const hashPart = fx.passList
        .map(pass => `${type.signature(pass.particleInstance)}:${pass.geometry}:${pass.sorting}:`) // +
        // `${crc32(Code.translate(pass.vertexShader))}:${crc32(Code.translate(pass.pixelShader))}`)
        .reduce((commonHash, passHash) => `${commonHash}:${passHash}`);
    return `${type.signature(fx.particle)}:${fx.capacity}:${hashPart}`;
}



interface IPassDesc {
    instance: ITypeInstruction;
    prerenderRoutine: IRunnable;
    sorting: boolean;
    geometry: EPartFxPassGeometry;
    vertexShader?: string;
    pixelShader?: string;
    instanceCount: number;
}

const TEMP_INT32 = new Uint8Array(4);
const TEMP_INT32_ARRAY = Array(10)
    .fill(null)
    .map(x => new Uint8Array(4));

export class Pass implements IPass {
    private _owner: Emitter;
    private _prerenderRoutine: IRunnable;
    private _prerenderedParticles: Uint8Array[];
    private _instance: ITypeInstruction;
    private _instanceCount: number;
    private _sorting: boolean;
    private _geometry: EPartFxPassGeometry;
    private _vertexShader: string;
    private _pixelShader: string;

    constructor(desc: IPassDesc, owner: Emitter) {
        this._owner = owner;
        this._prerenderRoutine = desc.prerenderRoutine;
        this._instance = desc.instance;
        this._prerenderedParticles = Array(2)
            .fill(null)
            .map(i => new Uint8Array(desc.instance.size * desc.instanceCount * this._owner.capacity));
        this._sorting = desc.sorting;
        this._geometry = desc.geometry;
        this._instanceCount = desc.instanceCount;

        this._vertexShader = desc.vertexShader;
        this._pixelShader = desc.pixelShader;
    }

    get instanceLayout() {
        return this._instance.fields.map(field => {
            const size = field.type.size >> 2;
            const offset = field.type.padding >> 2;
            const attrName = Glsl.GlslEmitter.$declToAttributeName(field);
            return { attrName, size, offset };
        });
    }


    get geometry(): EPartFxPassGeometry {
        return this._geometry;
    }

    get vertexShader(): string {
        return this._vertexShader;
    }

    get pixelShader(): string {
        return this._pixelShader;
    }

    // number of float elements in the prerendered particle (src)
    get stride(): number {
        assert(this._instance.size / 4 === Math.floor(this._instance.size / 4));
        return this._instance.size / 4;
    }

    get data(): Uint8Array {
        return this._prerenderedParticles[this.sorting ? 1 : 0];
    }

    length(): number {
        return this._owner.length() * this._instanceCount;
    }

    capacity(): number {
        return this._owner.capacity * this._instanceCount;
    }

    get sorting(): boolean {
        return this._sorting;
    }

    requiresDefaultMaterial(): boolean {
        return !this.vertexShader || !this.pixelShader;
    }

    prerender(constants: IEmitterConstants): void {
        this._prerenderRoutine.setPipelineConstants(constants);
        const len = this._owner.length();
        const ic = this._instanceCount;

        assert(ic < TEMP_INT32_ARRAY.length);
        for (let iInstance = 0; iInstance < ic; ++iInstance) {
            TEMP_INT32_ARRAY[iInstance].set(i32ToU8Array(iInstance));
        }

        for (let iPart = 0; iPart < len; ++iPart) {
            for (let iInstance = 0; iInstance < ic; ++iInstance) {
                const partPtr = this._owner.getParticlePtr(iPart);
                const prerenderedPartPtr = this.getPrerenderedParticlePtr(iPart * ic + iInstance);
                const instanceId = TEMP_INT32_ARRAY[iInstance];
                this._prerenderRoutine.run(partPtr, prerenderedPartPtr, instanceId);
                // if (iPart === 0) {
                //     const ptr = prerenderedPartPtr;
                //     const f32View = new Float32Array(ptr.buffer, ptr.byteOffset, 8);
                //     verbose(`prerender ${iInstance} (${iPart}) => pos: [${f32View[0]}, ${f32View[1]}, 
                //     ${f32View[2]}], color: [${f32View[3]}, ${f32View[4]}, ${f32View[5]}, ${f32View[6]}]`);
                // }
            }
        }
    }

    sort(targetPos: THREE.Vector3) {
        assert(this.sorting);

        // NOTE: yes, I understand this is a crappy and stupid brute force sorting,
        //       I hate javascript for that :/

        const v3 = new THREE.Vector3();

        const length = this._owner.length();
        const capacity = this._owner.capacity;
        const instanceCount = this._instanceCount;

        const nStride = this.stride * instanceCount; // stride in floats

        const src = new Float32Array(this._prerenderedParticles[0].buffer, 0, nStride * capacity);
        const dst = new Float32Array(this._prerenderedParticles[1].buffer, 0, nStride * capacity);

        const indicies = [];

        // NOTE: sort using only first instance's postion
        for (let iPart = 0; iPart < length; ++iPart) {
            const offset = iPart * nStride;
            const dist = v3
                .fromArray(src, offset/* add offset of POSTION semantic */)
                .distanceTo(targetPos);
            indicies.push([iPart, dist]);
        }

        indicies.sort((a, b) => -a[1] + b[1]);

        for (let i = 0; i < indicies.length; ++i) {
            const iFrom = indicies[i][0] * nStride;
            const iTo = i * nStride;

            const from = src.subarray(iFrom, iFrom + nStride);
            const copyTo = dst.subarray(iTo, iTo + nStride);
            copyTo.set(from);
        }
    }


    shadowReload({ prerenderRoutine, sorting, vertexShader, pixelShader }) {
        this._prerenderRoutine = prerenderRoutine;
        this._sorting = sorting;
        this._vertexShader = vertexShader;
        this._pixelShader = pixelShader;
    }

    private getPrerenderedParticlePtr(i: number) {
        assert(i >= 0 && i < this._owner.capacity * this._instanceCount);
        // return new Uint8Array(this.prerenderedParticles, i * this.matByteLength, this.matByteLength);
        return this._prerenderedParticles[0].subarray(i * this._instance.size, (i + 1) * this._instance.size);
    }
}

class Emitter implements IEmitter {
    private startTime: number;
    private elapsedTimeLevel: number;
    private active: boolean;

    private constants: IEmitterConstants = {
        elapsedTime: 0,
        elapsedTimeLevel: 0
    };

    //
    //
    //

    private fx: IPartFxInstruction;

    //
    //
    //

    private nPartAddFloat: number;
    private nPartAdd: number;
    private nPart: number;          // number of alive particles

    private particles: Uint8Array;

    private spawnRoutine: IRunnable;
    private initRoutine: IRunnable;
    private updateRoutine: IRunnable;
    private partByteLength: number;
    private passList: Pass[];


    constructor(fx: IPartFxInstruction) {
        let capacity = fx.capacity;

        const { spawnRoutine, initRoutine, updateRoutine, partByteLength, passList } = Emitter.rebuild(fx);

        if (capacity < 0) {
            capacity = 1024;
        }

        this.fx = fx;
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


    get name(): string {
        return this.fx.name;
    }


    private static rebuild(fx: IPartFxInstruction) {
        const spawnRoutine = prebuild(fx.spawnRoutine);
        const initRoutine = prebuild(fx.initRoutine);
        const updateRoutine = prebuild(fx.updateRoutine);
        const partByteLength = fx.particle.size;
        const passList = fx.passList
            .filter(pass => pass.particleInstance != null)
            .map(({ particleInstance, prerenderRoutine, sorting, geometry, vertexShader, pixelShader, instanceCount }): IPassDesc => {
                return {
                    instance: particleInstance,
                    prerenderRoutine: prebuild(prerenderRoutine),
                    sorting,
                    geometry,
                    instanceCount,
                    vertexShader: Glsl.translate(vertexShader, { mode: 'vertex' }),
                    pixelShader: Glsl.translate(pixelShader, { mode: 'pixel' })
                };
            });
        return { spawnRoutine, initRoutine, updateRoutine, partByteLength, passList };
    }


    private isReplaceable(fxNext: PartFx) {
        const left = fxHash(fxNext);
        const right = fxHash(this.fx);
        return left === right;
    }

    async shadowReload(fxNext: IPartFxInstruction): Promise<boolean> {
        if (!this.isReplaceable(fxNext)) {
            return false;
        }

        verbose('emitter reloaded from the shadow');
        const { spawnRoutine, initRoutine, updateRoutine, partByteLength, passList } = Emitter.rebuild(fxNext);

        this.fx = fxNext;
        this.initRoutine = initRoutine;
        this.spawnRoutine = spawnRoutine;
        this.updateRoutine = updateRoutine;
        passList.forEach(({ prerenderRoutine, sorting, vertexShader, pixelShader }, i) => {
            this.passList[i].shadowReload({ prerenderRoutine, sorting, vertexShader, pixelShader });
        });
        this.tick(true);
        return true;
    }


    get capacity(): number {
        return this.particles.byteLength / this.partByteLength;
    }

    length(): number {
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

    private tickInternal(constants: IEmitterConstants) {
        this.update(constants);
        this.spawn(constants);
        this.prerender(constants);
    }


    private spawn(constants: IEmitterConstants) {
        const nSpawn = u8ArrayAsI32(this.spawnRoutine.run());

        this.nPartAddFloat += nSpawn * constants.elapsedTime;
        this.nPartAdd = Math.floor(this.nPartAddFloat);
        this.nPartAddFloat -= this.nPartAdd;

        this.nPartAdd = Math.min(this.nPartAdd, this.capacity - this.nPart);

        this.initRoutine.setPipelineConstants(constants);
        for (let i = this.nPart; i < this.nPart + this.nPartAdd; ++i) {
            const ptr = this.getParticlePtr(i);
            const partId = TEMP_INT32;
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


    private update(constants: IEmitterConstants) {
        this.updateRoutine.setPipelineConstants(constants);
        for (let i = 0; i < this.nPart; ++i) {
            const currPtr = this.getParticlePtr(i);
            const partId = TEMP_INT32;
            partId.set(i32ToU8Array(i));

            if (u8ArrayAsI32(this.updateRoutine.run(currPtr, partId)) === 0) {
                // swap last particle with current in order to remove particle
                const lastPtr = this.getParticlePtr(this.nPart - 1);
                currPtr.set(lastPtr);
                this.nPart--;
            }
        }
    }

    private prerender(constants: IEmitterConstants) {
        this.passList.forEach((pass) => {
            pass.prerender(constants);
        });
    }


    stop() {
        this.active = false;
        verbose('emitter stopped');
    }

    start() {
        this.constants.elapsedTime = 0;
        this.constants.elapsedTimeLevel = 0;

        this.startTime = Date.now();
        this.elapsedTimeLevel = 0;
        this.active = true;
        // TODO: replace with requestAnimationFrame() ?
        // $interval = setInterval(update, 33);
    }

    tick(force: boolean = false) {
        if (!this.active && !force) {
            return;
        }

        this.tickInternal(this.constants);
        const dt = Date.now() - this.startTime;
        this.constants.elapsedTime = (dt - this.elapsedTimeLevel) / 1000;
        this.constants.elapsedTimeLevel = this.elapsedTimeLevel / 1000;
        this.elapsedTimeLevel = dt;
    }

    isStopped() {
        // return $interval === null;
        return !this.active;
    }

    reset(): void {
        // NOT implemented
    } 

    dump(): void {} 
}


export async function createEmitter(fx: IPartFxInstruction): Promise<IEmitter> {
    return new Emitter(fx);
}