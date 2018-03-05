import { EVarUsedMode, IDeclInstruction, ITypeUseInfoContainer, EInstructionTypes, IVariableDeclInstruction, IVariableTypeInstruction } from "../../idl/IInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { StmtInstruction } from "./StmtInstruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";

/**
 * Represent TypeDecl or VariableDecl or VarStructDecl
 * EMPTY DeclInstruction
 */
export class DeclStmtInstruction extends StmtInstruction {
    private _instructions: IDeclInstruction[];

    
    constructor(node: IParseNode, instructions: IDeclInstruction[]) {
        super(node, EInstructionTypes.k_DeclStmtInstruction);
        this._instructions = instructions;
    }


    get instructions(): IDeclInstruction[] {
        return this._instructions;
    }


    toCode(): string {
        var code: string = "";
        var pVariableList: IVariableDeclInstruction[] = <IVariableDeclInstruction[]>this.instructions;

        for (var i: number = 0; i < this.instructions.length; i++) {
            code += pVariableList[i].toCode() + ";\n";
        }

        return code;
    }

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        if (isNull(this.instructions) || this.instructions.length === 0) {
            return;
        }

        if (this.instructions[0].instructionType === EInstructionTypes.k_TypeDeclInstruction) {
            return;
        }

        var pVariableList: IVariableDeclInstruction[] = <IVariableDeclInstruction[]>this.instructions;
        for (var i: number = 0; i < this.instructions.length; i++) {
            var pVarType: IVariableTypeInstruction = pVariableList[i].type;

            pUsedDataCollector[pVarType.instructionID] = <ITypeUseInfoContainer>{
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


