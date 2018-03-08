import { ExprInstruction } from "./ExprInstruction";
import { IVariableDeclInstruction, EInstructionTypes, IFunctionDeclInstruction, IInstruction, ITypeUseInfoContainer, EVarUsedMode, IAnalyzedInstruction, IExprInstruction, IVariableTypeInstruction } from "../../idl/IInstruction";
import { isNull } from "../../common";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";
import { SystemFunctionInstruction } from "./SystemFunctionInstruction";
import { IInstructionSettings } from "./Instruction";


export interface ISystemCallInstructionSettings extends IInstructionSettings {
    func: SystemFunctionInstruction;
    args?: IExprInstruction[];
}


/**
 * Respresnt system_func(arg1,..., argn)
 * EMPTY_OPERATOR SimpleInstruction ... SimpleInstruction 
 */
export class SystemCallInstruction extends ExprInstruction {
    protected _func: SystemFunctionInstruction;
    protected _args: IExprInstruction[];
    // protected _samplerDecl: IVariableDeclInstruction;

    constructor({ func, args = [], ...settings }: ISystemCallInstructionSettings) {
        super({ instrType: EInstructionTypes.k_SystemCallInstruction, type: func.type, ...settings });
        this._func = func;
        // this._samplerDecl = null;
        this._args = <IExprInstruction[]>this._func.closeArguments(args);
    }


    get func(): IFunctionDeclInstruction {
        return this._func as IFunctionDeclInstruction;
    }


    get arguments(): IExprInstruction[] {
        return this._args;
    }


    toCode(): string {
        let code: string = '';
        for (let i: number = 0; i < this.arguments.length; i++) {
            code += this.arguments[i].toCode();
        }
        return code;
    }




    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        let pInstructionList: IAnalyzedInstruction[] = <IAnalyzedInstruction[]>this.arguments;
        for (let i: number = 0; i < this.arguments.length; i++) {
            if (pInstructionList[i].instructionType !== EInstructionTypes.k_SimpleInstruction) {
                pInstructionList[i].addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
                if ((<IExprInstruction>pInstructionList[i]).type.isSampler) {
                    // this._samplerDecl = (<IExprInstruction>pInstructionList[i]).type.parentVarDecl;
                }
            }
        }
    }
}


