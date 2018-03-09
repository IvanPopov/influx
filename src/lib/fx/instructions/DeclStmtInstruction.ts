import { EVarUsedMode, IDeclInstruction, ITypeUseInfoContainer, EInstructionTypes, IVariableDeclInstruction, IVariableTypeInstruction } from "../../idl/IInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { StmtInstruction } from "./StmtInstruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";
import { IInstructionSettings } from "./Instruction";

export interface IDeclStmtInstruction extends IInstructionSettings {
    declList?: IDeclInstruction[];
}

/**
 * Represent TypeDecl or VariableDecl or VarStructDecl
 * EMPTY DeclInstruction
 */
export class DeclStmtInstruction extends StmtInstruction {
    private _declList: IDeclInstruction[];

    
    constructor({ declList, ...settings }) {
        super({ instrType: EInstructionTypes.k_DeclStmtInstruction, ...settings });
        
        this._declList = declList.map(decl => decl.$withParent(this));
    }


    get declList(): IDeclInstruction[] {
        return this._declList;
    }


    toCode(): string {
        var code: string = "";
        var pVariableList: IVariableDeclInstruction[] = <IVariableDeclInstruction[]>this.declList;

        for (var i: number = 0; i < this.declList.length; i++) {
            code += pVariableList[i].toCode() + ";\n";
        }

        return code;
    }

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        if (isNull(this.declList) || this.declList.length === 0) {
            return;
        }

        if (this.declList[0].instructionType === EInstructionTypes.k_TypeDeclInstruction) {
            return;
        }

        var pVariableList: IVariableDeclInstruction[] = <IVariableDeclInstruction[]>this.declList;
        for (var i: number = 0; i < this.declList.length; i++) {
            var pVarType: IVariableTypeInstruction = pVariableList[i].type;

            pUsedDataCollector[pVarType.instructionID] = <ITypeUseInfoContainer>{
                type: pVarType,
                isRead: false,
                isWrite: true,
                numRead: 0,
                numWrite: 1,
                numUsed: 1
            };

            if (!isNull(pVariableList[i].initExpr)) {
                pVariableList[i].initExpr.addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
            }
        }
    }
}


