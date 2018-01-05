import { ERenderStates } from "./ERenderStates";
import { ERenderStateValues } from "./ERenderStateValues";
import { IMap } from "./IMap";
import { IParseNode } from "./parser/IParser";

export enum EAFXInstructionTypes {
	k_Instruction = 0,
	k_InstructionCollector,
	k_SimpleInstruction,
	k_VariableTypeInstruction,
	k_SystemTypeInstruction,
	k_ComplexTypeInstruction,
	k_TypedInstruction,
	k_DeclInstruction,
	k_IntInstruction,
	k_FloatInstruction,
	k_BoolInstruction,
	k_StringInstruction,
	k_IdInstruction,
	k_KeywordInstruction,
	k_TypeDeclInstruction,
	k_VariableDeclInstruction,
	k_AnnotationInstruction,
	k_UsageTypeInstruction,
	k_BaseTypeInstruction,
	k_StructDeclInstruction,
	k_StructFieldsInstruction,
	k_ExprInstruction,
	k_IdExprInstruction,
	k_ArithmeticExprInstruction,
	k_AssignmentExprInstruction,
	k_RelationalExprInstruction,
	k_LogicalExprInstruction,
	k_ConditionalExprInstruction,
	k_CastExprInstruction,
	k_UnaryExprInstruction,
	k_PostfixIndexInstruction,
	k_PostfixPointInstruction,
	k_PostfixArithmeticInstruction,
	k_PrimaryExprInstruction,
	k_ComplexExprInstruction,
	k_FunctionCallInstruction,
	k_SystemCallInstruction,
	k_ConstructorCallInstruction,
	k_CompileExprInstruction,
	k_InitExprInstruction,
	k_SamplerStateBlockInstruction,
	k_SamplerStateInstruction,
	k_ExtractExprInstruction,
	k_MemExprInstruction,
	k_FunctionDeclInstruction,
	k_ShaderFunctionInstruction,
	k_SystemFunctionInstruction,
	k_FunctionDefInstruction,
	k_StmtInstruction,
	k_StmtBlockInstruction,
	k_ExprStmtInstruction,
	k_BreakStmtInstruction,
	k_WhileStmtInstruction,
	k_ForStmtInstruction,
	k_IfStmtInstruction,
	k_DeclStmtInstruction,
	k_ReturnStmtInstruction,
	k_ExtractStmtInstruction,
	k_SemicolonStmtInstruction,
	k_PassInstruction,
	k_TechniqueInstruction
}


export enum EFunctionType {
	k_Vertex = 0,
	k_Pixel = 1,
	k_Fragment = 1,
	k_Function = 2,
	k_PassFunction = 3
}

export enum ECheckStage {
	CODE_TARGET_SUPPORT, /* Отсутсвуют конструкции не поддерживаемые языком назначения (GLSL) */
	SELF_CONTAINED /* Код замкнут, нет не определенных функций, пассов, техник. Нет мертвых функций. */
	// VALIDATION  /* Код не содерит синтаксиески неправильных выражений, то что не исчерпывается */ 
}

export enum EVarUsedMode {
	k_Read,
	k_Write,
	k_ReadWrite,
	k_Undefined,
	k_Default = k_ReadWrite
}

export interface IAFXInstructionStateMap extends IMap<string> {
}

export interface IAFXInstructionRoutine {
	(): void;
}

export interface IAFXInstructionError {
	code: number;
	info: any;
}

export interface IAFXTypeUseInfoContainer {
	type: IAFXVariableTypeInstruction;
	isRead: boolean;
	isWrite: boolean;
	numRead: number;
	numWrite: number;
	numUsed: number;
}

export enum EExtractExprType {
	k_Header,

	k_Float,
	k_Int,
	k_Bool,

	k_Float2,
	k_Int2,
	k_Bool2,

	k_Float3,
	k_Int3,
	k_Bool3,

	k_Float4,
	k_Int4,
	k_Bool4,

	k_Float4x4
}

export enum EAFXBlendMode {
	k_Shared,
	k_Uniform,
	k_Attribute,
	k_Foreign,
	k_Global,
	k_Varying,
	k_TypeDecl,
	k_VertexOut
}

