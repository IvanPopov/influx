import { EInstructionTypes, IFunctionDeclInstruction, IIdExprInstruction, ITypeUseInfoContainer, EVarUsedMode, IExprInstruction, IVariableDeclInstruction, IFunctionCallInstruction } from "../../idl/IInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { IMap } from "../../idl/IMap";
import { IdExprInstruction } from "./IdExprInstruction";


/**
 * Respresnt func(arg1,..., argn)
 * EMPTY_OPERATOR IdExprInstruction ExprInstruction ... ExprInstruction 
 */
export class FunctionCallInstruction extends IdExprInstruction implements IFunctionCallInstruction {
    protected _arguments: IExprInstruction[];
    
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
        var args: IExprInstruction[] = <IExprInstruction[]>this.args;
        var func: IFunctionDeclInstruction = this.declaration;
        var argsDecl: IVariableDeclInstruction[] = <IVariableDeclInstruction[]>func.arguments;

        // this.nameID.addUsedData(pUsedDataCollector, eUsedMode);

        for (var i: number = 0; i < argsDecl.length; i++) {
            if (argsDecl[i].type.hasUsage("out")) {
                args[i].addUsedData(pUsedDataCollector, EVarUsedMode.k_Write);
            }
            else if (argsDecl[i].type.hasUsage("inout")) {
                args[i].addUsedData(pUsedDataCollector, EVarUsedMode.k_ReadWrite);
            }
            else {
                args[i].addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
            }
        }
    }
}


