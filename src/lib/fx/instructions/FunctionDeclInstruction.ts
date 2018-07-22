import { DeclInstruction, IDeclInstructionSettings } from "./DeclInstruction";
import { IFunctionDefInstruction, IStmtBlockInstruction, IScope } from "../../idl/IInstruction";
import { IFunctionDeclInstruction, EFunctionType, IVariableDeclInstruction, ITypeUseInfoContainer, ITypeDeclInstruction, ISimpleInstruction, EInstructionTypes, ITypeInstruction, IIdInstruction, IVariableTypeInstruction, IDeclInstruction, IStmtInstruction, IInstruction, IInitExprInstruction } from "../../idl/IInstruction";
import { Instruction } from "./Instruction";
import { IParseNode } from "../../idl/parser/IParser";
import { IMap } from "../../idl/IMap";
import { isNull, isDef, isDefAndNotNull } from "../../common";
import { IdInstruction } from "./IdInstruction";
import { FunctionDefInstruction } from "./FunctionDefInstruction";
import { StmtBlockInstruction } from "./StmtBlockInstruction";
import { EAnalyzerErrors, EAnalyzerWarnings } from '../../idl/EAnalyzerErrors';
import { SamplerStateBlockInstruction } from "./SamplerStateBlockInstruction";
import { VariableDeclInstruction } from "./VariableDeclInstruction";
import { VariableTypeInstruction } from "./VariableTypeInstruction";


export interface IFunctionDeclInstructionSettings extends IDeclInstructionSettings {
    definition: IFunctionDefInstruction;
    implementation?: IStmtBlockInstruction;
}


/**
 * Represent type func(...args)[:Semantic] [<Annotation> {stmts}]
 * EMPTY_OPERTOR FunctionDefInstruction StmtBlockInstruction
 */
export class FunctionDeclInstruction extends DeclInstruction implements IFunctionDeclInstruction {
    protected _definition: IFunctionDefInstruction;
    protected _implementation: IStmtBlockInstruction;
    protected _functionType: EFunctionType;

    constructor({ definition, implementation = null, ...settings }: IFunctionDeclInstructionSettings) {
        super({ instrType: EInstructionTypes.k_FunctionDeclInstruction, ...settings });

        this._definition = Instruction.$withParent(definition, this);
        this._implementation = Instruction.$withParent(implementation, this);
        this._functionType = EFunctionType.k_Function;
    }


    get functionType(): EFunctionType {
        return this._functionType;
    }


    get implementation(): IStmtBlockInstruction {
        return this._implementation;
    }


    get definition(): IFunctionDefInstruction {
        return this._definition;
    }


    get arguments(): IVariableDeclInstruction[] {
        console.error("@not_implemented");
        return null;
    }

    // shortcut for definition.name
    get name(): string {
        return this.definition.name;
    }


    // shortcut for definition.id
    get id(): IIdInstruction {
        return this.definition.id;
    }

    checkVertexUsage(): boolean {
        // todo: implement it!
        return true;
    }


    checkPixelUsage(): boolean {
        // todo: implement it!
        return true;
    }


    toCode(): string {
        let code = '';
        code += this._definition.toCode();
        code += this._implementation.toCode();
        return code;
    }




    // static prepareForVertex(funcDecl: IFunctionDeclInstruction): void {
    //     thifuncDecls.$overwriteType(EFunctionType.k_Vertex);

    //     let shaderInputParamList = FunctionDefInstruction.fetchShaderInput(funcDecl.definition);
    //     for (let i = 0; i < shaderInputParamList.length; i++) {
    //         let paramType = shaderInputParamList[i].type;

    //         if (paramType.isComplex() &&
    //             isDef(this._usedVarTypeMap[paramType.instructionID]) &&
    //             this._usedVarTypeMap[paramType.instructionID].isRead) {

    //             funcDecl._setError(EEffectTempErrors.BAD_LOCAL_OF_SHADER_INPUT, { funcName: funcDecl.name });
    //             return;
    //         }
    //     }

    //     if ( FunctionDefInstruction.hasComplexShaderInput(funcDecl.definition)) {
    //         shaderInputParamList[0].$hide();
    //     }

    //     this.generatesVertexAttrubutes();
    //     this.generateVertexVaryings();
    // }


    // prepareForPixel(): void {
    //     this.$overwriteType(EFunctionType.k_Pixel);

    //     let pShaderInputParamList: IVariableDeclInstruction[] = this._definition.shaderInput;
    //     for (let i: number = 0; i < pShaderInputParamList.length; i++) {
    //         let pParamType: IVariableTypeInstruction = pShaderInputParamList[i].type;

