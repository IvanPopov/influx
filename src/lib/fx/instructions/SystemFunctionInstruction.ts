import { IFunctionDeclInstruction, ISimpleInstruction, ITypeDeclInstruction, IIdInstruction, ITypeInstruction, EInstructionTypes, IVariableTypeInstruction, EFunctionType, IInstruction, IDeclInstruction, IVariableDeclInstruction, EVarUsedMode, IStmtInstruction, ITypedInstruction } from "../../idl/IInstruction";
import { IDeclInstructionSettings } from "./DeclInstruction";
import { DeclInstruction } from "./DeclInstruction";
import { IdInstruction } from "./IdInstruction";
import { isNull } from "../../common";
import { IMap } from "../../idl/IMap";
import { VariableTypeInstruction } from "./VariableTypeInstruction";
import { ExprTemplateTranslator } from "../ExprTemplateTranslator"
import { TypedInstruction } from "./TypedInstruction";


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

    // helper info

    protected _extSystemTypeList: ITypeDeclInstruction[];
    protected _extSystemFunctionList: IFunctionDeclInstruction[];

    protected _bForVertex: boolean;
    protected _bForPixel: boolean;

    constructor({ id, returnType, exprTranslator = null, argTypes = [], definition = null, implementation = null, ...settings }: ISystemFunctionInstructionSettings) {

        super({ instrType: EInstructionTypes.k_SystemFunctionInstruction, ...settings });

        this._id = id.$withParent(this);
        this._returnType = returnType.$withNoParent();
        this._args = argTypes.map(type => {
            let arg = new TypedInstruction({ type });
            return arg.$withParent(this);
        });

        console.assert(isNull(definition) || this.builtIn == false);

        this._definition = definition;
        this._implementation = implementation;
    
        this._extSystemTypeList = [];
        this._extSystemFunctionList = [];

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


    get returnType(): IVariableTypeInstruction {
        return this.type;
    }


    get functionType(): EFunctionType {
        return EFunctionType.k_Function;
    }


    get vertexShader(): IFunctionDeclInstruction {
        return null;
    }


    get pixelShader(): IFunctionDeclInstruction {
        return null;
    }


    get stringDef(): string {
        return "system_func";
    }


    get attributeVariableMap(): IMap<IVariableDeclInstruction> {
        return null;
    }


    get varyingVariableMap(): IMap<IVariableDeclInstruction> {
        return null;
    }


    get uniformVariableMap(): IMap<IVariableDeclInstruction> {
        return null;
    }


    get textureVariableMap(): IMap<IVariableDeclInstruction> {
        return null;
    }


    get usedComplexTypeMap(): IMap<ITypeInstruction> {
        return null;
    }


    get attributeVariableKeys(): number[] {
        return null;
    }


    get varyingVariableKeys(): number[] {
        return null;
    }


    get uniformVariableKeys(): number[] {
        return null;
    }

    
    get textureVariableKeys(): number[] {
        return null;
    }


    get usedComplexTypeKeys(): number[] {
        return null;
    }


    get extSystemFunctionList(): IFunctionDeclInstruction[] {
        return this._extSystemFunctionList;
    }


    get extSystemTypeList(): ITypeDeclInstruction[] {
        return this._extSystemTypeList;
    }


    get usedFunctionList(): IFunctionDeclInstruction[] {
        return null;
    }


    closeArguments(args: IInstruction[]): IInstruction[] {
        return this._exprTranslator.toInstructionList(args);
    }


    clone(pRelationMap?: IMap<IInstruction>): SystemFunctionInstruction {
        return this;
    }


    addOutVariable(pVariable: IVariableDeclInstruction): boolean {
        return false;
    }


    getOutVariable(): IVariableDeclInstruction {
        return null;
    }


    markUsedAs(eUsedType: EFunctionType): void {
    }


    isUsedAs(eUsedType: EFunctionType): boolean {
        return true;
    }


    isUsedAsFunction(): boolean {
        return true;
    }


    isUsedAsVertex(): boolean {
        return true;
    }


    isUsedAsPixel(): boolean {
        return true;
    }


    markUsedInVertex(): void {
    }


    markUsedInPixel(): void {
    }


    isUsedInVertex(): boolean {
        return null;
    }


    isUsedInPixel(): boolean {
        return null;
    }


    isUsed(): boolean {
        return true;
    }


    checkVertexUsage(): boolean {
        return this._bForVertex;
    }


    checkPixelUsage(): boolean {
        return this._bForPixel;
    }


    checkDefinitionForVertexUsage(): boolean {
        return false;
    }


    checkDefinitionForPixelUsage(): boolean {
        return false;
    }


    canUsedAsFunction(): boolean {
        return true;
    }


    notCanUsedAsFunction(): void { }


    addUsedFunction(pFunction: IFunctionDeclInstruction): boolean {
        return false;
    }


    addUsedVariable(pVariable: IVariableDeclInstruction): void {

    }

    convertToVertexShader(): IFunctionDeclInstruction {
        return null;
    }


    convertToPixelShader(): IFunctionDeclInstruction {
        return null;
    }

    
    prepareForVertex(): void { }
    prepareForPixel(): void { }

    
    addUsedVariableType(pType: IVariableTypeInstruction, eUsedMode: EVarUsedMode): boolean {
        return false;
    }

    
    generateInfoAboutUsedData(): void {

    }

    
    getAttributeVariableMap(): IMap<IVariableDeclInstruction> {
        return null;
    }

    // isBlackListFunction(): boolean {
    //     return false;
    // }

    // addToBlackList(): void {}


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
            var pFunction: IFunctionDeclInstruction = this._extSystemFunctionList[i];

            var pTypes = pFunction.extSystemTypeList;
            var pFunctions = pFunction.extSystemFunctionList;

            for (var j: number = 0; j < pTypes.length; j++) {
                if (this._extSystemTypeList.indexOf(pTypes[j]) === -1) {
                    this._extSystemTypeList.push(pTypes[j]);
                }
            }

            for (var j: number = 0; j < pFunctions.length; j++) {
                if (this._extSystemFunctionList.indexOf(pFunctions[j]) === -1) {
                    this._extSystemFunctionList.unshift(pFunctions[j]);
                }
            }
        }
    }

    $overwriteType(type: EFunctionType) {
        console.error("@undefined_behavior");
    } 

    $makeVertexCompatible(val: boolean): void {
        this._bForVertex = val;
    }

    $makePixelCompatible(val: boolean): void {
        this._bForPixel = val;
    }
}

