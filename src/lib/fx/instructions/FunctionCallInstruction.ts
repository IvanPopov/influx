import { EInstructionTypes, IFunctionDeclInstruction, IIdExprInstruction, ITypeUseInfoContainer, EVarUsedMode, IExprInstruction, IVariableDeclInstruction, IFunctionCallInstruction } from "../../idl/IInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { IMap } from "../../idl/IMap";
import { IdExprInstruction } from "./IdExprInstruction";


/**
 * Respresnt func(arg1,..., argn)
 * EMPTY_OPERATOR IdExprInstruction ExprInstruction ... ExprInstruction 
 */
export class FunctionCallInstruction extends IdExprInstruction implements IFunctionCallInstruction {
    private _arguments: IExprInstruction[];
    
    constructor(node: IParseNode, decl: IFunctionDeclInstruction, args: IdExprInstruction[]) {
        super(node, decl, EInstructionTypes.k_FunctionCallInstruction);
        
        this._arguments = args;
    }

    get declaration(): IFunctionDeclInstruction {
        return <IFunctionDeclInstruction>super.declaration;
    }

    get args(): IExprInstruction[] {
        return this._arguments;
    }


    toCode(): string {
        var code: string = "";

        code += this.declaration.nameID.toCode();
        code += "(";
        for (var i: number = 0; i < this._arguments.length; i++) {
            code += this._arguments[i].toCode();
            if (i !== this._arguments.length - 1) {
                code += ","
            }
        }
        code += ")"

        return code;
    }


    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var pArgs: IExprInstruction[] = <IExprInstruction[]>this.args;
        var pFunction: IFunctionDeclInstruction = this.declaration;
        var pArgDecls: IVariableDeclInstruction[] = <IVariableDeclInstruction[]>pFunction.arguments;

        // this.nameID.addUsedData(pUsedDataCollector, eUsedMode);

        for (var i: number = 0; i < pArgDecls.length; i++) {
            if (pArgDecls[i].type.hasUsage("out")) {
                pArgs[i].addUsedData(pUsedDataCollector, EVarUsedMode.k_Write);
            }
            else if (pArgDecls[i].type.hasUsage("inout")) {
                pArgs[i].addUsedData(pUsedDataCollector, EVarUsedMode.k_ReadWrite);
            }
            else {
                pArgs[i].addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
            }
        }
    }
}


