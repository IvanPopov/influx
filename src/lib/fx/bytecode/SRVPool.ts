import { assert, isNull } from "@lib/common";
import { variable, types } from "@lib/fx/analisys/helpers";
import { EAddrType } from "@lib/idl/bytecode";
import { IVariableDeclInstruction } from "@lib/idl/IInstruction";
import * as SystemScope from '@lib/fx/analisys/SystemScope';

import { SRV_TOTAL, SRV0_REGISTER } from "./Bytecode";
import PromisedAddress from "./PromisedAddress";

export class SRVPool {
    private _knownSRVs: IVariableDeclInstruction[];

    constructor() {
        this._knownSRVs = Array(SRV_TOTAL).fill(null);
    }

    deref(decl: IVariableDeclInstruction): PromisedAddress {
        const knownSRVs = this._knownSRVs;

        assert(!decl.type.isNotBaseArray());
        assert(SystemScope.isBuffer(decl.type) || SystemScope.isTexture(decl.type));

        let { index, type } = SystemScope.resolveRegister(decl);
        assert(type === 't');

        const knownIndex = knownSRVs.indexOf(decl);
        assert(knownIndex === -1 || knownIndex === index);

        if (index === -1) {
            index = knownSRVs.findIndex(decl => isNull(decl));
            assert(index !== -1, `uav limit is reached (uav total: ${SRV_TOTAL})`);
            knownSRVs[index] = decl;
        }

        knownSRVs[index] = decl;

        assert(index !== -1);
        assert(index < SRV_TOTAL);

        const inputIndex = SRV0_REGISTER + index;
        const addr = 0;
        // NOTE: UAV's size is unknown in advance
        // so we use maximum aligned int as possible
        return new PromisedAddress({ type: EAddrType.k_Input, addr, size: 1 << 30, inputIndex });
    }
}