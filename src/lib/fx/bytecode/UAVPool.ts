import { assert, isNull } from "@lib/common";
import { variable } from "@lib/fx/analisys/helpers";
import { EAddrType } from "@lib/idl/bytecode";
import { IVariableDeclInstruction } from "@lib/idl/IInstruction";

import { UAV_TOTAL, UAV0_REGISTER } from "./Bytecode";
import PromisedAddress from "./PromisedAddress";

export class UAVPool {
    private _knownUAVs: IVariableDeclInstruction[];

    constructor() {
        this._knownUAVs = Array(UAV_TOTAL).fill(null);
    }

    deref(decl: IVariableDeclInstruction): PromisedAddress {
        const knownUAVs = this._knownUAVs;

        assert(decl.type.isUAV());

        let { index, type } = variable.resolveRegister(decl);
        assert(type === 'u');

        const knownIndex = knownUAVs.indexOf(decl);

        if (index === -1 || knownIndex == -1) {
            index = knownUAVs.findIndex(decl => isNull(decl));
            assert(index !== -1, `uav limit is reached (uav total: ${UAV_TOTAL})`);
            knownUAVs[index] = decl;
        }

        assert(knownUAVs[index] === decl);
        assert(index !== -1);
        assert(index < UAV_TOTAL);

        const inputIndex = UAV0_REGISTER + index;
        const addr = 0;
        const size = decl.type.size;
        return new PromisedAddress({ type: EAddrType.k_Input, addr, size, inputIndex });
    }
}