export interface IAFXImportedTechniqueInfo {
	technique: IAFXTechniqueInstruction;
	shift: number;
}

/**
 * All opertion are represented by: 
 * operator : arg1 ... argn
 * Operator and instructions may be empty.
 */
export interface IAFXInstruction {

	_setParent(pParent: IAFXInstruction): void;
	_getParent(): IAFXInstruction;

	_setOperator(sOperator: string): void;
	_getOperator(): string;

	_setInstructions(pInstructionList: IAFXInstruction[]): void;
	_getInstructions(): IAFXInstruction[];

	_getInstructionType(): EAFXInstructionTypes;
	_getInstructionID(): number;
	_getScope(): number;
	_setScope(iScope: number): void;
	_isInGlobalScope(): boolean;

	_check(eStage: ECheckStage): boolean;
	_getLastError(): IAFXInstructionError;
	_setError(eCode: number, pInfo?: any): void;
	_clearError(): void;
	_isErrorOccured(): boolean;

	_setVisible(isVisible: boolean): void;
	_isVisible(): boolean;

	_initEmptyInstructions(): void;

	// /**
	//  * Contain states of instruction
	//  */
	// stateMap: IAFXInstructionStateMap;

	_push(pInstruction: IAFXInstruction, isSetParent?: boolean): void;

	// changeState(sStateName: string, sValue: string): void;
	// changeState(iStateIndex: number, sValue: string): void;

	// stateChange(): void;
	// isStateChange(): boolean;

	_addRoutine(fnRoutine: IAFXInstructionRoutine, iPriority?: number);
	_prepareFor(eUsedType: EFunctionType): void;

	toString(): string;
	_toFinalCode(): string;

	_clone(pRelationMap?: IMap<IAFXInstruction>): IAFXInstruction;
}

export interface IAFXSimpleInstruction extends IAFXInstruction {
	_setValue(sValue: string): void;
	_isValue(sValue: string): boolean;
}

export interface IAFXTypeInstruction extends IAFXInstruction {
	_toDeclString(): string;

	_isBuiltIn(): boolean;
	_setBuiltIn(isBuiltIn: boolean): void;

	/**
	 * Simple tests
	 */
	_isBase(): boolean;
	_isArray(): boolean;
	_isNotBaseArray(): boolean;
	_isComplex(): boolean;
	_isEqual(pType: IAFXTypeInstruction): boolean;
	_isStrongEqual(pType: IAFXTypeInstruction): boolean;
	_isConst(): boolean;

	_isSampler(): boolean;
	_isSamplerCube(): boolean;
	_isSampler2D(): boolean;

	_isWritable(): boolean;
	_isReadable(): boolean;

	_containArray(): boolean;
	_containSampler(): boolean;
	_containPointer(): boolean;
	_containComplexType(): boolean;
	/**
	 * Set private params
	 */
	_setName(sName: string): void;
	_canWrite(isWritable: boolean): void;
	_canRead(isReadable: boolean): void;

	// markAsUsed(): void;

	/**
	 * get type info
	 */
	_getName(): string;
	_getRealName(): string;
	_getHash(): string;
	_getStrongHash(): string;
	_getSize(): number;
	_getBaseType(): IAFXTypeInstruction;
	_getLength(): number;
	_getArrayElementType(): IAFXTypeInstruction;
	_getTypeDecl(): IAFXTypeDeclInstruction;

	// Fields

	_hasField(sFieldName: string): boolean;
	_hasFieldWithSematic(sSemantic: string);
	_hasAllUniqueSemantics(): boolean;
	_hasFieldWithoutSemantic(): boolean;

	_getField(sFieldName: string): IAFXVariableDeclInstruction;
	_getFieldBySemantic(sSemantic: string): IAFXVariableDeclInstruction;
	_getFieldType(sFieldName: string): IAFXVariableTypeInstruction;
	_getFieldNameList(): string[];

	/**
	 * System
	 */
	_clone(pRelationMap?: IMap<IAFXInstruction>): IAFXTypeInstruction;
	_blend(pType: IAFXTypeInstruction, eMode: EAFXBlendMode): IAFXTypeInstruction;
}

export interface IAFXVariableTypeInstruction extends IAFXTypeInstruction {
	_setCollapsed(bValue: boolean): void;
	_isCollapsed(): boolean;