    //         if (pParamType.isComplex() &&
    //             isDef(this._usedVarTypeMap[pParamType.instructionID]) &&
    //             this._usedVarTypeMap[pParamType.instructionID].isRead) {

    //             this._setError(EEffectTempErrors.BAD_LOCAL_OF_SHADER_INPUT, { funcName: this.name });
    //             return;
    //         }
    //     }

    //     if (this._definition.isComplexShaderInput()) {
    //         pShaderInputParamList[0].$hide();
    //     }

    //     this._definition.$makeShader();

    //     this.generatePixelVaryings();
    // }


    // private generatesVertexAttrubutes(): void {
    //     throw null;

    // }

    // private generateVertexVaryings(): void {
        // this._varyingVariableMap = <IMap<IVariableDeclInstruction>>{};

        // let pContainerVariable: IVariableDeclInstruction = this.getOutVariable();
        // let pContainerType: IVariableTypeInstruction = pContainerVariable.type;


        // let pVaryingNames: string[] = pContainerType.fieldNames;

        // for (let i: number = 0; i < pVaryingNames.length; i++) {
        //     let pVarying: IVariableDeclInstruction = pContainerType.getField(pVaryingNames[i]);

        //     if (!this.isVariableTypeUse(pVarying.type)) {
        //         continue;
        //     }

        //     this._varyingVariableMap[pVarying.instructionID] = pVarying;
        // }

        // this._varyingVariableKeys = this.varyingVariableKeys;
    // }


    // private generatePixelVaryings(): void {
    //     let pShaderInputParamList: IVariableDeclInstruction[] = this._definition.shaderInput;
    //     let isComplexInput: boolean = this._definition.isComplexShaderInput();

    //     this._varyingVariableMap = <IMap<IVariableDeclInstruction>>{};

    //     if (isComplexInput) {
    //         let pContainerVariable: IVariableDeclInstruction = pShaderInputParamList[0];
    //         let pContainerType: IVariableTypeInstruction = pContainerVariable.type;

    //         let pVaryingNames: string[] = pContainerType.fieldNames;

    //         for (let i: number = 0; i < pVaryingNames.length; i++) {
    //             let pVarying: IVariableDeclInstruction = pContainerType.getField(pVaryingNames[i]);

    //             if (!this.isVariableTypeUse(pVarying.type)) {
    //                 continue;
    //             }

    //             this._varyingVariableMap[pVarying.instructionID] = pVarying;
    //         }
    //     }
    //     else {
    //         for (let i: number = 0; i < pShaderInputParamList.length; i++) {
    //             let pVarying: IVariableDeclInstruction = pShaderInputParamList[i];

    //             if (!this.isVariableTypeUse(pVarying.type)) {
    //                 continue;
    //             }

    //             this._varyingVariableMap[pVarying.instructionID] = pVarying;
    //         }
    //     }
    // }


    // private addGlobalVariableType(pVariableType: IVariableTypeInstruction,
    //     isWrite: boolean, isRead: boolean): void {
    //     if (!VariableTypeInstruction.isInheritedFromVariableDecl(pVariableType)) {
    //         return;
    //     }

    //     let pVariable: IVariableDeclInstruction = <IVariableDeclInstruction>VariableTypeInstruction.findParentVariableDecl(pVariableType);
    //     let pMainVariable: IVariableDeclInstruction = VariableTypeInstruction.findMainVariable(pVariableType);
    //     let iMainVar: number = pMainVariable.instructionID;

    //     if (isWrite || pMainVariable.type.isConst()) {
    //         if (isDefAndNotNull(this._uniformVariableMap[iMainVar])) {
    //             this._uniformVariableMap[iMainVar] = null;
    //         }
    //     }
    //     else {
    //         this._uniformVariableMap[iMainVar] = pMainVariable;

    //         // if (!pMainVariable.type.isComplex() && (!isNull(pMainVariable.initExpr) && pMainVariable.initExpr.isConst())) {
    //         //     pMainVariable.prepareDefaultValue();
    //         // }
    //     }

    //     if (pVariable.isSampler() && !isNull(pVariable.initExpr)) {
    //         let pInitExpr: IInitExprInstruction = pVariable.initExpr;
    //         let pTexture: IVariableDeclInstruction = null;
    //         let pSamplerStates: SamplerStateBlockInstruction = null;

