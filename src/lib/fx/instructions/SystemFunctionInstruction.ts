import { IAFXFunctionDeclInstruction, IAFXSimpleInstruction, IAFXTypeDeclInstruction, IAFXIdInstruction, IAFXTypedInstruction, IAFXTypeInstruction, EAFXInstructionTypes, IAFXVariableTypeInstruction, EFunctionType, IAFXInstruction, IAFXDeclInstruction, IAFXVariableDeclInstruction, EVarUsedMode, IAFXStmtInstruction } from "../../idl/IAFXInstruction";
import { DeclInstruction } from "./DeclInstruction";
import { IdInstruction } from "./IdInstruction";
import { isNull } from "../../common";
import { TypedInstruction } from "./TypedInstruction";
import { IMap } from "../../idl/IMap";
import { VariableTypeInstruction } from "./VariableTypeInstruction";
import { ExprTemplateTranslator } from "../ExprTemplateTranslator"


export class SystemFunctionInstruction extends DeclInstruction implements IAFXFunctionDeclInstruction {
    private _pExprTranslator: ExprTemplateTranslator = null;
    private _pName: IAFXIdInstruction = null;
    private _pReturnType: VariableTypeInstruction = null;
    private _pArguments: IAFXTypedInstruction[] = null;

    private _sDefinition: string = "";
    private _sImplementation: string = "";

    private _pExtSystemTypeList: IAFXTypeDeclInstruction[] = null;
    private _pExtSystemFunctionList: IAFXFunctionDeclInstruction[] = null;

    constructor(sName: string, pReturnType: IAFXTypeInstruction,
        pExprTranslator: ExprTemplateTranslator,
        pArgumentTypes: IAFXTypeInstruction[]) {
        super(null);

        this._eInstructionType = EAFXInstructionTypes.k_SystemFunctionInstruction;

        this._pName = new IdInstruction(null);
        this._pName.name = (sName);
        this._pName.parent = (this);

        this._pReturnType = new VariableTypeInstruction(null);
        this._pReturnType._pushType(pReturnType);
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

    setUsedSystemData(pTypeList: IAFXTypeDeclInstruction[],
        pFunctionList: IAFXFunctionDeclInstruction[]): void {

        this._pExtSystemTypeList = pTypeList;
        this._pExtSystemFunctionList = pFunctionList;
    }

    closeSystemDataInfo(): void {
        for (var i: number = 0; i < this._pExtSystemFunctionList.length; i++) {
            var pFunction: IAFXFunctionDeclInstruction = this._pExtSystemFunctionList[i];

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

    setExprTranslator(pExprTranslator: ExprTemplateTranslator): void {
        this._pExprTranslator = pExprTranslator;
    }

    get nameID(): IAFXIdInstruction {
        return this._pName;
    }

    get arguments(): IAFXTypedInstruction[] {
        return this._pArguments;
    }

    _getNumNeededArguments(): number {
        return this._pArguments.length;
    }

    get type(): IAFXVariableTypeInstruction {
        return this.returnType;
    }

    get returnType(): IAFXVariableTypeInstruction {
        return this._pReturnType;
    }

    get functionType(): EFunctionType {
        return EFunctionType.k_Function;
    }

    set functionType(eFunctionType: EFunctionType) {

    }

    closeArguments(pArguments: IAFXInstruction[]): IAFXInstruction[] {
        return this._pExprTranslator.toInstructionList(pArguments);
    }

    set functionDef(pFunctionDef: IAFXDeclInstruction) {
    }

    set implementation(pImplementation: IAFXStmtInstruction) {
    }

    clone(pRelationMap?: IMap<IAFXInstruction>): SystemFunctionInstruction {
        return this;
    }

    addOutVariable(pVariable: IAFXVariableDeclInstruction): boolean {
        return false;
    }

    getOutVariable(): IAFXVariableDeclInstruction {
        return null;
    }

    get vertexShader(): IAFXFunctionDeclInstruction {
        return null;
    }

    get pixelShader(): IAFXFunctionDeclInstruction {
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
        return this.isForVertex();
    }

    checkPixelUsage(): boolean {
        return this.isForPixel();
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

    addUsedFunction(pFunction: IAFXFunctionDeclInstruction): boolean {
        return false;
    }

    addUsedVariable(pVariable: IAFXVariableDeclInstruction): void {

    }

    getUsedFunctionList(): IAFXFunctionDeclInstruction[] {
        return null;
    }

    isBlackListFunction(): boolean {
        return false;
    }

    addToBlackList(): void {
    }

    get stringDef(): string {
        return "system_func";
    }

    convertToVertexShader(): IAFXFunctionDeclInstruction {
        return null;
    }

    convertToPixelShader(): IAFXFunctionDeclInstruction {
        return null;
    }

    prepareForVertex(): void { }
    prepareForPixel(): void { }

    addUsedVariableType(pType: IAFXVariableTypeInstruction, eUsedMode: EVarUsedMode): boolean {
        return false;
    }

    generateInfoAboutUsedData(): void {

    }

    getAttributeVariableMap(): IMap<IAFXVariableDeclInstruction> {
        return null;
    }

    get varyingVariableMap(): IMap<IAFXVariableDeclInstruction> {
        return null;
    }

    get sharedVariableMap(): IMap<IAFXVariableDeclInstruction> {
        return null;
    }

    get globalVariableMap(): IMap<IAFXVariableDeclInstruction> {
        return null;
    }

    get uniformVariableMap(): IMap<IAFXVariableDeclInstruction> {
        return null;
    }

    get foreignVariableMap(): IMap<IAFXVariableDeclInstruction> {
        return null;
    }

    get textureVariableMap(): IMap<IAFXVariableDeclInstruction> {
        return null;
    }

    get usedComplexTypeMap(): IMap<IAFXTypeInstruction> {
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

    get extSystemFunctionList(): IAFXFunctionDeclInstruction[] {
        return this._pExtSystemFunctionList;
    }

    get extSystemTypeList(): IAFXTypeDeclInstruction[] {
        return this._pExtSystemTypeList;
    }
}

