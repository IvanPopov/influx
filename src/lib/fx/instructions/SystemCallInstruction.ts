import { ExprInstruction } from "./ExprInstruction";
import { IAFXVariableDeclInstruction, EAFXInstructionTypes, IAFXFunctionDeclInstruction, IAFXInstruction, IAFXTypeUseInfoContainer, EVarUsedMode, IAFXAnalyzedInstruction, IAFXExprInstruction } from "../../idl/IAFXInstruction";
import { isNull } from "../../common";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Respresnt system_func(arg1,..., argn)
 * EMPTY_OPERATOR SimpleInstruction ... SimpleInstruction 
 */
export class SystemCallInstruction extends ExprInstruction {
    private _pSystemFunction: SystemFunctionInstruction = null;
    private _pSamplerDecl: IAFXVariableDeclInstruction = null;

    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = null;
        this._eInstructionType = EAFXInstructionTypes.k_SystemCallInstruction;
    }

    toCode(): string {
        if (!isNull(this._pSamplerDecl) && this._pSamplerDecl.isDefinedByZero()) {
            return "vec4(0.)";
        }

        var sCode: string = "";

        for (var i: number = 0; i < this.instructions.length; i++) {
            sCode += this.instructions[i].toCode();
        }

        return sCode;
    }

    setSystemCallFunction(pFunction: IAFXFunctionDeclInstruction): void {
        this._pSystemFunction = <SystemFunctionInstruction>pFunction;
        this.type = (pFunction.type);
    }

    set instructions(pInstructionList: IAFXInstruction[]) {
        this._pInstructionList = pInstructionList;
        for (var i: number = 0; i < pInstructionList.length; i++) {
            pInstructionList[i].parent = (this);
        }
    }

    fillByArguments(pArguments: IAFXInstruction[]): void {
        this.instructions = (this._pSystemFunction.closeArguments(pArguments));
    }

    addUsedData(pUsedDataCollector: IMap<IAFXTypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var pInstructionList: IAFXAnalyzedInstruction[] = <IAFXAnalyzedInstruction[]>this.instructions;
        for (var i: number = 0; i < this.instructions.length; i++) {
            if (pInstructionList[i].instructionType !== EAFXInstructionTypes.k_SimpleInstruction) {
                pInstructionList[i].addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
                if ((<IAFXExprInstruction>pInstructionList[i]).type.isSampler) {
                    this._pSamplerDecl = (<IAFXExprInstruction>pInstructionList[i]).type.parentVarDecl;
                }
            }
        }
    }

    clone(pRelationMap?: IMap<IAFXInstruction>): SystemCallInstruction {
        var pClone: SystemCallInstruction = <SystemCallInstruction>super.clone(pRelationMap);

        pClone.setSystemCallFunction(this._pSystemFunction);

        return pClone;
    }

}


