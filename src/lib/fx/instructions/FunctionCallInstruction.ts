import { EInstructionTypes, IFunctionDeclInstruction, IIdExprInstruction, ITypeUseInfoContainer, EVarUsedMode, IExprInstruction, IVariableDeclInstruction, IFunctionCallInstruction } from "../../idl/IInstruction";
import { IExprInstructionSettings } from "./ExprInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { IMap } from "../../idl/IMap";
import { IdExprInstruction } from "./IdExprInstruction";
import { ExprInstruction } from "./ExprInstruction";

export interface IFunctionCallInstructionSettings extends IExprInstructionSettings {
    decl: IFunctionDeclInstruction;
    args?: IExprInstruction[];
}

/**
 * Respresnt func(arg1,..., argn)
 * EMPTY_OPERATOR IdExprInstruction ExprInstruction ... ExprInstruction 
 */
export class FunctionCallInstruction extends ExprInstruction implements IFunctionCallInstruction {
    protected _decl: IFunctionDeclInstruction;
    protected _args: IExprInstruction[];
    
    constructor({ decl, args = [], ...settings }: IFunctionCallInstructionSettings) {
        super({ instrType: EInstructionTypes.k_FunctionCallInstruction, ...settings });
        
        this._decl = decl;
        this._args = args;
    }


    get declaration(): IFunctionDeclInstruction {
        return this._decl;
    }


    get args(): IExprInstruction[] {
        return this._args;
    }


    toCode(): string {
        let code: string = "";

        code += this.declaration.id.toCode();
        code += "(";
        for (let i: number = 0; i < this._args.length; i++) {
            code += this._args[i].toCode();
            if (i !== this._args.length - 1) {
                code += ","
            }
        }
        code += ")"

        return code;
    }


    addUsedData(usedDataCollector: IMap<ITypeUseInfoContainer>,
        usedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        let args: IExprInstruction[] = <IExprInstruction[]>this.args;
        let func: IFunctionDeclInstruction = this.declaration;
        let argsDecl: IVariableDeclInstruction[] = <IVariableDeclInstruction[]>func.definition.arguments;

        // this.nameID.addUsedData(usedDataCollector, usedMode);

        for (let i: number = 0; i < argsDecl.length; i++) {
            if (argsDecl[i].type.hasUsage("out")) {
                args[i].addUsedData(usedDataCollector, EVarUsedMode.k_Write);
            }
            else if (argsDecl[i].type.hasUsage("inout")) {
                args[i].addUsedData(usedDataCollector, EVarUsedMode.k_ReadWrite);
            }
            else {
                args[i].addUsedData(usedDataCollector, EVarUsedMode.k_Read);
            }
        }
    }
}


