import { ExprInstruction } from "./ExprInstruction";
import { IVariableDeclInstruction, EInstructionTypes, IFunctionDeclInstruction, IInstruction, ITypeUseInfoContainer, EVarUsedMode, IAnalyzedInstruction, IExprInstruction, IVariableTypeInstruction } from "../../idl/IInstruction";
import { isNull } from "../../common";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";
import { SystemFunctionInstruction } from "./SystemFunctionInstruction";


/**
 * Respresnt system_func(arg1,..., argn)
 * EMPTY_OPERATOR SimpleInstruction ... SimpleInstruction 
 */
export class SystemCallInstruction extends ExprInstruction {
    private _pSystemFunction: SystemFunctionInstruction;
    private _pSamplerDecl: IVariableDeclInstruction;

    constructor() {
        super(null, EInstructionTypes.k_SystemCallInstruction);
        this._pSystemFunction = null;
        this._pSamplerDecl = null;
    }

    toCode(): string {
        var sCode: string = "";

        for (var i: number = 0; i < this.instructions.length; i++) {
            sCode += this.instructions[i].toCode();
        }

        return sCode;
    }


    setSystemCallFunction(pFunction: IFunctionDeclInstruction): void {
        this._pSystemFunction = <SystemFunctionInstruction>pFunction;
        this.type = (pFunction.type as IVariableTypeInstruction);
    }


    fillByArguments(pArguments: IInstruction[]): void {
        this.instructions.length = 0; 
        this._pSystemFunction.closeArguments(pArguments).forEach( pInst => this.push(pInst, true) );
    }


    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var pInstructionList: IAnalyzedInstruction[] = <IAnalyzedInstruction[]>this.instructions;
        for (var i: number = 0; i < this.instructions.length; i++) {
            if (pInstructionList[i].instructionType !== EInstructionTypes.k_SimpleInstruction) {
                pInstructionList[i].addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
                if ((<IExprInstruction>pInstructionList[i]).type.isSampler) {
                    this._pSamplerDecl = (<IExprInstruction>pInstructionList[i]).type.parentVarDecl;
                }
            }
        }
    }
}