	/**
	 * Simple tests
	 */
	_isPointer(): boolean;
	_isStrictPointer(): boolean;
	_isPointIndex(): boolean;

	_isFromVariableDecl(): boolean;
	_isFromTypeDecl(): boolean;

	_isUniform(): boolean;
	_isGlobal(): boolean;
	_isConst(): boolean;
	_isShared(): boolean;
	_isForeign(): boolean;

	_isTypeOfField(): boolean;
	_isUnverifiable(): boolean;

	// /**
	//  * set type info
	//  */
	// _markUsedForWrite(): boolean;
	// _markUsedForRead(): boolean;
	// _goodForRead(): boolean;

	// _markAsField(): void;

	/**
	 * init api
	 */
	_setPadding(iPadding: number): void;
	_pushType(pType: IAFXTypeInstruction): void;
	_addUsage(sUsage: string): void;
	_addArrayIndex(pExpr: IAFXExprInstruction): void;
	_addPointIndex(isStrict?: boolean): void;
	_setVideoBuffer(pBuffer: IAFXVariableDeclInstruction): void;
	_initializePointers(): void;

	_setPointerToStrict(): void;
	_addPointIndexInDepth(): void;
	_setVideoBufferInDepth(): void;
	_markAsUnverifiable(isUnverifiable: boolean): void;
	_addAttrOffset(pOffset: IAFXVariableDeclInstruction): void;

	/**
	 * Type info
	 */
	_getPadding(): number;
	_getArrayElementType(): IAFXVariableTypeInstruction;

	_getUsageList(): string[];
	_getSubType(): IAFXTypeInstruction;

	_hasUsage(sUsageName: string): boolean;
	_hasVideoBuffer(): boolean;

	_getPointDim(): number;
	_getPointer(): IAFXVariableDeclInstruction;
	_getVideoBuffer(): IAFXVariableDeclInstruction;
	_getFieldExpr(sFieldName: string): IAFXIdExprInstruction;
	_getFieldIfExist(sFieldName: string): IAFXVariableDeclInstruction;

	_getSubVarDecls(): IAFXVariableDeclInstruction[];

	_getFullName(): string;
	_getVarDeclName(): string;
	_getTypeDeclName(): string;

	_getParentVarDecl(): IAFXVariableDeclInstruction;
	_getParentContainer(): IAFXVariableDeclInstruction;
	_getMainVariable(): IAFXVariableDeclInstruction;

	_getMainPointer(): IAFXVariableDeclInstruction;
	_getUpPointer(): IAFXVariableDeclInstruction;
	_getDownPointer(): IAFXVariableDeclInstruction;
	_getAttrOffset(): IAFXVariableDeclInstruction;

	/**
	 * System
	 */
	_wrap(): IAFXVariableTypeInstruction;
	_clone(pRelationMap?: IMap<IAFXInstruction>): IAFXVariableTypeInstruction;
	_blend(pVariableType: IAFXVariableTypeInstruction, eMode: EAFXBlendMode): IAFXVariableTypeInstruction;

	_setCloneHash(sHash: string, sStrongHash: string): void;
	_setCloneArrayIndex(pElementType: IAFXVariableTypeInstruction,
		pIndexExpr: IAFXExprInstruction, iLength: number): void;
	_setClonePointeIndexes(nDim: number, pPointerList: IAFXVariableDeclInstruction[]): void;
	_setCloneFields(pFieldMap: IMap<IAFXVariableDeclInstruction>): void;

	_setUpDownPointers(pUpPointer: IAFXVariableDeclInstruction,
		pDownPointer: IAFXVariableDeclInstruction): void;
}

export interface IAFXTypedInstruction extends IAFXInstruction {
	_getType(): IAFXTypeInstruction;
	_setType(pType: IAFXTypeInstruction): void;

	_clone(pRelationMap?: IMap<IAFXInstruction>): IAFXTypedInstruction;
}

export interface IAFXDeclInstruction extends IAFXTypedInstruction {
	_setSemantic(sSemantic: string);
	_setAnnotation(pAnnotation: IAFXAnnotationInstruction): void;
	_getName(): string;
	_getRealName(): string;
	_getNameId(): IAFXIdInstruction;
	_getSemantic(): string;

