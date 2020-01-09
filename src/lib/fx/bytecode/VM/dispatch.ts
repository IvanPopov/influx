import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import * as VM from '@lib/fx/bytecode/VM';

// uint3 Gid: SV_GroupID    
const Gid = new Int32Array([0, 0, 0]);
// uint GI: SV_GroupIndex
const Gi = new Int32Array([0]);
// uint3 GTid: SV_GroupThreadID
const GTid = new Int32Array([0, 0, 0]);
// uint3 DTid: SV_DispatchThreadID
const DTid = new Int32Array([0, 0, 0]);


function dispatch(bundle: VM.Bundle, numgroups: number[], numthreads: number[] = [1, 1, 1]) {
    const [nGroupX, nGroupY, nGroupZ] = numgroups;
    const [nThreadX, nThreadY, nThreadZ] = numthreads;

    // TODO: get order from bundle
    const SV_GroupID = Bytecode.INPUT0_REGISTER + 0;
    const SV_GroupIndex = Bytecode.INPUT0_REGISTER + 1;
    const SV_GroupThreadID = Bytecode.INPUT0_REGISTER + 2;
    const SV_DispatchThreadID = Bytecode.INPUT0_REGISTER + 3;

    bundle.input[SV_GroupID] = Gid;
    bundle.input[SV_GroupIndex] = Gi;
    bundle.input[SV_GroupThreadID] = GTid;
    bundle.input[SV_DispatchThreadID] = DTid;

    for (let iGroupZ = 0; iGroupZ < nGroupZ; ++iGroupZ) {
        for (let iGroupY = 0; iGroupY < nGroupY; ++iGroupY) {
            for (let iGroupX = 0; iGroupX < nGroupX; ++iGroupX) {
                Gid[0] = iGroupX;
                Gid[1] = iGroupY;
                Gid[2] = iGroupZ;

                for (let iThreadZ = 0; iThreadZ < nThreadZ; ++iThreadZ) {
                    for (let iThreadY = 0; iThreadY < nThreadY; ++iThreadY) {
                        for (let iThreadX = 0; iThreadX < nThreadX; ++iThreadX) {
                            GTid[0] = iThreadX;
                            GTid[1] = iThreadY;
                            GTid[2] = iThreadZ;

                            DTid[0] = iGroupX * nThreadX + iThreadX;
                            DTid[1] = iGroupY * nThreadY + iThreadY;
                            DTid[2] = iGroupZ * nThreadZ + iThreadZ;

                            Gi[0] = iThreadZ * nThreadX * nThreadY + iThreadY * nThreadX + iThreadX;

                            VM.play(bundle);
                        }
                    }
                }
            }
        }
    }
}

export default dispatch;