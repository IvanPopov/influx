import { EVarUsedMode, IAFXTypeUseInfoContainer, EAFXInstructionTypes, IAFXVariableDeclInstruction, IAFXVariableTypeInstruction } from "../../idl/IAFXInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { StmtInstruction } from "./StmtInstruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";

/**
 * Represent TypeDecl or VariableDecl or VarStructDecl
 * EMPTY DeclInstruction
 */
export class DeclStmtInstruction extends StmtInstruction {
    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = [null];
        this._eInstructionType = EAFXInstructionTypes.k_DeclStmtInstruction;
    }

    _toFinalCode(): string {
        var sCode: string = "";
        var pVariableList: IAFXVariableDeclInstruction[] = <IAFXVariableDeclInstruction[]>this.instructions;

        for (var i: number = 0; i < this._nInstructions; i++) {
            sCode += pVariableList[i]._toFinalCode() + ";\n";
        }

        return sCode;
    }

    addUsedData(pUsedDataCollector: IMap<IAFXTypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        if (isNull(this.instructions) || this._nInstructions === 0) {
            return;
        }

        if (this.instructions[0].instructionType === EAFXInstructionTypes.k_TypeDeclInstruction) {
            return;
        }

        var pVariableList: IAFXVariableDeclInstruction[] = <IAFXVariableDeclInstruction[]>this.instructions;
        for (var i: number = 0; i < this._nInstructions; i++) {
            var pVarType: IAFXVariableTypeInstruction = pVariableList[i].type;

            pUsedDataCollector[pVarType.instructionID] = <IAFXTypeUseInfoContainer>{
                type: pVarType,
                isRead: false,
                isWrite: true,
                numRead: 0,
                numWrite: 1,
                numUsed: 1
            };

            if (pVariableList[i].initializeExpr) {
                pVariableList[i].initializeExpr.addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
            }
        }
    }
}