	_isBuiltIn(): boolean;
	_setBuiltIn(isBuiltIn: boolean): void;

	_isForAll(): boolean;
	_isForPixel(): boolean;
	_isForVertex(): boolean;

	_setForAll(canUse: boolean): void;
	_setForPixel(canUse: boolean): void;
	_setForVertex(canUse: boolean): void;

	_clone(pRelationMap?: IMap<IAFXInstruction>): IAFXDeclInstruction;
}

export interface IAFXTypeDeclInstruction extends IAFXDeclInstruction {
	_clone(pRelationMap?: IMap<IAFXInstruction>): IAFXTypeDeclInstruction;
	_blend(pDecl: IAFXTypeDeclInstruction, eBlendMode: EAFXBlendMode): IAFXTypeDeclInstruction;
}

export interface IAFXVariableDeclInstruction extends IAFXDeclInstruction {
	_hasInitializer(): boolean;
	_getInitializeExpr(): IAFXInitExprInstruction;
	_hasConstantInitializer(): boolean;

	_lockInitializer(): void;
	_unlockInitializer(): void;

	_getDefaultValue(): any;
	_prepareDefaultValue(): void;

	_getValue(): any;
	_setValue(pValue: any): any;

	_getType(): IAFXVariableTypeInstruction;
	_setType(pType: IAFXVariableTypeInstruction): void;

	_isUniform(): boolean;
	_isField(): boolean;
	_isPointer(): boolean;
	_isVideoBuffer(): boolean;
	_isSampler(): boolean;

	_getSubVarDecls(): IAFXVariableDeclInstruction[];

	_isDefinedByZero(): boolean;
	_defineByZero(isDefine: boolean): void;

	_setAttrExtractionBlock(pCodeBlock: IAFXInstruction): void;
	_getAttrExtractionBlock(): IAFXInstruction;

	_markAsVarying(bValue: boolean): void;
	_markAsShaderOutput(isShaderOutput: boolean): void;
	_isShaderOutput(): boolean;

	_getNameIndex(): number;
	_getFullNameExpr(): IAFXExprInstruction;
	_getFullName(): string;
	_getVideoBufferSampler(): IAFXVariableDeclInstruction;
	_getVideoBufferHeader(): IAFXVariableDeclInstruction;
	_getVideoBufferInitExpr(): IAFXInitExprInstruction;

	_setName(sName: string): void;
	_setRealName(sName: string): void;
	_setVideoBufferRealName(sSampler: string, sHeader: string): void;

	_setCollapsed(bValue: boolean): void;
	_isCollapsed(): boolean;

	_clone(pRelationMap?: IMap<IAFXInstruction>): IAFXVariableDeclInstruction;
	_blend(pVariableDecl: IAFXVariableDeclInstruction, eMode: EAFXBlendMode): IAFXVariableDeclInstruction;
}

export interface IAFXFunctionDeclInstruction extends IAFXDeclInstruction {
	_toFinalDefCode(): string;

	//_getNameId(): IAFXIdInstruction;
	_hasImplementation(): boolean;
	_getArguments(): IAFXTypedInstruction[];
	_getNumNeededArguments(): number;
	_getReturnType(): IAFXVariableTypeInstruction;
	_getFunctionType(): EFunctionType;
	_setFunctionType(eType: EFunctionType): void;

	_getVertexShader(): IAFXFunctionDeclInstruction;
	_getPixelShader(): IAFXFunctionDeclInstruction;

	// closeArguments(pArguments: IAFXInstruction[]): IAFXTypedInstruction[];
	_setFunctionDef(pFunctionDef: IAFXDeclInstruction): void;
	_setImplementation(pImplementation: IAFXStmtInstruction): void;

	_clone(pRelationMap?: IMap<IAFXInstruction>): IAFXFunctionDeclInstruction;

	//addUsedVariableType(pType: IAFXVariableTypeInstruction, eUsedMode: EVarUsedMode): boolean;

	_addOutVariable(pVariable: IAFXVariableDeclInstruction): boolean;
	_getOutVariable(): IAFXVariableDeclInstruction;

