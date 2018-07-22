import { EVarUsedMode, IDeclInstruction, ITypeUseInfoContainer, EInstructionTypes, IVariableDeclInstruction, IVariableTypeInstruction } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";
import { StmtInstruction } from "./StmtInstruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";
import { IInstructionSettings } from "./Instruction";

export interface IDeclStmtInstructionSettings extends IInstructionSettings {
    declList?: IDeclInstruction[];
}

/**
 * Represent TypeDecl or VariableDecl or VarStructDecl
 * EMPTY DeclInstruction
 */
export class DeclStmtInstruction extends StmtInstruction {
    private _declList: IDeclInstruction[];

    
    constructor({ declList = null, ...settings }: IDeclStmtInstructionSettings) {
        super({ instrType: EInstructionTypes.k_DeclStmtInstruction, ...settings });
        
        this._declList = (declList || []).map(decl => decl.$withParent(this));
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



