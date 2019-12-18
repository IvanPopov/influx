import { isNull } from "@lib/common";
import { DeclInstruction, IDeclInstructionSettings } from "@lib/fx/analisys/instructions/DeclInstruction";
import { Instruction } from "@lib/fx/analisys/instructions/Instruction";
import * as SystemScope from "@lib/fx/analisys/SystemScope";
import { EInstructionTypes, IFunctionDefInstruction, IIdInstruction, IVariableDeclInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";

export interface IFunctionDefInstructionSettings extends IDeclInstructionSettings {
    returnType: IVariableTypeInstruction;
    id: IIdInstruction;
    paramList?: IVariableDeclInstruction[];
}

/**
 * Represent type func(...args)[:Semantic]
 * EMPTY_OPERTOR VariableTypeInstruction IdInstruction VarDeclInstruction ... VarDeclInstruction
 */
export class FunctionDefInstruction extends DeclInstruction implements IFunctionDefInstruction {
    readonly params: IVariableDeclInstruction[];
    readonly returnType: IVariableTypeInstruction;
    
    protected _id: IIdInstruction;

    constructor({ returnType, id, paramList = [], ...settings }: IFunctionDefInstructionSettings) {
        super({ instrType: EInstructionTypes.k_FunctionDef, ...settings });

        this.params = paramList.map(param => Instruction.$withParent(param, this));
        this.returnType = Instruction.$withParent(returnType, this);
        this._id = Instruction.$withParent(id, this);
    }

    get id(): IIdInstruction {
        return this._id;
    }
    

    get name(): string {
        return this._id.name;
    }


    toString(): string {
        let def = this.returnType.hash + " " + this.name + "(";

        for (let i: number = 0; i < this.params.length; i++) {
            def += this.params[i].type.hash + ",";
        }

        def += ")";
        // TODO: add semantic
        return def;
    }


    toCode(): string {
        const { _id: id, returnType, params } = this;
        return `${returnType.toCode()} ${id.toCode()}(${params.map(param => param.toCode()).join(', ')})`;
    }
}