	_markUsedAs(eUsedType: EFunctionType): void;
	_isUsedAs(eUsedType: EFunctionType): boolean;
	_isUsedAsFunction(): boolean;
	_isUsedAsVertex(): boolean;
	_isUsedAsPixel(): boolean;
	_isUsed(): boolean;
	_markUsedInVertex(): void;
	_markUsedInPixel(): void;
	_isUsedInVertex(): boolean;
	_isUsedInPixel(): boolean;
	_checkVertexUsage(): boolean;
	_checkPixelUsage(): boolean;

	_checkDefenitionForVertexUsage(): boolean;
	_checkDefenitionForPixelUsage(): boolean;

	_canUsedAsFunction(): boolean;
	_notCanUsedAsFunction(): void;

	_addUsedFunction(pFunction: IAFXFunctionDeclInstruction): boolean;
	_getUsedFunctionList(): IAFXFunctionDeclInstruction[];
	_addUsedVariable(pVariable: IAFXVariableDeclInstruction): void;

	_isBlackListFunction(): boolean;
	_addToBlackList(): void;
	_getStringDef(): string;

	_convertToVertexShader(): IAFXFunctionDeclInstruction;
	_convertToPixelShader(): IAFXFunctionDeclInstruction;

	_prepareForVertex(): void;
	_prepareForPixel(): void;

	_generateInfoAboutUsedData(): void;

	_getAttributeVariableMap(): IMap<IAFXVariableDeclInstruction>;
	_getVaryingVariableMap(): IMap<IAFXVariableDeclInstruction>;

	_getSharedVariableMap(): IMap<IAFXVariableDeclInstruction>;
	_getGlobalVariableMap(): IMap<IAFXVariableDeclInstruction>;
	_getUniformVariableMap(): IMap<IAFXVariableDeclInstruction>;
	_getForeignVariableMap(): IMap<IAFXVariableDeclInstruction>;
	_getTextureVariableMap(): IMap<IAFXVariableDeclInstruction>;
	_getUsedComplexTypeMap(): IMap<IAFXTypeInstruction>;

	_getAttributeVariableKeys(): number[];
	_getVaryingVariableKeys(): number[];

	_getSharedVariableKeys(): number[];
	_getUniformVariableKeys(): number[];
	_getForeignVariableKeys(): number[];
	_getGlobalVariableKeys(): number[];
	_getTextureVariableKeys(): number[];
	_getUsedComplexTypeKeys(): number[];

	_getExtSystemFunctionList(): IAFXFunctionDeclInstruction[];
	_getExtSystemMacrosList(): IAFXSimpleInstruction[];
	_getExtSystemTypeList(): IAFXTypeDeclInstruction[];
}

export interface IAFXStructDeclInstruction extends IAFXInstruction {
	//id: IAFXIdInstruction
	//structFields: IAFXStructInstruction
}

// export interface IAFXBaseTypeInstruction extends IAFXInstruction {
//	 //id: IAFXIdInstruction
//	 //...
// }

export interface IAFXIdInstruction extends IAFXInstruction {
	_getName(): string;
	_getRealName(): string;

	_setName(sName: string): void;
	_setRealName(sName: string): void;

	_markAsVarying(bValue: boolean): void;

	_clone(pRelationMap?: IMap<IAFXInstruction>): IAFXIdInstruction;
}

export interface IAFXKeywordInstruction extends IAFXInstruction {
	_setValue(sValue: string): void;
	_isValue(sTestValue: string): boolean;
}

export interface IAFXAnalyzedInstruction extends IAFXInstruction {
	_addUsedData(pUsedDataCollector: IMap<IAFXTypeUseInfoContainer>, eUsedMode?: EVarUsedMode): void;
}

export interface IAFXExprInstruction extends IAFXTypedInstruction, IAFXAnalyzedInstruction {
	_evaluate(): boolean;
	_simplify(): boolean;
	_getEvalValue(): any;
	_isConst(): boolean;
	_getType(): IAFXVariableTypeInstruction;

	_clone(pRelationMap?: IMap<IAFXInstruction>): IAFXExprInstruction;
}

