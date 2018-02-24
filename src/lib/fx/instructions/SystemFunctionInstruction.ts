import { IFunctionDeclInstruction, ISimpleInstruction, ITypeDeclInstruction, IIdInstruction, ITypedInstruction, ITypeInstruction, EInstructionTypes, IVariableTypeInstruction, EFunctionType, IInstruction, IDeclInstruction, IVariableDeclInstruction, EVarUsedMode, IStmtInstruction } from "../../idl/IInstruction";
import { DeclInstruction } from "./DeclInstruction";
import { IdInstruction } from "./IdInstruction";
import { isNull } from "../../common";
import { TypedInstruction } from "./TypedInstruction";
import { IMap } from "../../idl/IMap";
import { VariableTypeInstruction } from "./VariableTypeInstruction";
import { ExprTemplateTranslator } from "../ExprTemplateTranslator"


export class SystemFunctionInstruction extends DeclInstruction implements IFunctionDeclInstruction {
    private _pExprTranslator: ExprTemplateTranslator ;
    private _pName: IIdInstruction;
    private _pReturnType: VariableTypeInstruction;
    private _pArguments: ITypedInstruction[];

    private _sDefinition: string;
    private _sImplementation: string;

    private _pExtSystemTypeList: ITypeDeclInstruction[];
    private _pExtSystemFunctionList: IFunctionDeclInstruction[];

    constructor(sName: string, pReturnType: ITypeInstruction,
        pExprTranslator: ExprTemplateTranslator,
        pArgumentTypes: ITypeInstruction[]) {
        super(null, EInstructionTypes.k_SystemFunctionInstruction);

        this._pName = new IdInstruction(null);
        this._pName.name = (sName);
        this._pName.parent = (this);

        this._pReturnType = new VariableTypeInstruction(null);
        this._pReturnType.pushType(pReturnType);
        this._pReturnType.parent = (this);

        this._pArguments = [];

        if (!isNull(pArgumentTypes)) {
            for (var i: number = 0; i < pArgumentTypes.length; i++) {
                var pArgument: TypedInstruction = new TypedInstruction(null);
                pArgument.type = (pArgumentTypes[i]);
                pArgument.parent = (this);

                this._pArguments.push(pArgument);
            }
        }

        this._sDefinition = null;
        this._sImplementation = null;
    
        this._pExtSystemTypeList = [];
        this._pExtSystemFunctionList = [];

        this._pExprTranslator = pExprTranslator;
    }

    // TODO: fixdefinition/implemetation types!!!
    // move system functions to default pipeline!!

    set definition(sDefinition: any) {
        this._sDefinition = sDefinition;
    }

    set implementaion(sImplementation: any) {
        this._sImplementation = sImplementation;
    }

    get definition(): any {
        return this._sDefinition;
    }
    
    get implementaion(): any {
        return this._sImplementation;
    }

    /**
     * Generate code 
     */
    toCode(): string {
        return this._sDefinition + this._sImplementation;
    }

    setUsedSystemData(pTypeList: ITypeDeclInstruction[],
        pFunctionList: IFunctionDeclInstruction[]): void {

        this._pExtSystemTypeList = pTypeList;
        this._pExtSystemFunctionList = pFunctionList;
    }

    closeSystemDataInfo(): void {
        for (var i: number = 0; i < this._pExtSystemFunctionList.length; i++) {
            var pFunction: IFunctionDeclInstruction = this._pExtSystemFunctionList[i];

            var pTypes = pFunction.extSystemTypeList;
            var pFunctions = pFunction.extSystemFunctionList;

            for (var j: number = 0; j < pTypes.length; j++) {
                if (this._pExtSystemTypeList.indexOf(pTypes[j]) === -1) {
                    this._pExtSystemTypeList.push(pTypes[j]);
                }
            }

            for (var j: number = 0; j < pFunctions.length; j++) {
                if (this._pExtSystemFunctionList.indexOf(pFunctions[j]) === -1) {
                    this._pExtSystemFunctionList.unshift(pFunctions[j]);
                }
            }
        }
    }

    set exprTranslator(pExprTranslator: ExprTemplateTranslator) {
        this._pExprTranslator = pExprTranslator;
    }

    get exprTranslator(): ExprTemplateTranslator {
        return this._pExprTranslator;
    }

    get nameID(): IIdInstruction {
        return this._pName;
    }

    get arguments(): ITypedInstruction[] {
        return this._pArguments;
    }

    get numArgsRequired(): number {
        return this._pArguments.length;
    }

    get type(): IVariableTypeInstruction {
        return this.returnType;
    }

    get returnType(): IVariableTypeInstruction {
        return this._pReturnType;
    }

    get functionType(): EFunctionType {
        return EFunctionType.k_Function;
    }

    set functionType(eFunctionType: EFunctionType) {}

    set functionDef(pFunctionDef: IDeclInstruction) {}

    set implementation(pImplementation: IStmtInstruction) {}

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
        return this._pExtSystemFunctionList;
    }

    get extSystemTypeList(): ITypeDeclInstruction[] {
        return this._pExtSystemTypeList;
    }

    get usedFunctionList(): IFunctionDeclInstruction[] {
        return null;
    }

    closeArguments(pArguments: IInstruction[]): IInstruction[] {
        return this._pExprTranslator.toInstructionList(pArguments);
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
        return null;
    }

    checkVertexUsage(): boolean {
        return this.vertex;
    }

    checkPixelUsage(): boolean {
        return this.pixel;
    }

    checkDefenitionForVertexUsage(): boolean {
        return false;
    }

    checkDefenitionForPixelUsage(): boolean {
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

    isBlackListFunction(): boolean {
        return false;
    }

    addToBlackList(): void {}
}

