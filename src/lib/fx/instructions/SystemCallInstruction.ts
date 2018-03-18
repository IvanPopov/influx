import { ExprInstruction } from "./ExprInstruction";
import { IVariableDeclInstruction, EInstructionTypes, IFunctionDeclInstruction, IInstruction, ITypeUseInfoContainer, EVarUsedMode, IAnalyzedInstruction, IExprInstruction, IVariableTypeInstruction, IFunctionCallInstruction } from "../../idl/IInstruction";
import { isNull } from "../../common";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";
import { SystemFunctionInstruction } from "./SystemFunctionInstruction";
import { IInstructionSettings } from "./Instruction";


export interface ISystemCallInstructionSettings extends IInstructionSettings {
    decl: SystemFunctionInstruction;
    args?: IExprInstruction[];
}


/**
 * Respresnt system_func(arg1,..., argn)
 * EMPTY_OPERATOR SimpleInstruction ... SimpleInstruction 
 */
export class SystemCallInstruction extends ExprInstruction implements IFunctionCallInstruction {
    protected _args: IExprInstruction[];
    // protected _samplerDecl: IVariableDeclInstruction;
    
    // helpers
    protected _decl: SystemFunctionInstruction;

    constructor({ decl, args = [], ...settings }: ISystemCallInstructionSettings) {
        super({ instrType: EInstructionTypes.k_SystemCallInstruction, type: decl.type, ...settings });
        
        this._decl = decl;
        // this._samplerDecl = null;
        this._args = <IExprInstruction[]>this._decl.closeArguments(args).map(arg => arg.$withParent(this));
    }


    // todo: rename as resolve()
    get declaration(): IFunctionDeclInstruction {
        return this._decl as IFunctionDeclInstruction;
    }


    get args(): IExprInstruction[] {
        return this._args;
    }


    toCode(): string {
        let code: string = '';
        for (let i: number = 0; i < this.args.length; i++) {
            code += this.args[i].toCode();
        }
        return code;
    }


    addUsedData(usedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        let instructionList = <IAnalyzedInstruction[]>this.args;
        for (let i = 0; i < this.args.length; i++) {
            if (instructionList[i].instructionType !== EInstructionTypes.k_SimpleInstruction) {
                instructionList[i].addUsedData(usedDataCollector, EVarUsedMode.k_Read);
                if ((<IExprInstruction>instructionList[i]).type.isSampler) {
                    // this._samplerDecl = (<IExprInstruction>instructionList[i]).type.parentVarDecl;
                }
            }
        }
    }
}


