import { isNull } from "@lib/common";
import { EInstructionTypes, IIdInstruction, IPresetInstruction, IPresetPropertyInstruction } from "@lib/idl/IInstruction";
import { DeclInstruction, IDeclInstructionSettings } from "./DeclInstruction";
import { Instruction } from "./Instruction";

export interface IPresetInstructionSettings extends IDeclInstructionSettings {
    id?: IIdInstruction;
    props: IPresetPropertyInstruction[];
}

export class PresetInstruction extends DeclInstruction implements IPresetInstruction {
    protected _id: IIdInstruction;
    protected _props: IPresetPropertyInstruction[];

    constructor({ props, id = null, ...settings }: IPresetInstructionSettings) {
        super({ instrType: EInstructionTypes.k_PresetDecl, ...settings });
        this._id = Instruction.$withParent(id, this);
        this._props = props.map(prop => Instruction.$withParent(prop, this));
    }

    
    get id(): IIdInstruction { 
        return this._id; 
    }


    get name(): string {
        if (isNull(this._id)) {
            return null;
        }
        return this._id.name;
    }


    get props(): IPresetPropertyInstruction[] {
        return this._props;
    }

    toCode(): string {
        return `${this.id} = {\n${this.props.map(prop => prop.toCode()).join(';\n')}\n}`;
    }
}