    //         if (pVariableType.isArray()) {
    //             let list: IInitExprInstruction[] = <IInitExprInstruction[]>pInitExpr.arguments;
    //             for (let i: number = 0; i < list.length; i++) {
    //                 pSamplerStates = <SamplerStateBlockInstruction>list[i].arguments[0];
    //                 pTexture = pSamplerStates.texture;

    //                 if (!isNull(pTexture)) {
    //                     this._textureVariableMap[pTexture.instructionID] = pTexture;
    //                 }
    //             }
    //         }
    //         else {
    //             pSamplerStates = <SamplerStateBlockInstruction>pInitExpr.arguments[0];
    //             pTexture = pSamplerStates.texture;

    //             if (!isNull(pTexture)) {
    //                 this._textureVariableMap[pTexture.instructionID] = pTexture;
    //             }
    //         }
    //     }

    //     // this.addUsedComplexType(pMainVariable.type._baseType);
    // }

    // private addUniformParameter(type: IVariableTypeInstruction): void {
    //     let pMainVariable: IVariableDeclInstruction = VariableTypeInstruction.findMainVariable(type);
    //     let iMainVar: number = pMainVariable.instructionID;

    //     this._uniformVariableMap[iMainVar] = pMainVariable;
    //     this.addUsedComplexType(pMainVariable.type.baseType);

    //     // if (!pMainVariable.type.isComplex() && !isNull(pMainVariable.initExpr) && pMainVariable.initExpr.isConst()) {
    //     //     pMainVariable.prepareDefaultValue();
    //     // }
    // }

    // private addUsedComplexType(type: ITypeInstruction): void {
    //     if (type.isBase() || isDef(this._usedComplexTypeMap[type.instructionID])) {
    //         return;
    //     }

    //     this._usedComplexTypeMap[type.instructionID] = type;
    //     let fieldNames: string[] = type.fieldNames;

    //     for (let i: number = 0; i < fieldNames.length; i++) {
    //         this.addUsedComplexType(type.getField(fieldNames[i]).type.baseType);
    //     }
    // }


    // private addUsedInfoFromFunction(pFunction: IFunctionDeclInstruction): void {
    //     pFunction.generateInfoAboutUsedData();

    //     let pUniformVarMap: IMap<IVariableDeclInstruction> = pFunction.uniformVariableMap;
    //     let pTextureVarMap: IMap<IVariableDeclInstruction> = pFunction.textureVariableMap;
    //     let pUsedComplexTypeMap: IMap<ITypeInstruction> = pFunction.usedComplexTypeMap;

    //     for (let j in pTextureVarMap) {
    //         this._textureVariableMap[pTextureVarMap[j].instructionID] = pTextureVarMap[j];
    //     }

    //     for (let j in pUniformVarMap) {
    //         {
    //             this._uniformVariableMap[pUniformVarMap[j].instructionID] = pUniformVarMap[j];
    //         }
    //     }

    //     for (let j in pUsedComplexTypeMap) {
    //         this._usedComplexTypeMap[pUsedComplexTypeMap[j].instructionID] = pUsedComplexTypeMap[j];
    //     }

    //     this.addExtSystemFunction(pFunction);
    // }

    // private addExtSystemFunction(pFunction: IFunctionDeclInstruction): void {
    //     if (pFunction.instructionType === EInstructionTypes.k_SystemFunctionInstruction) {
    //         if (this._extSystemFunctionList.indexOf(pFunction) !== -1) {
    //             return;
    //         }

    //         this._extSystemFunctionList.push(pFunction);
    //     }

    //     let types = pFunction.extSystemTypeList;
    //     let pFunctions = pFunction.extSystemFunctionList;

    //     if (!isNull(types)) {
    //         for (let j: number = 0; j < types.length; j++) {
    //             if (this._extSystemTypeList.indexOf(types[j]) === -1) {
    //                 this._extSystemTypeList.push(types[j]);
    //             }
    //         }
    //     }

    //     if (!isNull(pFunctions)) {
    //         for (let j: number = 0; j < pFunctions.length; j++) {
    //             if (this._extSystemFunctionList.indexOf(pFunctions[j]) === -1) {
    //                 this._extSystemFunctionList.unshift(pFunctions[j]);
    //             }
    //         }
    //     }
    // }

    // private isVariableTypeUse(pVariableType: IVariableTypeInstruction): boolean {
    //     let id: number = pVariableType.instructionID;

    //     if (!isDef(this._usedVarTypeMap[id])) {
    //         return false;
    //     }

    //     if (this._usedVarTypeMap[id].numUsed === 0) {
    //         return false;
    //     }

    //     return true;
    // }

    
    $overwriteType(type: EFunctionType) {
        this._functionType = type;
    }

}
