import { ExprInstruction } from "./ExprInstruction";
import { ITypeInstruction, IInstruction, IVariableTypeInstruction } from "./../../idl/IInstruction";
import { EInstructionTypes, EVarUsedMode, ITypeUseInfoContainer, IAnalyzedInstruction, IExprInstruction, IConstructorCallInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";
import * as Effect from "../Effect";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Resresnt ctor(arg1,..., argn)
 * EMPTY_OPERATOR IdInstruction ExprInstruction ... ExprInstruction 
 */
export class ConstructorCallInstruction extends ExprInstruction implements IConstructorCallInstruction {
    private _arguments: IInstruction[];
    private _ctor: IVariableTypeInstruction;
    

    constructor(node: IParseNode, ctor: IVariableTypeInstruction, instructions: IInstruction[]) {
        super(node, ctor.subType, EInstructionTypes.k_ConstructorCallInstruction);

        this._arguments = instructions;
        this._ctor = ctor;
    }

    
    get arguments() : IInstruction[] {
        return this._arguments;
    }

    
    get ctor(): IVariableTypeInstruction {
        return this._ctor;
    }


    toCode(): string {
        var code: string = "";

        code += this.ctor.toCode();
        code += "(";

        for (var i: number = 0; i < this.arguments.length; i++) {
            code += this.arguments[i].toCode();
            if (i !== this.arguments.length - 1) {
                code += ",";
            }
        }

        code += ")";

        return code;
    }


    addUsedData(usedDataCollector: IMap<ITypeUseInfoContainer>,
        usedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var instructionList: IAnalyzedInstruction[] = <IAnalyzedInstruction[]>this.arguments;
        for (var i: number = 0; i < instructionList.length; i++) {
            instructionList[i].addUsedData(usedDataCollector, EVarUsedMode.k_Read);
        }
    }


    isConst(): boolean {
        for (var i: number = 0; i < this.arguments.length; i++) {
            if (!(<IExprInstruction>this.arguments[i]).isConst()) {
                return false;
            }
        }

        return true;
    }


    evaluate(): boolean {
        if (!this.isConst()) {
            return false;
        }

        var res: any = null;
        var jsTypeCtor: any = Effect.getExternalType(this.type);
        var args: any[] = new Array(this.arguments.length);

        if (isNull(jsTypeCtor)) {
            return false;
        }

        try {
            if (Effect.isScalarType(this.type)) {
                var pTestedInstruction: IExprInstruction = <IExprInstruction>this.arguments[0];
                if (this.arguments.length > 1 || !pTestedInstruction.evaluate()) {
                    return false;
                }

                res = jsTypeCtor(pTestedInstruction.getEvalValue());
            }
            else {
                for (var i: number = 0; i < this.arguments.length; i++) {
                    var pTestedInstruction: IExprInstruction = <IExprInstruction>this.arguments[i];

                    if (pTestedInstruction.evaluate()) {
                        args[i - 1] = pTestedInstruction.getEvalValue();
                    }
                    else {
                        return false;
                    }
                }

                res = new jsTypeCtor;
                res.set.apply(res, args);
            }
        }
        catch (e) {
            return false;
        }

        this._evalResult = res;
        return true;
    }
}
