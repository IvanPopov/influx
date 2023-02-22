import { EInstructionTypes, ICbufferInstruction, IIdInstruction, ITypeInstruction, IVariableTypeInstruction, IRegister } from "@lib/idl/IInstruction";

import { DeclInstruction, IDeclInstructionSettings } from "./DeclInstruction";
import { Instruction } from "./Instruction";
import { variable } from "../helpers";

export interface ICbufferDeclInstructionSettings extends IDeclInstructionSettings {
    id: IIdInstruction;
    type: ITypeInstruction;
}

export class CbufferInstruction extends DeclInstruction implements ICbufferInstruction {
    protected _id: IIdInstruction;
    protected _type: ITypeInstruction;

    constructor({ id, type, ...settings }: ICbufferDeclInstructionSettings) {
        super({ instrType: EInstructionTypes.k_CbufferDecl, ...settings });

        this._id = Instruction.$withParent(id, this);
        this._type = Instruction.$withParent(type, this);
    }

    get id(): IIdInstruction {
        return this._id;
    }

    get name(): string {
        return this.id.name;
    }

    get type(): ITypeInstruction {
        return this._type;
    }
}
