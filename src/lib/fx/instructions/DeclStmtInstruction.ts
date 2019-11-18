import { EInstructionTypes, IDeclInstruction, IVariableDeclInstruction, IDeclStmtInstruction } from "@lib/idl/IInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";
import { StmtInstruction } from "./StmtInstruction";

export interface IDeclStmtInstructionSettings extends IInstructionSettings {
    declList?: IDeclInstruction[];
}

/**
 * Represent TypeDecl or VariableDecl or VarStructDecl
 * EMPTY DeclInstruction
 */
export class DeclStmtInstruction extends StmtInstruction implements IDeclStmtInstruction {
    private _declList: IDeclInstruction[];

    
    constructor({ declList = null, ...settings }: IDeclStmtInstructionSettings) {
        super({ instrType: EInstructionTypes.k_DeclStmt, ...settings });
        
        this._declList = (declList || []).map(decl => Instruction.$withParent(decl, this));
    }


    get declList(): IDeclInstruction[] {
        return this._declList;
    }


    toCode(): string {
        var code = '';
        var declList = <IVariableDeclInstruction[]>this.declList;

        for (var i: number = 0; i < this.declList.length; i++) {
            code += declList[i].toCode() + ";\n";
        }

        return code;
    }
}



