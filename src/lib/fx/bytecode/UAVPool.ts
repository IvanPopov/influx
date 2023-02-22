import { assert, isNull } from "@lib/common";
import { variable, types } from "@lib/fx/analisys/helpers";
import { EAddrType } from "@lib/idl/bytecode";
import { IVariableDeclInstruction } from "@lib/idl/IInstruction";
import * as SystemScope from '@lib/fx/analisys/SystemScope';
import { UAV_TOTAL, UAV0_REGISTER } from "./Bytecode";
import PromisedAddress from "./PromisedAddress";

export class UAVPool {
    private _knownUAVs: IVariableDeclInstruction[];

    constructor() {
        this._knownUAVs = Array(UAV_TOTAL).fill(null);
    }

    deref(decl: IVariableDeclInstruction): PromisedAddress {
        const knownUAVs = this._knownUAVs;

        assert(!decl.type.isNotBaseArray());
        assert(SystemScope.isUAV(decl.type));

        let { index, type } = SystemScope.resolveRegister(decl);
        assert(type === 'u');

        const knownIndex = knownUAVs.indexOf(decl);
        assert(knownIndex === -1 || knownIndex === index);

        if (index === -1) {
            index = knownUAVs.findIndex(decl => isNull(decl));
            assert(index !== -1, `uav limit is reached (uav total: ${UAV_TOTAL})`);
            knownUAVs[index] = decl;
        }

        knownUAVs[index] = decl;

        assert(index !== -1);
        assert(index < UAV_TOTAL);

        const inputIndex = UAV0_REGISTER + index;
        const addr = 0;
        // NOTE: UAV's size is unknown in advance
        // so we use maximum aligned int as possible
        return new PromisedAddress({ type: EAddrType.k_Input, addr, size: 1 << 30, inputIndex });
    }
}