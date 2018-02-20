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

        this._pName = new IdInstruction();
        this._pName._setName(sName);
        this._pName._setParent(this);

        this._pReturnType = new VariableTypeInstruction(null);
        this._pReturnType._pushType(pReturnType);
        this._pReturnType._setParent(this);

        this._pArguments = [];

        if (!isNull(pArgumentTypes)) {
            for (var i: number = 0; i < pArgumentTypes.length; i++) {
                var pArgument: TypedInstruction = new TypedInstruction(null);
                pArgument._setType(pArgumentTypes[i]);
                pArgument._setParent(this);

                this._pArguments.push(pArgument);
            }
        }

        this._pExprTranslator = pExprTranslator;
    }

    setDeclCode(sDefenition: string, sImplementation: string) {
        this._sDefinition = sDefenition;
        this._sImplementation = sImplementation;
    }

    /**
     * Generate code 
     */
    _toFinalCode(): string {
        return this._sDefinition + this._sImplementation;
    }

    _toFinalDefCode(): string {
        return this._sDefinition;
    }

    setUsedSystemData(pTypeList: IAFXTypeDeclInstruction[],
        pFunctionList: IAFXFunctionDeclInstruction[]): void {

        this._pExtSystemTypeList = pTypeList;
        this._pExtSystemFunctionList = pFunctionList;
    }

    closeSystemDataInfo(): void {
        for (var i: number = 0; i < this._pExtSystemFunctionList.length; i++) {
            var pFunction: IAFXFunctionDeclInstruction = this._pExtSystemFunctionList[i];

            var pTypes = pFunction._getExtSystemTypeList();
            var pFunctions = pFunction._getExtSystemFunctionList();

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

    _getNameId(): IAFXIdInstruction {
        return this._pName;
    }

    _getArguments(): IAFXTypedInstruction[] {
        return this._pArguments;
    }

    _getNumNeededArguments(): number {
        return this._pArguments.length;
    }

    _hasImplementation(): boolean {
        return true;
    }

    _getType(): IAFXVariableTypeInstruction {
        return this._getReturnType();
    }

    _getReturnType(): IAFXVariableTypeInstruction {
        return this._pReturnType;
    }

    _getFunctionType(): EFunctionType {
        return EFunctionType.k_Function;
    }

    _setFunctionType(eFunctionType: EFunctionType): void {
    }

    closeArguments(pArguments: IAFXInstruction[]): IAFXInstruction[] {
        return this._pExprTranslator.toInstructionList(pArguments);
    }

    _setFunctionDef(pFunctionDef: IAFXDeclInstruction): void {
    }

    _setImplementation(pImplementation: IAFXStmtInstruction): void {
    }

    _clone(pRelationMap?: IMap<IAFXInstruction>): SystemFunctionInstruction {
        return this;
    }

    _addOutVariable(pVariable: IAFXVariableDeclInstruction): boolean {
        return false;
    }

    _getOutVariable(): IAFXVariableDeclInstruction {
        return null;
    }

    _getVertexShader(): IAFXFunctionDeclInstruction {
        return null;
    }

    _getPixelShader(): IAFXFunctionDeclInstruction {
        return null;
    }

    _markUsedAs(eUsedType: EFunctionType): void {
    }

    _isUsedAs(eUsedType: EFunctionType): boolean {
        return true;
    }

    _isUsedAsFunction(): boolean {
        return true;
    }

    _isUsedAsVertex(): boolean {
        return true;
    }

    _isUsedAsPixel(): boolean {
        return true;
    }

    _markUsedInVertex(): void {
    }

    _markUsedInPixel(): void {
    }

    _isUsedInVertex(): boolean {
        return null;
    }

    _isUsedInPixel(): boolean {
        return null;
    }

    _isUsed(): boolean {
        return null;
    }

    _checkVertexUsage(): boolean {
        return this._isForVertex();
    }

    _checkPixelUsage(): boolean {
        return this._isForPixel();
    }

    _checkDefenitionForVertexUsage(): boolean {
        return false;
    }

    _checkDefenitionForPixelUsage(): boolean {
        return false;
    }

    _canUsedAsFunction(): boolean {
        return true;
    }

    _notCanUsedAsFunction(): void { }

    _addUsedFunction(pFunction: IAFXFunctionDeclInstruction): boolean {
        return false;
    }

    _addUsedVariable(pVariable: IAFXVariableDeclInstruction): void {

    }

    _getUsedFunctionList(): IAFXFunctionDeclInstruction[] {
        return null;
    }

    _isBlackListFunction(): boolean {
        return false;
    }

    _addToBlackList(): void {
    }

    _getStringDef(): string {
        return "system_func";
    }

    _convertToVertexShader(): IAFXFunctionDeclInstruction {
        return null;
    }

    _convertToPixelShader(): IAFXFunctionDeclInstruction {
        return null;
    }

    _prepareForVertex(): void { }
    _prepareForPixel(): void { }

    addUsedVariableType(pType: IAFXVariableTypeInstruction, eUsedMode: EVarUsedMode): boolean {
        return false;
    }

    _generateInfoAboutUsedData(): void {

    }

    _getAttributeVariableMap(): IMap<IAFXVariableDeclInstruction> {
        return null;
    }

    _getVaryingVariableMap(): IMap<IAFXVariableDeclInstruction> {
        return null;
    }

    _getSharedVariableMap(): IMap<IAFXVariableDeclInstruction> {
        return null;
    }

    _getGlobalVariableMap(): IMap<IAFXVariableDeclInstruction> {
        return null;
    }

    _getUniformVariableMap(): IMap<IAFXVariableDeclInstruction> {
        return null;
    }

    _getForeignVariableMap(): IMap<IAFXVariableDeclInstruction> {
        return null;
    }

    _getTextureVariableMap(): IMap<IAFXVariableDeclInstruction> {
        return null;
    }

    _getUsedComplexTypeMap(): IMap<IAFXTypeInstruction> {
        return null;
    }

    _getAttributeVariableKeys(): number[] {
        return null;
    }

    _getVaryingVariableKeys(): number[] {
        return null;
    }

    _getSharedVariableKeys(): number[] {
        return null;
    }

    _getUniformVariableKeys(): number[] {
        return null;
    }

    _getForeignVariableKeys(): number[] {
        return null;
    }

    _getGlobalVariableKeys(): number[] {
        return null;
    }

    _getTextureVariableKeys(): number[] {
        return null;
    }

    _getUsedComplexTypeKeys(): number[] {
        return null;
    }

    _getExtSystemFunctionList(): IAFXFunctionDeclInstruction[] {
        return this._pExtSystemFunctionList;
    }

    _getExtSystemTypeList(): IAFXTypeDeclInstruction[] {
        return this._pExtSystemTypeList;
    }

}

