import { isNull } from "@lib/common";
import { EInstructionTypes, IExprInstruction, IIdInstruction } from "@lib/idl/IInstruction";
import { IFxPreset, IFxPresetProperty } from "@lib/idl/part/IPartFx";
import { DeclInstruction, IDeclInstructionSettings } from "../DeclInstruction";
import { Instruction } from "../Instruction";

export interface IPresetInstructionSettings extends IDeclInstructionSettings {
    id?: IIdInstruction;
    props: IFxPresetProperty[];
}

export class PresetInstruction extends DeclInstruction implements IFxPreset {
    protected _id: IIdInstruction;
    protected _props: IFxPresetProperty[];

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


    get props(): IFxPresetProperty[] {
        return this._props;
    }

    toCode(): string {
        return `${this.id} = {\n${this.props.map(prop => prop.toCode()).join(';\n')}\n}`;
    }
}