export interface IAFXInitExprInstruction extends IAFXExprInstruction {
	_optimizeForVariableType(pType: IAFXVariableTypeInstruction): boolean;
	// getExternalValue(pType: IAFXVariableTypeInstruction): any;
}

export interface IAFXIdExprInstruction extends IAFXExprInstruction {
	_clone(pRelationMap?: IMap<IAFXInstruction>): IAFXIdExprInstruction;
}

export interface IAFXLiteralInstruction extends IAFXExprInstruction {
	_setValue(pValue: any): void;
	_clone(pRelationMap?: IMap<IAFXInstruction>): IAFXLiteralInstruction;
}

export interface IAFXAnnotationInstruction extends IAFXInstruction {
}

export interface IAFXStmtInstruction extends IAFXInstruction, IAFXAnalyzedInstruction {
}

export interface IAFXPassInstruction extends IAFXDeclInstruction {
	_addFoundFunction(pNode: IParseNode, pShader: IAFXFunctionDeclInstruction, eType: EFunctionType): void;
	_getFoundedFunction(pNode: IParseNode): IAFXFunctionDeclInstruction;
	_getFoundedFunctionType(pNode: IParseNode): EFunctionType;
	_setParseNode(pNode: IParseNode): void;
	_getParseNode(): IParseNode;
	_markAsComplex(isComplex: boolean): void;
	_addCodeFragment(sCode: string): void;

	_getSharedVariableMapV(): IMap<IAFXVariableDeclInstruction>;
	_getGlobalVariableMapV(): IMap<IAFXVariableDeclInstruction>;
	_getUniformVariableMapV(): IMap<IAFXVariableDeclInstruction>;
	_getForeignVariableMapV(): IMap<IAFXVariableDeclInstruction>;
	_getTextureVariableMapV(): IMap<IAFXVariableDeclInstruction>;
	_getUsedComplexTypeMapV(): IMap<IAFXTypeInstruction>;

	_getSharedVariableMapP(): IMap<IAFXVariableDeclInstruction>;
	_getGlobalVariableMapP(): IMap<IAFXVariableDeclInstruction>;
	_getUniformVariableMapP(): IMap<IAFXVariableDeclInstruction>;
	_getForeignVariableMapP(): IMap<IAFXVariableDeclInstruction>;
	_getTextureVariableMapP(): IMap<IAFXVariableDeclInstruction>;
	_getUsedComplexTypeMapP(): IMap<IAFXTypeInstruction>;

	_getFullUniformMap(): IMap<IAFXVariableDeclInstruction>;
	_getFullForeignMap(): IMap<IAFXVariableDeclInstruction>;
	_getFullTextureMap(): IMap<IAFXVariableDeclInstruction>;

	_getVertexShader(): IAFXFunctionDeclInstruction;
	_getPixelShader(): IAFXFunctionDeclInstruction;

	_addOwnUsedForignVariable(pVarDecl: IAFXVariableDeclInstruction): void;
	_addShader(pShader: IAFXFunctionDeclInstruction): void;
	_setState(eType: ERenderStates, eValue: ERenderStateValues): void;
	_finalizePass(): void;

	_isComplexPass(): boolean;
	_evaluate(pEngineStates: any, pForeigns: any, pUniforms: any): boolean;

	_getState(eType: ERenderStates): ERenderStateValues;
	_getRenderStates(): IMap<ERenderStateValues>;
}

export interface IAFXTechniqueInstruction extends IAFXDeclInstruction {
	_setName(sName: string, isComplexName: boolean): void;
	_getName(): string;
	_hasComplexName(): boolean;

	_isPostEffect(): boolean;

	_addPass(pPass: IAFXPassInstruction): void;
	_getPassList(): IAFXPassInstruction[];
	_getPass(iPass: number): IAFXPassInstruction;

	_totalOwnPasses(): number;
	_totalPasses(): number;
}

export interface IAFXVariableBlendInfo {
	varList: IAFXVariableDeclInstruction[];
	blendType: IAFXVariableTypeInstruction;
	name: string;
	nameIndex: number;
}

export interface IAFXVariableBlendInfoMap {
	[index: number]: IAFXVariableBlendInfo;
}

export interface IAFXFunctionDeclListMap {
	[functionName: string]: IAFXFunctionDeclInstruction[];
}

