import { EInstructionTypes, IFunctionDeclInstruction, IIdExprInstruction, ITypeUseInfoContainer, EVarUsedMode, IExprInstruction, IVariableDeclInstruction, IFunctionCallInstruction } from "../../idl/IInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { IMap } from "../../idl/IMap";
import { IdExprInstruction } from "./IdExprInstruction";


/**
 * Respresnt func(arg1,..., argn)
 * EMPTY_OPERATOR IdExprInstruction ExprInstruction ... ExprInstruction 
 */
export class FunctionCallInstruction extends IdExprInstruction implements IFunctionCallInstruction {
    
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_FunctionCallInstruction);
    }

    get declaration(): IFunctionDeclInstruction {
        return <IFunctionDeclInstruction>(<IIdExprInstruction>this.instructions[0]).type.parent.parent;
    }


    toCode(): string {
        var sCode: string = "";

        sCode += this.instructions[0].toCode();
        sCode += "(";
        for (var i: number = 1; i < this.instructions.length; i++) {
            sCode += this.instructions[i].toCode();
            if (i !== this.instructions.length - 1) {
                sCode += ","
            }
        }
        sCode += ")"

        return sCode;
    }


    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var pExprList: IExprInstruction[] = <IExprInstruction[]>this.instructions;
        var pFunction: IFunctionDeclInstruction = this.declaration;
        var pArguments: IVariableDeclInstruction[] = <IVariableDeclInstruction[]>pFunction.arguments;

        pExprList[0].addUsedData(pUsedDataCollector, eUsedMode);

        for (var i: number = 0; i < pArguments.length; i++) {
            if (pArguments[i].type.hasUsage("out")) {
                pExprList[i + 1].addUsedData(pUsedDataCollector, EVarUsedMode.k_Write);
            }
            else if (pArguments[i].type.hasUsage("inout")) {
                pExprList[i + 1].addUsedData(pUsedDataCollector, EVarUsedMode.k_ReadWrite);
            }
            else {
                pExprList[i + 1].addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
            }
        }
    }
}


