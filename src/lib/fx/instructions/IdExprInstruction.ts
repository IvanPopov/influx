import { EInstructionTypes, IIdExprInstruction, IIdInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { ExprInstruction } from "./ExprInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";


export interface IIdExprInstructionSettings extends IInstructionSettings {
    id: IIdInstruction;
    decl: IVariableDeclInstruction;
}


export class IdExprInstruction extends ExprInstruction implements IIdExprInstruction {
    protected _id: IIdInstruction;
    // helpers
    protected _decl: IVariableDeclInstruction; // << move to resolveDecl() method.

    constructor({ id, decl, ...settings }: IIdExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_IdExprInstruction, type: decl.type, ...settings });

        this._id = Instruction.$withParent(id, this);
        this._decl = decl;
    }

    
    get declaration(): IVariableDeclInstruction {
        return this._decl;
    }
    

    get id(): IIdInstruction {
        return this._id;
    }


    get name(): string {
        return this.id.name;
    }


    isConst(): boolean {
        return this.type.isConst();
    }


    evaluate(): boolean {
        return false;
    }


    toCode(): string {
        return this._decl.id.toCode();
    }
}

