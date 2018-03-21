import { IFunctionDeclInstruction, ISimpleInstruction, ITypeDeclInstruction, IIdInstruction, ITypeInstruction, EInstructionTypes, IVariableTypeInstruction, EFunctionType, IInstruction, IDeclInstruction, IVariableDeclInstruction, EVarUsedMode, IStmtInstruction, ITypedInstruction, IScope } from "../../idl/IInstruction";
import { IDeclInstructionSettings } from "./DeclInstruction";
import { DeclInstruction } from "./DeclInstruction";
import { IdInstruction } from "./IdInstruction";
import { isNull } from "../../common";
import { IMap } from "../../idl/IMap";
import { VariableTypeInstruction } from "./VariableTypeInstruction";
import { ExprTemplateTranslator } from "../ExprTemplateTranslator"
import { TypedInstruction } from "./TypedInstruction";
import * as SystemScope from "../SystemScope";


export interface ISystemFunctionInstructionSettings extends IDeclInstructionSettings {
    id: IIdInstruction;
    returnType: ITypeInstruction;
    exprTranslator?: ExprTemplateTranslator;
    argTypes?: ITypeInstruction[];
    definition?: string;
    implementation?: string;
}


export class SystemFunctionInstruction extends DeclInstruction implements IFunctionDeclInstruction {
    protected _id: IIdInstruction;
    protected _args: ITypedInstruction[];
    protected _returnType: ITypeInstruction;

    // for builtint functions
    protected _exprTranslator: ExprTemplateTranslator ;

    // for not builtin functions
    protected _definition: string;
    protected _implementation: string;

    protected _extSystemTypeList: ITypeDeclInstruction[];
    protected _extSystemFunctionList: IFunctionDeclInstruction[];


    protected _bForVertex: boolean;
    protected _bForPixel: boolean;
    
    constructor({ id, returnType, exprTranslator = null, argTypes = [], definition = null, implementation = null, ...settings }: ISystemFunctionInstructionSettings) {

        super({ instrType: EInstructionTypes.k_SystemFunctionInstruction, ...settings });

        this._id = id.$withParent(this);
        this._returnType = returnType.$withNoParent();
        this._args = argTypes.map(type => {
            let arg = new TypedInstruction({ type, scope: SystemScope.SCOPE });
            return arg.$withParent(this);
        });

        console.assert(isNull(definition) || this.builtIn == false);

        this._definition = definition;
        this._implementation = implementation;

        this._exprTranslator = exprTranslator;
    }


    get definition(): any {
        return this._definition;
    }

    
    get implementation(): any {
        return this._implementation;
    }


    get exprTranslator(): ExprTemplateTranslator {
        return this._exprTranslator;
    }


    get id(): IIdInstruction {
        return this._id;
    }


    get arguments(): ITypedInstruction[] {
        return this._args;
    }


    get numArgsRequired(): number {
        return this._args.length;
    }


    get type(): IVariableTypeInstruction {
        return this.returnType;
    }


    get name(): string {
        return this.id.name;
    }


    get returnType(): IVariableTypeInstruction {
        return this.type;
    }


    get functionType(): EFunctionType {
        return EFunctionType.k_Function;
    }


    get extSystemFunctionList(): IFunctionDeclInstruction[] {
        return this._extSystemFunctionList;
    }


    get extSystemTypeList(): ITypeDeclInstruction[] {
        return this._extSystemTypeList;
    }
    

    checkVertexUsage(): boolean {
        return this._bForVertex;
    }


    checkPixelUsage(): boolean {
        return this._bForPixel;
    }

    
    closeArguments(args: IInstruction[]): IInstruction[] {
        return this._exprTranslator.toInstructionList(args);
    }


    toCode(): string {
        return this._definition + this._implementation;
    }


    $setUsedSystemData(pTypeList: ITypeDeclInstruction[],
        pFunctionList: IFunctionDeclInstruction[]): void {

        this._extSystemTypeList = pTypeList;
        this._extSystemFunctionList = pFunctionList;
    }

    $closeSystemDataInfo(): void {
        for (var i: number = 0; i < this._extSystemFunctionList.length; i++) {
            var func: SystemFunctionInstruction = <SystemFunctionInstruction>this._extSystemFunctionList[i];

            var types = func.extSystemTypeList;
            var functions = func.extSystemFunctionList;

            for (var j: number = 0; j < types.length; j++) {
                if (this._extSystemTypeList.indexOf(types[j]) === -1) {
                    this._extSystemTypeList.push(types[j]);
                }
            }

            for (var j: number = 0; j < functions.length; j++) {
                if (this._extSystemFunctionList.indexOf(functions[j]) === -1) {
                    this._extSystemFunctionList.unshift(functions[j]);
                }
            }
        }
    }

    $overwriteType(type: EFunctionType) {
        console.error("@undefined_behavior");
    } 

    $linkToImplementationScope(scope: IScope): void {
        console.error("@undefined_behavior");
    }

    $makeVertexCompatible(val: boolean): void {
        this._bForVertex = val;
    }

    $makePixelCompatible(val: boolean): void {
        this._bForPixel = val;
    }
}

