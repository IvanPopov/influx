import { EScopeType } from '../idl/IScope'
import { IParseNode, IParseTree } from '../idl/parser/IParser';
import { IAFXInstruction, IAFXFunctionDeclInstruction, IAFXPassInstruction, IAFXSimpleInstruction,
    IAFXVariableDeclInstruction, IAFXTechniqueInstruction, IAFXTypedInstruction,
    IAFXVariableTypeInstruction, IAFXIdInstruction, IAFXTypeInstruction, IAFXTypeDeclInstruction,
    IAFXInstructionError, IAFXExprInstruction, EFunctionType, EAFXInstructionTypes, ECheckStage,
    IAFXAnnotationInstruction, IAFXInitExprInstruction, IAFXIdExprInstruction, IAFXStmtInstruction,
    IAFXDeclInstruction, IAFXLiteralInstruction } from '../idl/IAFXInstruction';
import { IAFXEffect, IAFXEffectStats } from '../idl/IAFXEffect';
import { IMap } from '../idl/IMap';
import { time } from '../time';
import { isDef } from '../common';
import { isNull } from 'util';
import { SystemTypeInstruction } from './instructions/SystemTypeInstruction';
import { ComplexTypeInstruction } from './instructions/ComplexTypeInstruction';
import { SystemFunctionInstruction } from './instructions/SystemFunctionInstruction';
import { VariableDeclInstruction } from './instructions/VariableInstruction';
import { IdInstruction } from './instructions/IdInstruction';
import { VariableTypeInstruction } from './instructions/VariableTypeInstruction';
import { InstructionCollector } from './instructions/InstructionCollector';
import { ExprTemplateTranslator } from './ExprTemplateTranslator';
import { EEffectErrors, EEffectTempErrors } from '../idl/EEffectErrors';
import { logger } from '../logger';
import { ISourceLocation, ILoggerEntity } from '../idl/ILogger';
import { FunctionDefInstruction } from './instructions/FunctionDefInstruction';
import { InitExprInstruction } from './instructions/InitExprInstruction';
import { CompileExprInstruction } from './instructions/CompileExprInstruction';
import { SamplerStateBlockInstruction } from './instructions/SamplerStateBlockInstruction';
import { FunctionCallInstruction } from './instructions/FunctionCallInstruction';
import { IdExprInstruction } from './instructions/IdExprInstruction';
import { FunctionDeclInstruction } from './instructions/FunctionInstruction';
import { SystemCallInstruction } from './instructions/SystemCallInstruction';
import { PrimaryExprInstruction } from './instructions/PrimaryExprInstruction';
import { ComplexExprInstruction } from './instructions/ComplexExprInstruction';
import { ConstructorCallInstruction } from './instructions/ConstructorCallInstruction';
import { PostfixIndexInstruction } from './instructions/PostfixIndexInstruction';
import { PostfixArithmeticInstruction } from './instructions/PostfixArithmeticInstruction';
import { PostfixPointInstruction } from './instructions/PostfixPointInstruction';
import { UnaryExprInstruction } from './instructions/UnaryExprInstruction';
import { ConditionalExprInstruction } from './instructions/ConditionalExprInstruction';
import { ArithmeticExprInstruction } from './instructions/ArithmeticExprInstruction';
import { CastExprInstruction } from './instructions/CastExprInstruction'
import { LogicalExprInstruction } from './instructions/LogicalExprInstruction'
import { StmtBlockInstruction } from './instructions/StmtBlockInstruction';
import { ReturnStmtInstruction } from './instructions/ReturnStmtInstruction';
import { SemicolonStmtInstruction } from './instructions/SemicolonStmtInstruction';
import { ExprStmtInstruction } from './instructions/ExprStmtInstruction';
import { ForStmtInstruction } from './instructions/ForStmtInstruction';
import { PassInstruction } from './instructions/PassInstruction';
import { ERenderStates } from '../idl/ERenderStates';
import { ERenderStateValues } from '../idl/ERenderStateValues';
import { ExtractStmtInstruction } from './instructions/ExtractStmtInstruction';
import { TechniqueInstruction } from './instructions/TechniqueInstruction';
import { IfStmtInstruction } from './instructions/IfStmtInstruction';
import { AssignmentExprInstruction } from './instructions/AssignmentExprInstruction';
import { SimpleInstruction } from './instructions/SimpleInstruction';
import { TypeDeclInstruction } from './instructions/TypeInstruction'
import { MemExprInstruction } from './instructions/MemExprInstruction';
import { RelationalExprInstruction } from './instructions/RelationalExprInstruction';
import { BoolInstruction } from './instructions/BoolInstruction';
import { StringInstruction } from './instructions/StringInstruction';
import { FloatInstruction } from './instructions/FloatInstruction';
import { IntInstruction } from './instructions/IntInstruction';
import { DeclStmtInstruction } from './instructions/DeclStmtInstruction';
import { BreakStmtInstruction } from './instructions/BreakStmtInstruction';
import { WhileStmtInstruction } from './instructions/WhileStmtInstruction';
import { IEffectErrorInfo } from '../idl/IEffectErrorInfo';
import { ProgramScope } from './ProgramScope';
import * as fx from './fx';


const TEMPLATE_TYPE = 'template';

export class Effect implements IAFXEffect {
    public static pSystemMacros: IMap<IAFXSimpleInstruction> = null;
    public static pSystemTypes: IMap<SystemTypeInstruction> = null;
    public static pSystemFunctions: IMap<SystemFunctionInstruction[]> = null;
    public static pSystemVariables: IMap<IAFXVariableDeclInstruction> = null;
    public static pSystemVertexOut: ComplexTypeInstruction = null;

    private _pParseTree: IParseTree = null;
    private _pAnalyzedNode: IParseNode = null;
    private _pEffectScope: ProgramScope = new ProgramScope();
    private _pCurrentFunction: IAFXFunctionDeclInstruction = null;
    private _pCurrentPass: IAFXPassInstruction = null;
    private _bHaveCurrentFunctionReturnOccur = false;
    private _pStatistics: IAFXEffectStats = null;
    private _sAnalyzedFileName: string = '';
    private _pSystemMacros: IMap<IAFXSimpleInstruction> = null;
    private _pSystemTypes: IMap<SystemTypeInstruction> = null;
    private _pSystemFunctionsMap: IMap<SystemFunctionInstruction[]> = null;
    private _pSystemFunctionHashMap: IMap<boolean> = null;
    private _pSystemVariables: IMap<IAFXVariableDeclInstruction> = null;
    private _pPointerForExtractionList: IAFXVariableDeclInstruction[] = null;
    private _pFunctionWithImplementationList: IAFXFunctionDeclInstruction[] = [];
    private _pTechniqueList: IAFXTechniqueInstruction[] = [];
    private _pTechniqueMap: IMap<IAFXTechniqueInstruction> = {};
    private _isAnalyzeInPass: boolean = false;
    private _sProvideNameSpace: string = '';

    constructor() {
        this.initSystemMacros();
        this.initSystemTypes();
        this.initSystemFunctions();
        this.initSystemVariables();
    }

    public static getBaseVertexOutType(): ComplexTypeInstruction {
        return Effect.pSystemVertexOut;
    }
    public static getSystemType(sTypeName: string): SystemTypeInstruction {
        //boolean, string, float and others
        return isDef(Effect.pSystemTypes[sTypeName]) ? Effect.pSystemTypes[sTypeName] : null;
    }

    public static getSystemVariable(sName: string): IAFXVariableDeclInstruction {
        return isDef(Effect.pSystemVariables[sName]) ? Effect.pSystemVariables[sName] : null;
    }

    public static getSystemMacros(sName: string): IAFXSimpleInstruction {
        return isDef(Effect.pSystemMacros[sName]) ? Effect.pSystemMacros[sName] : null;
    }

    public static findSystemFunction(sFunctionName: string,
        pArguments: IAFXTypedInstruction[]): IAFXFunctionDeclInstruction {
        let pSystemFunctions: SystemFunctionInstruction[] = Effect.pSystemFunctions[sFunctionName];

        if (!isDef(pSystemFunctions)) {
            return null;
        }

        if (isNull(pArguments)) {
            for (let i: number = 0; i < pSystemFunctions.length; i++) {
                if (pSystemFunctions[i]._getNumNeededArguments() === 0) {
                    return <IAFXFunctionDeclInstruction>pSystemFunctions[i];
                }
            }
        }

        for (let i: number = 0; i < pSystemFunctions.length; i++) {
            if (pArguments.length !== pSystemFunctions[i]._getNumNeededArguments()) {
                continue;
            }

            let pTestedArguments: IAFXTypedInstruction[] = pSystemFunctions[i]._getArguments();

            let isOk: boolean = true;

            for (let j: number = 0; j < pArguments.length; j++) {
                isOk = false;

                if (!pArguments[j]._getType()._isEqual(pTestedArguments[j]._getType())) {
                    break;
                }

                isOk = true;
            }

            if (isOk) {
                return <IAFXFunctionDeclInstruction>pSystemFunctions[i];
            }
        }
        return null;
    }

    public static createVideoBufferVariable(): IAFXVariableDeclInstruction {
        const pBuffer: IAFXVariableDeclInstruction = new VariableDeclInstruction();
        const pBufferType: IAFXVariableTypeInstruction = new VariableTypeInstruction();
        const pBufferName: IAFXIdInstruction = new IdInstruction();

        pBufferType._pushType(Effect.getSystemType('video_buffer'));

        pBuffer._push(pBufferType, true);
        pBuffer._push(pBufferName, true);

        return pBuffer;
    }

    public static getExternalType(pType: IAFXTypeInstruction): any {
        if (pType._isEqual(Effect.getSystemType('number')) ||
            pType._isEqual(Effect.getSystemType('float'))) {
            return Number;
        }
        else if (pType._isEqual(Effect.getSystemType('bool'))) {
            return 'Boolean';
        }
        else if (pType._isEqual(Effect.getSystemType('float2')) ||
            pType._isEqual(Effect.getSystemType('bool2')) ||
            pType._isEqual(Effect.getSystemType('int2'))) {
            return 'Vec2';
        }
        else if (pType._isEqual(Effect.getSystemType('float3')) ||
            pType._isEqual(Effect.getSystemType('bool3')) ||
            pType._isEqual(Effect.getSystemType('int3'))) {
            return 'Vec3';
        }
        else if (pType._isEqual(Effect.getSystemType('float4')) ||
            pType._isEqual(Effect.getSystemType('bool4')) ||
            pType._isEqual(Effect.getSystemType('int4'))) {
            return 'Vec4';
        }
        else if (pType._isEqual(Effect.getSystemType('float2x2')) ||
            pType._isEqual(Effect.getSystemType('bool2x2')) ||
            pType._isEqual(Effect.getSystemType('int2x2'))) {
            return 'Vec2';
        }
        else if (pType._isEqual(Effect.getSystemType('float3x3')) ||
            pType._isEqual(Effect.getSystemType('bool3x3')) ||
            pType._isEqual(Effect.getSystemType('int3x3'))) {
            return 'Mat3';
        }
        else if (pType._isEqual(Effect.getSystemType('float4x4')) ||
            pType._isEqual(Effect.getSystemType('bool4x4')) ||
            pType._isEqual(Effect.getSystemType('int4x4'))) {
            return 'Mat4';
        }
        else {
            return null;
        }
    }

    public static isMatrixType(pType: IAFXTypeInstruction): boolean {
        return pType._isEqual(Effect.getSystemType('float2x2')) ||
            pType._isEqual(Effect.getSystemType('float3x3')) ||
            pType._isEqual(Effect.getSystemType('float4x4')) ||
            pType._isEqual(Effect.getSystemType('int2x2')) ||
            pType._isEqual(Effect.getSystemType('int3x3')) ||
            pType._isEqual(Effect.getSystemType('int4x4')) ||
            pType._isEqual(Effect.getSystemType('bool2x2')) ||
            pType._isEqual(Effect.getSystemType('bool3x3')) ||
            pType._isEqual(Effect.getSystemType('bool4x4'));
    }

    public static isVectorType(pType: IAFXTypeInstruction): boolean {
        return pType._isEqual(Effect.getSystemType('float2')) ||
            pType._isEqual(Effect.getSystemType('float3')) ||
            pType._isEqual(Effect.getSystemType('float4')) ||
            pType._isEqual(Effect.getSystemType('bool2')) ||
            pType._isEqual(Effect.getSystemType('bool3')) ||
            pType._isEqual(Effect.getSystemType('bool4')) ||
            pType._isEqual(Effect.getSystemType('int2')) ||
            pType._isEqual(Effect.getSystemType('int3')) ||
            pType._isEqual(Effect.getSystemType('int4'));
    }

    public static isScalarType(pType: IAFXTypeInstruction): boolean {
        return pType._isEqual(Effect.getSystemType('bool')) ||
            pType._isEqual(Effect.getSystemType('number')) ||
            pType._isEqual(Effect.getSystemType('ptr')) ||
            pType._isEqual(Effect.getSystemType('float'));
    }

    public static isFloatBasedType(pType: IAFXTypeInstruction): boolean {
        return pType._isEqual(Effect.getSystemType('float')) ||
            pType._isEqual(Effect.getSystemType('float2')) ||
            pType._isEqual(Effect.getSystemType('float3')) ||
            pType._isEqual(Effect.getSystemType('float4')) ||
            pType._isEqual(Effect.getSystemType('float2x2')) ||
            pType._isEqual(Effect.getSystemType('float3x3')) ||
            pType._isEqual(Effect.getSystemType('float4x4')) ||
            pType._isEqual(Effect.getSystemType('ptr'));
    }

    public static isIntBasedType(pType: IAFXTypeInstruction): boolean {
        return pType._isEqual(Effect.getSystemType('number')) ||
            pType._isEqual(Effect.getSystemType('int2')) ||
            pType._isEqual(Effect.getSystemType('int3')) ||
            pType._isEqual(Effect.getSystemType('int4')) ||
            pType._isEqual(Effect.getSystemType('int2x2')) ||
            pType._isEqual(Effect.getSystemType('int3x3')) ||
            pType._isEqual(Effect.getSystemType('int4x4'));
    }

    public static isBoolBasedType(pType: IAFXTypeInstruction): boolean {
        return pType._isEqual(Effect.getSystemType('bool')) ||
            pType._isEqual(Effect.getSystemType('bool2')) ||
            pType._isEqual(Effect.getSystemType('bool3')) ||
            pType._isEqual(Effect.getSystemType('bool4')) ||
            pType._isEqual(Effect.getSystemType('bool2x2')) ||
            pType._isEqual(Effect.getSystemType('bool3x3')) ||
            pType._isEqual(Effect.getSystemType('bool4x4'));
    }

    public static isSamplerType(pType: IAFXTypeInstruction): boolean {
        return pType._isEqual(Effect.getSystemType('sampler')) ||
            pType._isEqual(Effect.getSystemType('sampler2D')) ||
            pType._isEqual(Effect.getSystemType('samplerCUBE')) ||
            pType._isEqual(Effect.getSystemType('video_buffer'));
    }

    public analyze(pTree: IParseTree): boolean {
        let iParseTime: number = time();

        this._pParseTree = pTree;
        this._pStatistics = <IAFXEffectStats>{ time: 0 };

        try {
            this.newScope();
            this.analyzeGlobalUseDecls();
            this.analyzeGlobalProvideDecls();
            this.analyzeGlobalTypeDecls();
            this.analyzeFunctionDefinitions();
            this.analyzeGlobalImports();
            this.analyzeTechniqueImports();
            this.analyzeVariableDecls();
            this.analyzeFunctionDecls();
            this.analyzeTechniques();
            this.endScope();
        }
        catch (e) {
            throw e;
        }

        //Stats
        iParseTime = time() - iParseTime;
        this._pStatistics.time = iParseTime;

        return true;
    }

    public getStats(): IAFXEffectStats {
        return this._pStatistics;
    }

    public setAnalyzedFileName(sFileName: string): void {
        this._sAnalyzedFileName = sFileName;
    }

    public clear(): void {
        //todo
    }

    public getTechniqueList(): IAFXTechniqueInstruction[] {
        return this._pTechniqueList;
    }

    

    private generateSuffixLiterals(pLiterals: string[], pOutput: IMap<boolean>, iDepth: number = 0): void {
        if (iDepth >= pLiterals.length) {
            return;
        }

        if (iDepth === 0) {
            for (let i: number = 0; i < pLiterals.length; i++) {
                pOutput[pLiterals[i]] = true;
            }

            iDepth = 1;
        }

        const pOutputKeys: string[] = Object.keys(pOutput);

        for (let i: number = 0; i < pLiterals.length; i++) {
            for (let j: number = 0; j < pOutputKeys.length; j++) {
                if (pOutputKeys[j].indexOf(pLiterals[i]) !== -1) {
                    pOutput[pOutputKeys[j] + pLiterals[i]] = false;
                }
                else {
                    pOutput[pOutputKeys[j] + pLiterals[i]] = (pOutput[pOutputKeys[j]] === false) ? false : true;
                }
            }
        }

        iDepth++;

        this.generateSuffixLiterals(pLiterals, pOutput, iDepth);
    }

    private initSystemMacros(): void {
        if (isNull(Effect.pSystemMacros)) {
            this._pSystemMacros = Effect.pSystemMacros = <IMap<IAFXSimpleInstruction>>{};
            this.addSystemMacros();
        }

        this._pSystemMacros = Effect.pSystemMacros;
    }

    private initSystemTypes(): void {
        if (isNull(Effect.pSystemTypes)) {
            this._pSystemTypes = Effect.pSystemTypes = {};
            this.addSystemTypeScalar();
            this.addSystemTypeVector();
            this.addSystemTypeMatrix();

            this.generateBaseVertexOutput();
        }

        this._pSystemTypes = Effect.pSystemTypes;
    }

    private initSystemFunctions(): void {
        if (isNull(Effect.pSystemFunctions)) {
            this._pSystemFunctionsMap = Effect.pSystemFunctions = {};
            this.addSystemFunctions();
        }

        this._pSystemFunctionsMap = Effect.pSystemFunctions;
    }

    private initSystemVariables(): void {
        if (isNull(Effect.pSystemVariables)) {
            this._pSystemVariables = Effect.pSystemVariables = <IMap<IAFXVariableDeclInstruction>>{};
            this.addSystemVariables();
        }

        this._pSystemVariables = Effect.pSystemVariables;
    }

    private addSystemMacros(): void {
        this.generateSystemMacros('ExtractMacros',
            '\n#ifdef AKRA_FRAGMENT\n' +
            '//#define texture2D(sampler, ) texture2D\n' +
            '#else\n' +
            '#define texture2D(A, B) texture2DLod(A, B, 0.)\n' +
            '#endif\n' +
            '#ifndef A_VB_COMPONENT3\n' +
            '#define A_VB_COMPONENT4\n' +
            '#endif\n' +
            '#ifdef A_VB_COMPONENT4\n' +
            '#define A_VB_ELEMENT_SIZE 4.\n' +
            '#endif\n' +
            '#ifdef A_VB_COMPONENT3\n' +
            '#define A_VB_ELEMENT_SIZE 3.\n' +
            '#endif\n' +
            '#define A_tex2D(S, H, X, Y) texture2D(S, vec2(H.stepX * X , H.stepY * Y))\n' +
            '#define A_tex2Dv(S, H, V) texture2D(S, V)\n');
    }


    private addSystemVariables(): void {
        this.generateSystemVariable('fragColor', 'gl_FragColor', 'float4', false, true, true);
        this.generateSystemVariable('fragCoord', 'gl_FragCoord', 'float4', false, true, true);
        this.generateSystemVariable('frontFacing', 'gl_FrontFacing', 'bool', false, true, true);
        this.generateSystemVariable('pointCoord', 'gl_PointCoord', 'float2', false, true, true);
        this.generateSystemVariable('resultAFXColor', 'resultAFXColor', 'float4', false, true, true);

        //Engine variable for passes
        this.generatePassEngineVariable();
    }

    private generateSystemVariable(sName: string, sRealName: string, sTypeName: string,
        isForVertex: boolean, isForPixel: boolean, isOnlyRead: boolean): void {

        if (isDef(this._pSystemVariables[sName])) {
            return;
        }

        let pVariableDecl: IAFXVariableDeclInstruction = new VariableDeclInstruction();
        let pName: IAFXIdInstruction = new IdInstruction();
        let pType: IAFXVariableTypeInstruction = new VariableTypeInstruction();

        pName._setName(sName);
        pName._setRealName(sRealName);

        pType._pushType(Effect.getSystemType(sTypeName));

        if (isOnlyRead) {
            pType._canWrite(false);
        }

        pVariableDecl._setForVertex(isForVertex);
        pVariableDecl._setForPixel(isForPixel);

        pVariableDecl._push(pType, true);
        pVariableDecl._push(pName, true);

        this._pSystemVariables[sName] = pVariableDecl;

        pVariableDecl._setBuiltIn(true);
    }

    private generatePassEngineVariable(): void {
        let pVariableDecl: IAFXVariableDeclInstruction = new VariableDeclInstruction();
        let pName: IAFXIdInstruction = new IdInstruction();
        let pType: IAFXVariableTypeInstruction = new VariableTypeInstruction();

        pType._canWrite(false);

        pType._markAsUnverifiable(true);
        pName._setName('engine');
        pName._setRealName('engine');

        pVariableDecl._push(pType, true);
        pVariableDecl._push(pName, true);

        this._pSystemVariables['engine'] = pVariableDecl;
    }

    private generateBaseVertexOutput(): void {
        //TODO: fix defenition of this variables

        let pOutBasetype: ComplexTypeInstruction = new ComplexTypeInstruction();

        let pPosition: VariableDeclInstruction = new VariableDeclInstruction();
        let pPointSize: VariableDeclInstruction = new VariableDeclInstruction();
        let pPositionType: VariableTypeInstruction = new VariableTypeInstruction();
        let pPointSizeType: VariableTypeInstruction = new VariableTypeInstruction();
        let pPositionId: IdInstruction = new IdInstruction();
        let pPointSizeId: IdInstruction = new IdInstruction();

        pPositionType._pushType(Effect.getSystemType('float4'));
        pPointSizeType._pushType(Effect.getSystemType('float'));

        pPositionId._setName('pos');
        pPositionId._setRealName('POSITION');

        pPointSizeId._setName('psize');
        pPointSizeId._setRealName('PSIZE');

        pPosition._push(pPositionType, true);
        pPosition._push(pPositionId, true);

        pPointSize._push(pPointSizeType, true);
        pPointSize._push(pPointSizeId, true);

        pPosition._setSemantic('POSITION');
        pPointSize._setSemantic('PSIZE');

        let pFieldCollector: IAFXInstruction = new InstructionCollector();
        pFieldCollector._push(pPosition, false);
        pFieldCollector._push(pPointSize, false);

        pOutBasetype.addFields(pFieldCollector, true);

        pOutBasetype._setName('VS_OUT');
        pOutBasetype.setRealName('VS_OUT_S');

        Effect.pSystemVertexOut = pOutBasetype;
    }

    private addSystemFunctions(): void {
        this._pSystemFunctionHashMap = <IMap<boolean>>{};

        this.generateSystemFunction('dot', 'dot($1,$2)', 'float', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('mul', '$1*$2', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'number', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('mod', 'mod($1,$2)', 'float', ['float', 'float'], null);
        this.generateSystemFunction('floor', 'floor($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('ceil', 'ceil($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('fract', 'fract($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('abs', 'abs($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('sign', 'sign($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('normalize', 'normalize($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('length', 'length($1)', 'float', [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('cross', 'cross($1, $2)', 'float3', ['float3', 'float3'], null);
        this.generateSystemFunction('reflect', 'reflect($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('max', 'max($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('max', 'max($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, 'float'], ['float2', 'float3', 'float4']);

        this.generateSystemFunction('min', 'min($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('min', 'min($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, 'float'], ['float2', 'float3', 'float4']);

        this.generateSystemFunction('mix', 'mix($1,$2,$3)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('mix', 'mix($1,$2,$3)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, 'float'], ['float2', 'float3', 'float4']);

        this.generateSystemFunction('clamp', 'clamp($1,$2,$3)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('clamp', 'clamp($1,$2,$3)', TEMPLATE_TYPE, [TEMPLATE_TYPE, 'float', 'float'], ['float2', 'float3', 'float4']);

        this.generateSystemFunction('pow', 'pow($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('mod', 'mod($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float2', 'float3', 'float4']);
        this.generateSystemFunction('mod', 'mod($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, 'float'], ['float2', 'float3', 'float4']);
        this.generateSystemFunction('exp', 'exp($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('exp2', 'exp2($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('log', 'log($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('log2', 'log2($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('inversesqrt', 'inversesqrt($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('sqrt', 'sqrt($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);

        this.generateSystemFunction('all', 'all($1)', 'bool', [TEMPLATE_TYPE], ['bool2', 'bool3', 'bool4']);
        this.generateSystemFunction('any', 'any($1)', 'bool', [TEMPLATE_TYPE], ['bool2', 'bool3', 'bool4']);
        this.generateSystemFunction('not', 'not($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['bool2', 'bool3', 'bool4']);

        this.generateSystemFunction('distance', 'distance($1,$2)', 'float', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);

        this.generateSystemFunction('lessThan', 'lessThan($1,$2)', 'bool2', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float2', 'int2']);
        this.generateSystemFunction('lessThan', 'lessThan($1,$2)', 'bool3', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float3', 'int3']);
        this.generateSystemFunction('lessThan', 'lessThan($1,$2)', 'bool4', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float4', 'int4']);

        this.generateSystemFunction('lessThanEqual', 'lessThanEqual($1,$2)', 'bool2', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float2', 'int2']);
        this.generateSystemFunction('lessThanEqual', 'lessThanEqual($1,$2)', 'bool3', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float3', 'int3']);
        this.generateSystemFunction('lessThanEqual', 'lessThanEqual($1,$2)', 'bool4', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float4', 'int4']);

        this.generateSystemFunction('equal', 'equal($1,$2)', 'bool2', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float2', 'int2']);
        this.generateSystemFunction('equal', 'equal($1,$2)', 'bool3', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float3', 'int3']);
        this.generateSystemFunction('equal', 'equal($1,$2)', 'bool4', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float4', 'int4']);
        this.generateSystemFunction('equal', 'equal($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ['bool2', 'bool3', 'bool4']);

        this.generateSystemFunction('notEqual', 'notEqual($1,$2)', 'bool2', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float2', 'int2']);
        this.generateSystemFunction('notEqual', 'notEqual($1,$2)', 'bool3', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float3', 'int3']);
        this.generateSystemFunction('notEqual', 'notEqual($1,$2)', 'bool4', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float4', 'int4']);
        this.generateSystemFunction('notEqual', 'notEqual($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ['bool2', 'bool3', 'bool4']);

        this.generateSystemFunction('greaterThan', 'greaterThan($1,$2)', 'bool2', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float2', 'int2']);
        this.generateSystemFunction('greaterThan', 'greaterThan($1,$2)', 'bool3', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float3', 'int3']);
        this.generateSystemFunction('greaterThan', 'greaterThan($1,$2)', 'bool4', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float4', 'int4']);

        this.generateSystemFunction('greaterThanEqual', 'greaterThanEqual($1,$2)', 'bool2', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float2', 'int2']);
        this.generateSystemFunction('greaterThanEqual', 'greaterThanEqual($1,$2)', 'bool3', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float3', 'int3']);
        this.generateSystemFunction('greaterThanEqual', 'greaterThanEqual($1,$2)', 'bool4', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float4', 'int4']);


        this.generateSystemFunction('radians', 'radians($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('degrees', 'degrees($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('sin', 'sin($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('cos', 'cos($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('tan', 'tan($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('asin', 'asin($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('acos', 'acos($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('atan', 'atan($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('atan', 'atan($1, $2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);

        this.generateSystemFunction('tex2D', 'texture2D($1,$2)', 'float4', ['sampler', 'float2'], null);
        this.generateSystemFunction('tex2D', 'texture2D($1,$2)', 'float4', ['sampler2D', 'float2'], null);
        this.generateSystemFunction('tex2DProj', 'texture2DProj($1,$2)', 'float4', ['sampler', 'float3'], null);
        this.generateSystemFunction('tex2DProj', 'texture2DProj($1,$2)', 'float4', ['sampler2D', 'float3'], null);
        this.generateSystemFunction('tex2DProj', 'texture2DProj($1,$2)', 'float4', ['sampler', 'float4'], null);
        this.generateSystemFunction('tex2DProj', 'texture2DProj($1,$2)', 'float4', ['sampler2D', 'float4'], null);
        this.generateSystemFunction('texCUBE', 'textureCube($1,$2)', 'float4', ['sampler', 'float3'], null);
        this.generateSystemFunction('texCUBE', 'textureCube($1,$2)', 'float4', ['samplerCUBE', 'float3'], null);

        this.generateSystemFunction('tex2D', 'texture2D($1,$2,$3)', 'float4', ['sampler', 'float2', 'float'], null, false, true);
        this.generateSystemFunction('tex2D', 'texture2D($1,$2,$3)', 'float4', ['sampler2D', 'float2', 'float'], null, false, true);
        this.generateSystemFunction('tex2DProj', 'texture2DProj($1,$2,$3)', 'float4', ['sampler', 'float3', 'float'], null, false, true);
        this.generateSystemFunction('tex2DProj', 'texture2DProj($1,$2,$3)', 'float4', ['sampler2D', 'float3', 'float'], null, false, true);
        this.generateSystemFunction('tex2DProj', 'texture2DProj($1,$2,$3)', 'float4', ['sampler', 'float4', 'float'], null, false, true);
        this.generateSystemFunction('tex2DProj', 'texture2DProj($1,$2,$3)', 'float4', ['sampler2D', 'float4', 'float'], null, false, true);
        this.generateSystemFunction('texCUBE', 'textureCube($1,$2,$3)', 'float4', ['sampler', 'float3', 'float'], null, false, true);
        this.generateSystemFunction('texCUBE', 'textureCube($1,$2,$3)', 'float4', ['samplerCUBE', 'float3', 'float'], null, false, true);

        this.generateSystemFunction('tex2DLod', 'texture2DLod($1,$2,$3)', 'float4', ['sampler', 'float2', 'float'], null, true, false);
        this.generateSystemFunction('tex2DLod', 'texture2DLod($1,$2,$3)', 'float4', ['sampler2D', 'float2', 'float'], null, true, false);
        this.generateSystemFunction('tex2DProjLod', 'texture2DProjLod($1,$2,$3)', 'float4', ['sampler', 'float3', 'float'], null, true, false);
        this.generateSystemFunction('tex2DProjLod', 'texture2DProjLod($1,$2,$3)', 'float4', ['sampler2D', 'float3', 'float'], null, true, false);
        this.generateSystemFunction('tex2DProjLod', 'texture2DProjLod($1,$2,$3)', 'float4', ['sampler', 'float4', 'float'], null, true, false);
        this.generateSystemFunction('tex2DProjLod', 'texture2DProjLod($1,$2,$3)', 'float4', ['sampler2D', 'float4', 'float'], null, true, false);
        this.generateSystemFunction('texCUBELod', 'textureCubeLod($1,$2,$3)', 'float4', ['sampler', 'float3', 'float'], null, true, false);
        this.generateSystemFunction('texCUBELod', 'textureCubeLod($1,$2,$3)', 'float4', ['samplerCUBE', 'float3', 'float'], null, true, false);

        //OES_standard_derivatives

        this.generateSystemFunction('dFdx', 'dFdx($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('dFdy', 'dFdy($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('width', 'width($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('fwidth', 'fwidth($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        // this.generateSystemFunction("smoothstep", "smoothstep($1, $2, $3)", "float3", ["float3", "float3", "float3"], null);
        this.generateSystemFunction('smoothstep', 'smoothstep($1, $2, $3)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('smoothstep', 'smoothstep($1, $2, $3)', TEMPLATE_TYPE, ['float', 'float', TEMPLATE_TYPE], ['float2', 'float3', 'float4']);

        this.generateSystemFunction('frac', 'fract($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('lerp', 'mix($1,$2,$3)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
        this.generateSystemFunction('lerp', 'mix($1,$2,$3)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, 'float'], ['float2', 'float3', 'float4']);

        this.generateSystemFunction('saturate', 'max(0., min(1., $1))', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);

        //Extracts

        this.generateNotBuiltInSystemFuction('extractHeader',
            'void A_extractTextureHeader(sampler2D src, out A_TextureHeader texture)',
            '{vec4 v = texture2D(src, vec2(0.00001)); ' +
            'texture = A_TextureHeader(v.r, v.g, v.b, v.a);}',
            'void',
            ['video_buffer_header'], null, ['ExtractMacros']);

        this.generateNotBuiltInSystemFuction('extractFloat',
            'float A_extractFloat(sampler2D sampler, A_TextureHeader header, float offset)',
            '{float pixelNumber = floor(offset / A_VB_ELEMENT_SIZE); ' +
            'float y = floor(pixelNumber / header.width) + .5; ' +
            'float x = mod(pixelNumber, header.width) + .5; ' +
            'number shift = number(mod(offset, A_VB_ELEMENT_SIZE)); ' +
            '\n#ifdef A_VB_COMPONENT4\n' +
            'if(shift == 0) return A_tex2D(sampler, header, x, y).r; ' +
            'else if(shift == 1) return A_tex2D(sampler, header, x, y).g; ' +
            'else if(shift == 2) return A_tex2D(sampler, header, x, y).b; ' +
            'else if(shift == 3) return A_tex2D(sampler, header, x, y).a; ' +
            'else return 0.; ' +
            '\n#endif\n' +
            'return 0.;}',
            'float',
            ['video_buffer_header'], ['extractHeader'], ['ExtractMacros']);

        this.generateNotBuiltInSystemFuction('extractFloat2',
            'vec2 A_extractVec2(sampler2D sampler, A_TextureHeader header, float offset)',
            '{float pixelNumber = floor(offset / A_VB_ELEMENT_SIZE); ' +
            'float y = floor(pixelNumber / header.width) + .5; ' +
            'float x = mod(pixelNumber, header.width) + .5; ' +
            'number shift = number(mod(offset, A_VB_ELEMENT_SIZE)); ' +
            '\n#ifdef A_VB_COMPONENT4\n' +
            'if(shift == 0) return A_tex2D(sampler, header, x, y).rg; ' +
            'else if(shift == 1) return A_tex2D(sampler, header, x, y).gb; ' +
            'else if(shift == 2) return A_tex2D(sampler, header, x, y).ba; ' +
            'else if(shift == 3) { ' +
            'if(number(x) == number(header.width - 1.)) ' +
            'return vec2(A_tex2D(sampler, header, x, y).a, A_tex2D(sampler, header, 0.5, (y + 1.)).r); ' +
            'else ' +
            'return vec2(A_tex2D(sampler, header, x, y).a, A_tex2D(sampler, header, (x + 1.), y).r); ' +
            '} ' +
            'else { return vec2(0.); } ' +
            '\n#endif\n' +
            'return vec2(0.);}',
            'float2',
            ['video_buffer_header'], ['extractHeader'], ['ExtractMacros']);

        this.generateNotBuiltInSystemFuction('extractFloat3',
            'vec3 A_extractVec3(sampler2D sampler, A_TextureHeader header, float offset)',
            '{float pixelNumber = floor(offset / A_VB_ELEMENT_SIZE); ' +
            'float y = floor(pixelNumber / header.width) + .5; ' +
            'float x = mod(pixelNumber, header.width) + .5; ' +
            'number shift = number(mod(offset, A_VB_ELEMENT_SIZE)); ' +
            '\n#ifdef A_VB_COMPONENT4\n' +
            'if(shift == 0) return A_tex2D(sampler, header, x, y).rgb; ' +
            'else if(shift == 1) return A_tex2D(sampler, header, x, y).gba; ' +
            'else if(shift == 2){ ' +
            'if(number(x) == number(header.width - 1.))  return vec3(A_tex2D(sampler, header, x, y).ba, A_tex2D(sampler, header, 0.5, (y + 1.)).r); ' +
            'else return vec3(A_tex2D(sampler, header, x, y).ba, A_tex2D(sampler, header, (x + 1.), y).r);} ' +
            'else if(shift == 3){ ' +
            'if(number(x) == number(header.width - 1.))  return vec3(A_tex2D(sampler, header, x, y).a, A_tex2D(sampler, header, 0.5, (y + 1.)).rg); ' +
            'else return vec3(A_tex2D(sampler, header, x, y).a, A_tex2D(sampler, header, (x + 1.), y).rg);} ' +
            'else { return vec3(0.); } ' +
            '\n#endif\n' +
            '\n#ifdef A_VB_COMPONENT3\n' +
            /** Commented code don`t work on IE */
            //"if(shift == 0) return A_tex2D(sampler, header,vec2(x,header.stepY*y)).rgb; " +
            //"else if(shift == 1){ " +
            //"if(x == header.width - 1.) return vec3(A_tex2D(sampler, header, x, y).gb, A_tex2D(sampler, header, 0.5, (y + 1.)).r); " +
            //"else return vec3(A_tex2D(sampler, header, x, y).gb, A_tex2D(sampler, header, (x + 1.), y).r);} " +
            //"else if(shift == 3){ " +
            //"if(x == header.width - 1.) return vec3(A_tex2D(sampler, header, x, y).b, A_tex2D(sampler, header, 0.5, (y + 1.)).rg); " +
            //"else return vec3(A_tex2D(sampler, header, x, y).b, A_tex2D(sampler, header, (x + 1)., y).rg);} " +
            //"else { return vec3(0.); } " +
            '\n#endif\n' +
            'return vec3(0.);}',
            'float3',
            ['video_buffer_header'], ['extractHeader'], ['ExtractMacros']);

        this.generateNotBuiltInSystemFuction('extractFloat4',
            'vec4 A_extractVec4(sampler2D sampler, A_TextureHeader header, float offset)',
            '{float pixelNumber = floor(offset / A_VB_ELEMENT_SIZE); ' +
            'float y = floor(pixelNumber / header.width) + .5; ' +
            'float x = mod(pixelNumber, header.width) + .5; ' +
            'number shift = number(mod(offset, A_VB_ELEMENT_SIZE)); ' +
            '\n#ifdef A_VB_COMPONENT4\n' +
            'if(shift == 0) return A_tex2D(sampler, header, x, y); ' +
            'else if(shift == 1){ ' +
            'if(number(x) == number(header.width - 1.)) ' +
            'return vec4(A_tex2D(sampler, header, x, y).gba, A_tex2D(sampler, header, 0.5, (y + 1.)).r); ' +
            'else ' +
            'return vec4(A_tex2D(sampler, header, x, y).gba, A_tex2D(sampler, header, (x + 1.), y).r);} ' +
            'else if(shift == 2){ ' +
            'if(number(x) == number(header.width - 1.)) ' +
            'return vec4(A_tex2D(sampler, header, x, y).ba, A_tex2D(sampler, header, 0.5, (y + 1.)).rg); ' +
            'else ' +
            'return vec4(A_tex2D(sampler, header, x, y).ba, A_tex2D(sampler, header, (x + 1.), y).rg);} ' +
            'else if(shift == 3){ ' +
            'if(number(x) == number(header.width - 1.)) ' +
            'return vec4(A_tex2D(sampler, header, x, y).a, A_tex2D(sampler, header, 0.5, (y + 1.)).rgb); ' +
            'else return vec4(A_tex2D(sampler, header, x, y).a, A_tex2D(sampler, header, (x + 1.), y).rgb);} ' +
            'else { return vec4(0.); } ' +
            '\n#endif\n' +
            '\n#ifdef A_VB_COMPONENT3\n' +
            '\n#endif\n' +
            'return vec4(0.);}',
            'float4',
            ['video_buffer_header'], ['extractHeader'], ['ExtractMacros']);

        this.generateNotBuiltInSystemFuction('findPixel',
            'vec2 A_findPixel(A_TextureHeader header, float offset)',
            '{float pixelNumber = floor(offset / A_VB_ELEMENT_SIZE); ' +
            'return vec2(header.stepX * (mod(pixelNumber, header.width) + .5), header.stepY * (floor(pixelNumber / header.width) + .5));}',
            'float2',
            ['video_buffer_header'], ['extractHeader'], ['ExtractMacros']);

        this.generateNotBuiltInSystemFuction('extractFloat4x4',
            'mat4 A_extractMat4(sampler2D sampler, A_TextureHeader header, float offset)',
            '{return mat4(A_tex2Dv(sampler, header, A_findPixel(header, offset)),' +
            'A_tex2Dv(sampler, header, A_findPixel(header, offset + 4.)),' +
            'A_tex2Dv(sampler, header, A_findPixel(header, offset + 8.)),' +
            'A_tex2Dv(sampler, header, A_findPixel(header, offset + 12.)));}',
            'float4x4',
            ['video_buffer_header'], ['findPixel'], ['ExtractMacros']);
    }

    private generateSystemFunction(sName: string, sTranslationExpr: string,
        sReturnTypeName: string,
        pArgumentsTypes: string[],
        pTemplateTypes: string[],
        isForVertex: boolean = true, isForPixel: boolean = true): void {

        let pExprTranslator: ExprTemplateTranslator = new ExprTemplateTranslator(sTranslationExpr);
        let pSystemFunctions: IMap<SystemFunctionInstruction[]> = this._pSystemFunctionsMap;
        let pTypes: IAFXTypeInstruction[] = null;
        let sFunctionHash: string = '';
        let pReturnType: IAFXTypeInstruction = null;
        let pFunction: SystemFunctionInstruction = null;

        if (!isNull(pTemplateTypes)) {
            for (let i: number = 0; i < pTemplateTypes.length; i++) {
                pTypes = [];
                sFunctionHash = sName + '(';
                pReturnType = (sReturnTypeName === TEMPLATE_TYPE) ?
                    Effect.getSystemType(pTemplateTypes[i]) :
                    Effect.getSystemType(sReturnTypeName);


                for (let j: number = 0; j < pArgumentsTypes.length; j++) {
                    if (pArgumentsTypes[j] === TEMPLATE_TYPE) {
                        pTypes.push(Effect.getSystemType(pTemplateTypes[i]));
                        sFunctionHash += pTemplateTypes[i] + ',';
                    }
                    else {
                        pTypes.push(Effect.getSystemType(pArgumentsTypes[j]));
                        sFunctionHash += pArgumentsTypes[j] + ','
                    }
                }

                sFunctionHash += ')';

                if (this._pSystemFunctionHashMap[sFunctionHash]) {
                    this._error(EEffectErrors.BAD_SYSTEM_FUNCTION_REDEFINE, { funcName: sFunctionHash });
                }

                pFunction = new SystemFunctionInstruction(sName, pReturnType, pExprTranslator, pTypes);

                if (!isDef(pSystemFunctions[sName])) {
                    pSystemFunctions[sName] = [];
                }

                pFunction._setForVertex(isForVertex);
                pFunction._setForPixel(isForPixel);

                pSystemFunctions[sName].push(pFunction);
                pFunction._setBuiltIn(true);
            }
        }
        else {

            if (sReturnTypeName === TEMPLATE_TYPE) {
                logger.critical('Bad return type(TEMPLATE_TYPE) for system function \'' + sName + '\'.');
            }

            pReturnType = Effect.getSystemType(sReturnTypeName);
            pTypes = [];
            sFunctionHash = sName + '(';

            for (let i: number = 0; i < pArgumentsTypes.length; i++) {
                if (pArgumentsTypes[i] === TEMPLATE_TYPE) {
                    logger.critical('Bad argument type(TEMPLATE_TYPE) for system function \'' + sName + '\'.');
                }
                else {
                    pTypes.push(Effect.getSystemType(pArgumentsTypes[i]));
                    sFunctionHash += pArgumentsTypes[i] + ',';
                }
            }

            sFunctionHash += ')';

            if (this._pSystemFunctionHashMap[sFunctionHash]) {
                this._error(EEffectErrors.BAD_SYSTEM_FUNCTION_REDEFINE, { funcName: sFunctionHash });
            }

            pFunction = new SystemFunctionInstruction(sName, pReturnType, pExprTranslator, pTypes);

            pFunction._setForVertex(isForVertex);
            pFunction._setForPixel(isForPixel);

            if (!isDef(pSystemFunctions[sName])) {
                pSystemFunctions[sName] = [];
            }

            pSystemFunctions[sName].push(pFunction);
            pFunction._setBuiltIn(true);
        }

    }

    private generateSystemMacros(sMacrosName: string, sMacrosCode: string): void {
        if (isDef(this._pSystemMacros[sMacrosName])) {
            return;
        }
        this._pSystemMacros[sMacrosName] = new SimpleInstruction(sMacrosCode);
    }

    private generateNotBuiltInSystemFuction(sName: string, sDefenition: string, sImplementation: string,
        sReturnType: string,
        pUsedTypes: string[],
        pUsedFunctions: string[],
        pUsedMacros: string[]): void {

        if (isDef(this._pSystemFunctionsMap[sName])) {
            return;
        }

        let pReturnType: IAFXTypeInstruction = Effect.getSystemType(sReturnType);
        let pFunction: SystemFunctionInstruction = new SystemFunctionInstruction(sName, pReturnType, null, null);

        pFunction.setDeclCode(sDefenition, sImplementation);

        let pUsedExtSystemTypes: IAFXTypeDeclInstruction[] = [];
        let pUsedExtSystemFunctions: IAFXFunctionDeclInstruction[] = [];
        let pUsedExtSystemMacros: IAFXSimpleInstruction[] = [];

        if (!isNull(pUsedTypes)) {
            for (let i: number = 0; i < pUsedTypes.length; i++) {
                let pTypeDecl: IAFXTypeDeclInstruction = <IAFXTypeDeclInstruction>Effect.getSystemType(pUsedTypes[i])._getParent();
                if (!isNull(pTypeDecl)) {
                    pUsedExtSystemTypes.push(pTypeDecl);
                }
            }
        }

        if (!isNull(pUsedMacros)) {
            for (let i: number = 0; i < pUsedMacros.length; i++) {
                pUsedExtSystemMacros.push(Effect.getSystemMacros(pUsedMacros[i]));
            }
        }

        if (!isNull(pUsedFunctions)) {
            for (let i: number = 0; i < pUsedFunctions.length; i++) {
                let pFindFunction: IAFXFunctionDeclInstruction = Effect.findSystemFunction(pUsedFunctions[i], null);
                pUsedExtSystemFunctions.push(pFindFunction);
            }
        }

        pFunction.setUsedSystemData(pUsedExtSystemTypes, pUsedExtSystemFunctions, pUsedExtSystemMacros);
        pFunction.closeSystemDataInfo();
        pFunction._setBuiltIn(false);

        this._pSystemFunctionsMap[sName] = [pFunction];
    }

    private generateSystemType(sName: string, sRealName: string,
        iSize: number = 1, isArray: boolean = false,
        pElementType: IAFXTypeInstruction = null, iLength: number = 1
    ): IAFXTypeInstruction {

        if (isDef(this._pSystemTypes[sName])) {
            return null;
        }

        let pSystemType: SystemTypeInstruction = new SystemTypeInstruction();

        pSystemType._setName(sName);
        pSystemType.setRealName(sRealName);
        pSystemType.setSize(iSize);
        if (isArray) {
            pSystemType.addIndex(pElementType, iLength);
        }

        this._pSystemTypes[sName] = pSystemType;
        pSystemType._setBuiltIn(true);

        return pSystemType;
    }

    private generateNotBuildtInSystemType(sName: string, sRealName: string, sDeclString: string,
        iSize: number = 1, isArray: boolean = false,
        pElementType: IAFXTypeInstruction = null, iLength: number = 1
    ): IAFXTypeInstruction {

        if (isDef(this._pSystemTypes[sName])) {
            return null;
        }

        let pSystemType: SystemTypeInstruction = new SystemTypeInstruction();
        pSystemType._setName(sName);
        pSystemType.setRealName(sRealName);
        pSystemType.setSize(iSize);
        pSystemType.setDeclString(sDeclString);

        if (isArray) {
            pSystemType.addIndex(pElementType, iLength);
        }

        this._pSystemTypes[sName] = pSystemType;
        pSystemType._setBuiltIn(false);

        let pSystemTypeDecl: IAFXTypeDeclInstruction = new TypeDeclInstruction();
        pSystemTypeDecl._push(pSystemType, true);
        pSystemTypeDecl._setBuiltIn(false);

        return pSystemType;
    }

    private addSystemTypeScalar(): void {
        this.generateSystemType('void', 'void', 0);
        this.generateSystemType('number', 'number', 1);
        this.generateSystemType('bool', 'bool', 1);
        this.generateSystemType('float', 'float', 1);
        this.generateSystemType('ptr', 'float', 1);
        this.generateSystemType('string', '', 0);
        this.generateSystemType('texture', '', 0);
        this.generateSystemType('sampler', 'sampler2D', 1);
        this.generateSystemType('sampler2D', 'sampler2D', 1);
        this.generateSystemType('samplerCUBE', 'samplerCube', 1);
        this.generateSystemType('video_buffer', 'sampler2D', 1);


        this.generateNotBuildtInSystemType('video_buffer_header', 'A_TextureHeader',
            'struct A_TextureHeader { float width; float height; float stepX; float stepY; }');
    }

    private addSystemTypeVector(): void {
        let pXYSuffix: IMap<boolean> = <IMap<boolean>>{};
        let pXYZSuffix: IMap<boolean> = <IMap<boolean>>{};
        let pXYZWSuffix: IMap<boolean> = <IMap<boolean>>{};

        let pRGSuffix: IMap<boolean> = <IMap<boolean>>{};
        let pRGBSuffix: IMap<boolean> = <IMap<boolean>>{};
        let pRGBASuffix: IMap<boolean> = <IMap<boolean>>{};

        let pSTSuffix: IMap<boolean> = <IMap<boolean>>{};
        let pSTPSuffix: IMap<boolean> = <IMap<boolean>>{};
        let pSTPQSuffix: IMap<boolean> = <IMap<boolean>>{};

        this.generateSuffixLiterals(['x', 'y'], pXYSuffix);
        this.generateSuffixLiterals(['x', 'y', 'z'], pXYZSuffix);
        this.generateSuffixLiterals(['x', 'y', 'z', 'w'], pXYZWSuffix);

        this.generateSuffixLiterals(['r', 'g'], pRGSuffix);
        this.generateSuffixLiterals(['r', 'g', 'b'], pRGBSuffix);
        this.generateSuffixLiterals(['r', 'g', 'b', 'a'], pRGBASuffix);

        this.generateSuffixLiterals(['s', 't'], pSTSuffix);
        this.generateSuffixLiterals(['s', 't', 'p'], pSTPSuffix);
        this.generateSuffixLiterals(['s', 't', 'p', 'q'], pSTPQSuffix);

        let pFloat: IAFXTypeInstruction = Effect.getSystemType('float');
        let pInt: IAFXTypeInstruction = Effect.getSystemType('number');
        let pBool: IAFXTypeInstruction = Effect.getSystemType('bool');

        let pFloat2: IAFXTypeInstruction = this.generateSystemType('float2', 'vec2', 0, true, pFloat, 2);
        let pFloat3: IAFXTypeInstruction = this.generateSystemType('float3', 'vec3', 0, true, pFloat, 3);
        let pFloat4: IAFXTypeInstruction = this.generateSystemType('float4', 'vec4', 0, true, pFloat, 4);

        let pInt2: IAFXTypeInstruction = this.generateSystemType('int2', 'ivec2', 0, true, pInt, 2);
        let pInt3: IAFXTypeInstruction = this.generateSystemType('int3', 'ivec3', 0, true, pInt, 3);
        let pInt4: IAFXTypeInstruction = this.generateSystemType('int4', 'ivec4', 0, true, pInt, 4);

        let pBool2: IAFXTypeInstruction = this.generateSystemType('bool2', 'bvec2', 0, true, pBool, 2);
        let pBool3: IAFXTypeInstruction = this.generateSystemType('bool3', 'bvec3', 0, true, pBool, 3);
        let pBool4: IAFXTypeInstruction = this.generateSystemType('bool4', 'bvec4', 0, true, pBool, 4);

        this.addFieldsToVectorFromSuffixObject(pXYSuffix, pFloat2, 'float');
        this.addFieldsToVectorFromSuffixObject(pRGSuffix, pFloat2, 'float');
        this.addFieldsToVectorFromSuffixObject(pSTSuffix, pFloat2, 'float');

        this.addFieldsToVectorFromSuffixObject(pXYZSuffix, pFloat3, 'float');
        this.addFieldsToVectorFromSuffixObject(pRGBSuffix, pFloat3, 'float');
        this.addFieldsToVectorFromSuffixObject(pSTPSuffix, pFloat3, 'float');

        this.addFieldsToVectorFromSuffixObject(pXYZWSuffix, pFloat4, 'float');
        this.addFieldsToVectorFromSuffixObject(pRGBASuffix, pFloat4, 'float');
        this.addFieldsToVectorFromSuffixObject(pSTPQSuffix, pFloat4, 'float');

        this.addFieldsToVectorFromSuffixObject(pXYSuffix, pInt2, 'number');
        this.addFieldsToVectorFromSuffixObject(pRGSuffix, pInt2, 'number');
        this.addFieldsToVectorFromSuffixObject(pSTSuffix, pInt2, 'number');

        this.addFieldsToVectorFromSuffixObject(pXYZSuffix, pInt3, 'number');
        this.addFieldsToVectorFromSuffixObject(pRGBSuffix, pInt3, 'number');
        this.addFieldsToVectorFromSuffixObject(pSTPSuffix, pInt3, 'number');

        this.addFieldsToVectorFromSuffixObject(pXYZWSuffix, pInt4, 'number');
        this.addFieldsToVectorFromSuffixObject(pRGBASuffix, pInt4, 'number');
        this.addFieldsToVectorFromSuffixObject(pSTPQSuffix, pInt4, 'number');

        this.addFieldsToVectorFromSuffixObject(pXYSuffix, pBool2, 'bool');
        this.addFieldsToVectorFromSuffixObject(pRGSuffix, pBool2, 'bool');
        this.addFieldsToVectorFromSuffixObject(pSTSuffix, pBool2, 'bool');

        this.addFieldsToVectorFromSuffixObject(pXYZSuffix, pBool3, 'bool');
        this.addFieldsToVectorFromSuffixObject(pRGBSuffix, pBool3, 'bool');
        this.addFieldsToVectorFromSuffixObject(pSTPSuffix, pBool3, 'bool');

        this.addFieldsToVectorFromSuffixObject(pXYZWSuffix, pBool4, 'bool');
        this.addFieldsToVectorFromSuffixObject(pRGBASuffix, pBool4, 'bool');
        this.addFieldsToVectorFromSuffixObject(pSTPQSuffix, pBool4, 'bool');
    }

    private addSystemTypeMatrix(): void {
        let pFloat2: IAFXTypeInstruction = Effect.getSystemType('float2');
        let pFloat3: IAFXTypeInstruction = Effect.getSystemType('float3');
        let pFloat4: IAFXTypeInstruction = Effect.getSystemType('float4');

        let pInt2: IAFXTypeInstruction = Effect.getSystemType('int2');
        let pInt3: IAFXTypeInstruction = Effect.getSystemType('int3');
        let pInt4: IAFXTypeInstruction = Effect.getSystemType('int4');

        let pBool2: IAFXTypeInstruction = Effect.getSystemType('bool2');
        let pBool3: IAFXTypeInstruction = Effect.getSystemType('bool3');
        let pBool4: IAFXTypeInstruction = Effect.getSystemType('bool4');

        this.generateSystemType('float2x2', 'mat2', 0, true, pFloat2, 2);
        this.generateSystemType('float2x3', 'mat2x3', 0, true, pFloat2, 3);
        this.generateSystemType('float2x4', 'mat2x4', 0, true, pFloat2, 4);

        this.generateSystemType('float3x2', 'mat3x2', 0, true, pFloat3, 2);
        this.generateSystemType('float3x3', 'mat3', 0, true, pFloat3, 3);
        this.generateSystemType('float3x4', 'mat3x4', 0, true, pFloat3, 4);

        this.generateSystemType('float4x2', 'mat4x2', 0, true, pFloat4, 2);
        this.generateSystemType('float4x3', 'mat4x3', 0, true, pFloat4, 3);
        this.generateSystemType('float4x4', 'mat4', 0, true, pFloat4, 4);

        this.generateSystemType('int2x2', 'imat2', 0, true, pInt2, 2);
        this.generateSystemType('int2x3', 'imat2x3', 0, true, pInt2, 3);
        this.generateSystemType('int2x4', 'imat2x4', 0, true, pInt2, 4);

        this.generateSystemType('int3x2', 'imat3x2', 0, true, pInt3, 2);
        this.generateSystemType('int3x3', 'imat3', 0, true, pInt3, 3);
        this.generateSystemType('int3x4', 'imat3x4', 0, true, pInt3, 4);

        this.generateSystemType('int4x2', 'imat4x2', 0, true, pInt4, 2);
        this.generateSystemType('int4x3', 'imat4x3', 0, true, pInt4, 3);
        this.generateSystemType('int4x4', 'imat4', 0, true, pInt4, 4);

        this.generateSystemType('bool2x2', 'bmat2', 0, true, pBool2, 2);
        this.generateSystemType('bool2x3', 'bmat2x3', 0, true, pBool2, 3);
        this.generateSystemType('bool2x4', 'bmat2x4', 0, true, pBool2, 4);

        this.generateSystemType('bool3x2', 'bmat3x2', 0, true, pBool3, 2);
        this.generateSystemType('bool3x3', 'bmat3', 0, true, pBool3, 3);
        this.generateSystemType('bool3x4', 'bmat3x4', 0, true, pBool3, 4);

        this.generateSystemType('bool4x2', 'bmat4x2', 0, true, pBool4, 2);
        this.generateSystemType('bool4x3', 'bmat4x3', 0, true, pBool4, 3);
        this.generateSystemType('bool4x4', 'bmat4', 0, true, pBool4, 4);
    }

    private addFieldsToVectorFromSuffixObject(pSuffixMap: IMap<boolean>, pType: IAFXTypeInstruction, sBaseType: string) {
        let sSuffix: string = null;

        for (sSuffix in pSuffixMap) {
            let sFieldTypeName: string = sBaseType + ((sSuffix.length > 1) ? sSuffix.length.toString() : '');
            let pFieldType: IAFXTypeInstruction = Effect.getSystemType(sFieldTypeName);

            (<SystemTypeInstruction>pType).addField(sSuffix, pFieldType, pSuffixMap[sSuffix]);
        }
    }

    private getVariable(sName: string): IAFXVariableDeclInstruction {
        return Effect.getSystemVariable(sName) || this._pEffectScope._getVariable(sName);
    }

    private hasVariable(sName: string): boolean {
        return this._pEffectScope._hasVariable(sName);
    }

    private getType(sTypeName: string): IAFXTypeInstruction {
        return Effect.getSystemType(sTypeName) || this._pEffectScope._getType(sTypeName);
    }

    private isSystemFunction(pFunction: IAFXFunctionDeclInstruction): boolean {
        return false;
    }

    private isSystemVariable(pVariable: IAFXVariableDeclInstruction): boolean {
        return false;
    }

    private isSystemType(pType: IAFXTypeDeclInstruction): boolean {
        return false;
    }

    private _errorFromInstruction(pError: IAFXInstructionError): void {
        this._error(pError.code, isNull(pError.info) ? {} : pError.info);
    }

    private _error(eCode: number, pInfo: IEffectErrorInfo = {}): void {
        // let sFileName: string = this._sAnalyzedFileName;

        let pLocation: ISourceLocation = <ISourceLocation>{ file: this._sAnalyzedFileName, line: 0 };
        let pLineColumn: { line: number; column: number; } = this.getNodeSourceLocation(this.getAnalyzedNode());

        switch (eCode) {
            default:
                pInfo.line = pLineColumn.line + 1;
                pInfo.column = pLineColumn.column + 1;

                pLocation.line = pLineColumn.line + 1;

                break;
        }

        let pLogEntity: ILoggerEntity = <ILoggerEntity>{
            code: eCode,
            info: pInfo,
            location: pLocation
        };

        logger.critical(pLogEntity);
        //throw new Error(eCode.toString());
    }

    private setAnalyzedNode(pNode: IParseNode): void {
        // if(this._pAnalyzedNode !== pNode){
        //     // debug_print("Analyze node: ", pNode);
        //     //.name + (pNode.value ?  " --> value: " + pNode.value + "." : "."));
        // }
        this._pAnalyzedNode = pNode;
    }

    private getAnalyzedNode(): IParseNode {
        return this._pAnalyzedNode;
    }

    private isStrictMode(): boolean {
        return this._pEffectScope._isStrictMode();
    }

    private setStrictModeOn(): void {
        return this._pEffectScope._setStrictModeOn();
    }

    private newScope(eScopeType: EScopeType = EScopeType.k_Default): void {
        this._pEffectScope._newScope(eScopeType);
    }

    private resumeScope(): void {
        this._pEffectScope._resumeScope();
    }

    private getScope(): number {
        return this._pEffectScope._getScope();
    }

    private setScope(iScope: number): void {
        this._pEffectScope._setScope(iScope);
    }

    private endScope(): void {
        this._pEffectScope._endScope();
    }

    private getScopeType(): EScopeType {
        return this._pEffectScope._getScopeType();
    }

    private setCurrentAnalyzedFunction(pFunction: IAFXFunctionDeclInstruction): void {
        this._pCurrentFunction = pFunction;
        this._bHaveCurrentFunctionReturnOccur = false;
    }

    private setCurrentAnalyzedPass(pPass: IAFXPassInstruction): void {
        this._pCurrentPass = pPass;
    }

    private getCurrentAnalyzedFunction(): IAFXFunctionDeclInstruction {
        return this._pCurrentFunction;
    }

    private getCurrentAnalyzedPass(): IAFXPassInstruction {
        return this._pCurrentPass;
    }

    private isAnalzeInPass(): boolean {
        return this._isAnalyzeInPass;
    }

    private setAnalyzeInPass(isInPass: boolean): void {
        this._isAnalyzeInPass = isInPass;
    }

    private clearPointersForExtract(): void {
        this._pPointerForExtractionList.length = 0;
    }

    private addPointerForExtract(pPointer: IAFXVariableDeclInstruction): void {
        this._pPointerForExtractionList.push(pPointer);
    }

    private getPointerForExtractList(): IAFXVariableDeclInstruction[] {
        return this._pPointerForExtractionList;
    }

    private findFunction(sFunctionName: string,
        pArguments: IAFXExprInstruction[]): IAFXFunctionDeclInstruction;
    private findFunction(sFunctionName: string,
        pArguments: IAFXVariableDeclInstruction[]): IAFXFunctionDeclInstruction;
    private findFunction(sFunctionName: string,
        pArguments: IAFXTypedInstruction[]): IAFXFunctionDeclInstruction {
        return Effect.findSystemFunction(sFunctionName, pArguments) ||
            this._pEffectScope._getFunction(sFunctionName, pArguments);
    }

    private findConstructor(pType: IAFXTypeInstruction,
        pArguments: IAFXExprInstruction[]): IAFXVariableTypeInstruction {

        let pVariableType: IAFXVariableTypeInstruction = new VariableTypeInstruction();
        pVariableType._pushType(pType);

        return pVariableType;
    }

    private findShaderFunction(sFunctionName: string,
        pArguments: IAFXExprInstruction[]): IAFXFunctionDeclInstruction {
        return this._pEffectScope._getShaderFunction(sFunctionName, pArguments);
    }

    private findFunctionByDef(pDef: FunctionDefInstruction): IAFXFunctionDeclInstruction {
        return this.findFunction(pDef._getName(), pDef.getArguments());
    }

    // private addVariable(pVariable: IAFXVariable): void {
    // }

    private addVariableDecl(pVariable: IAFXVariableDeclInstruction): void {
        if (this.isSystemVariable(pVariable)) {
            this._error(EEffectErrors.REDEFINE_SYSTEM_VARIABLE, { varName: pVariable._getName() });
        }

        let isVarAdded: boolean = this._pEffectScope._addVariable(pVariable);

        if (!isVarAdded) {
            let eScopeType: EScopeType = this.getScopeType();

            switch (eScopeType) {
                case EScopeType.k_Default:
                    this._error(EEffectErrors.REDEFINE_VARIABLE, { varName: pVariable._getName() });
                    break;
                case EScopeType.k_Struct:
                    this._error(EEffectErrors.BAD_NEW_FIELD_FOR_STRUCT_NAME, { fieldName: pVariable._getName() });
                    break;
                case EScopeType.k_Annotation:
                    this._error(EEffectErrors.BAD_NEW_ANNOTATION_VAR, { varName: pVariable._getName() });
                    break;
            }
        }

        if (pVariable._getName() === 'Out' && !isNull(this.getCurrentAnalyzedFunction())) {
            let isOk: boolean = this.getCurrentAnalyzedFunction()._addOutVariable(pVariable);
            if (!isOk) {
                this._error(EEffectErrors.BAD_OUT_VARIABLE_IN_FUNCTION);
            }
        }
    }

    private addTypeDecl(pType: IAFXTypeDeclInstruction): void {
        if (this.isSystemType(pType)) {
            this._error(EEffectErrors.REDEFINE_SYSTEM_TYPE, { typeName: pType._getName() });
        }

        let isTypeAdded: boolean = this._pEffectScope._addType(pType);

        if (!isTypeAdded) {
            this._error(EEffectErrors.REDEFINE_TYPE, { typeName: pType._getName() });
        }
    }

    private addFunctionDecl(pFunction: IAFXFunctionDeclInstruction): void {
        if (this.isSystemFunction(pFunction)) {
            this._error(EEffectErrors.REDEFINE_SYSTEM_FUNCTION, { funcName: pFunction._getName() });
        }

        let isFunctionAdded: boolean = this._pEffectScope._addFunction(pFunction);

        if (!isFunctionAdded) {
            this._error(EEffectErrors.REDEFINE_FUNCTION, { funcName: pFunction._getName() });
        }
    }

    private addTechnique(pTechnique: IAFXTechniqueInstruction): void {
        let sName: string = pTechnique._getName();

        if (isDef(this._pTechniqueMap[sName])) {
            this._error(EEffectErrors.BAD_TECHNIQUE_REDEFINE_NAME, { techName: sName });
            return;
        }

        this._pTechniqueMap[sName] = pTechnique;
        this._pTechniqueList.push(pTechnique);
    }


    private analyzeGlobalUseDecls(): void {
        let pChildren: IParseNode[] = this._pParseTree.getRoot().children;
        let i: number = 0;

        for (i = pChildren.length - 1; i >= 0; i--) {
            if (pChildren[i].name === 'UseDecl') {
                this.analyzeUseDecl(pChildren[i]);
            }
        }
    }

    private analyzeGlobalProvideDecls(): void {
        let pChildren: IParseNode[] = this._pParseTree.getRoot().children;
        let i: number = 0;

        for (i = pChildren.length - 1; i >= 0; i--) {
            if (pChildren[i].name === 'ProvideDecl') {
                this.analyzeProvideDecl(pChildren[i]);
            }
        }
    }

    private analyzeGlobalTypeDecls(): void {
        let pChildren: IParseNode[] = this._pParseTree.getRoot().children;
        let i: number = 0;

        for (i = pChildren.length - 1; i >= 0; i--) {
            if (pChildren[i].name === 'TypeDecl') {
                this.analyzeTypeDecl(pChildren[i]);
            }
        }
    }

    private analyzeFunctionDefinitions(): void {
        let pChildren: IParseNode[] = this._pParseTree.getRoot().children;
        let i: number = 0;

        for (i = pChildren.length - 1; i >= 0; i--) {
            if (pChildren[i].name === 'FunctionDecl') {
                this.analyzeFunctionDeclOnlyDefinition(pChildren[i]);
            }
        }
    }

    private analyzeGlobalImports(): void {
        let pChildren: IParseNode[] = this._pParseTree.getRoot().children;
        let i: number = 0;

        for (i = pChildren.length - 1; i >= 0; i--) {
            if (pChildren[i].name === 'ImportDecl') {
                this.analyzeImportDecl(pChildren[i], null);
            }
        }
    }

    private analyzeTechniqueImports(): void {
        let pChildren: IParseNode[] = this._pParseTree.getRoot().children;
        let i: number = 0;

        for (i = pChildren.length - 1; i >= 0; i--) {
            if (pChildren[i].name === 'TechniqueDecl') {
                this.analyzeTechniqueForImport(pChildren[i]);
            }
        }
    }

    private analyzeVariableDecls(): void {
        let pChildren: IParseNode[] = this._pParseTree.getRoot().children;
        let i: number = 0;

        for (i = pChildren.length - 1; i >= 0; i--) {
            if (pChildren[i].name === 'VariableDecl') {
                this.analyzeVariableDecl(pChildren[i]);
            }
            else if (pChildren[i].name === 'VarStructDecl') {
                this.analyzeVarStructDecl(pChildren[i]);
            }
        }
    }

    private analyzeFunctionDecls(): void {
        for (let i: number = 0; i < this._pFunctionWithImplementationList.length; i++) {
            this.resumeFunctionAnalysis(this._pFunctionWithImplementationList[i]);
        }

        this.checkFunctionsForRecursion();
        this.checkFunctionForCorrectUsage();
        this.generateInfoAboutUsedData();
        this.generateShadersFromFunctions();
    }

    private analyzeTechniques(): void {
        for (let i: number = 0; i < this._pTechniqueList.length; i++) {
            this.resumeTechniqueAnalysis(this._pTechniqueList[i]);
        }
    }

    private checkFunctionsForRecursion(): void {
        let pFunctionList: IAFXFunctionDeclInstruction[] = this._pFunctionWithImplementationList;
        let isNewAdd: boolean = true;
        let isNewDelete: boolean = true;

        while (isNewAdd || isNewDelete) {
            isNewAdd = false;
            isNewDelete = false;

            mainFor:
            for (let i: number = 0; i < pFunctionList.length; i++) {
                let pTestedFunction: IAFXFunctionDeclInstruction = pFunctionList[i];
                let pUsedFunctionList: IAFXFunctionDeclInstruction[] = pTestedFunction._getUsedFunctionList();

                if (!pTestedFunction._isUsed()) {
                    //logger.warn("Unused function '" + pTestedFunction._getStringDef() + "'.");
                    continue mainFor;
                }
                if (pTestedFunction._isBlackListFunction()) {
                    continue mainFor;
                }

                if (isNull(pUsedFunctionList)) {
                    continue mainFor;
                }

                for (let j: number = 0; j < pUsedFunctionList.length; j++) {
                    let pAddedUsedFunctionList: IAFXFunctionDeclInstruction[] = pUsedFunctionList[j]._getUsedFunctionList();

                    if (isNull(pAddedUsedFunctionList)) {
                        continue;
                    }

                    for (let k: number = 0; k < pAddedUsedFunctionList.length; k++) {
                        let pAddedFunction: IAFXFunctionDeclInstruction = pAddedUsedFunctionList[k];

                        if (pTestedFunction === pAddedFunction) {
                            pTestedFunction._addToBlackList();
                            isNewDelete = true;
                            this._error(EEffectErrors.BAD_FUNCTION_USAGE_RECURSION, { funcDef: pTestedFunction._getStringDef() });
                            continue mainFor;
                        }

                        if (pAddedFunction._isBlackListFunction() ||
                            !pAddedFunction._canUsedAsFunction()) {
                            pTestedFunction._addToBlackList();
                            this._error(EEffectErrors.BAD_FUNCTION_USAGE_BLACKLIST, { funcDef: pTestedFunction._getStringDef() });
                            isNewDelete = true;
                            continue mainFor;
                        }

                        if (pTestedFunction._addUsedFunction(pAddedFunction)) {
                            isNewAdd = true;
                        }
                    }
                }
            }
        }
    }

    private checkFunctionForCorrectUsage(): void {
        let pFunctionList: IAFXFunctionDeclInstruction[] = this._pFunctionWithImplementationList;
        let isNewUsageSet: boolean = true;
        let isNewDelete: boolean = true;

        while (isNewUsageSet || isNewDelete) {
            isNewUsageSet = false;
            isNewDelete = false;

            mainFor:
            for (let i: number = 0; i < pFunctionList.length; i++) {
                let pTestedFunction: IAFXFunctionDeclInstruction = pFunctionList[i];
                let pUsedFunctionList: IAFXFunctionDeclInstruction[] = pTestedFunction._getUsedFunctionList();

                if (!pTestedFunction._isUsed()) {
                    //logger.warn("Unused function '" + pTestedFunction._getStringDef() + "'.");
                    continue mainFor;
                }
                if (pTestedFunction._isBlackListFunction()) {
                    continue mainFor;
                }

                if (!pTestedFunction._checkVertexUsage()) {
                    this._error(EEffectErrors.BAD_FUNCTION_USAGE_VERTEX, { funcDef: pTestedFunction._getStringDef() });
                    pTestedFunction._addToBlackList();
                    isNewDelete = true;
                    continue mainFor;
                }

                if (!pTestedFunction._checkPixelUsage()) {
                    this._error(EEffectErrors.BAD_FUNCTION_USAGE_PIXEL, { funcDef: pTestedFunction._getStringDef() });
                    pTestedFunction._addToBlackList();
                    isNewDelete = true;
                    continue mainFor;
                }

                if (isNull(pUsedFunctionList)) {
                    continue mainFor;
                }

                for (let j: number = 0; j < pUsedFunctionList.length; j++) {
                    let pUsedFunction: IAFXFunctionDeclInstruction = pUsedFunctionList[j];

                    if (pTestedFunction._isUsedInVertex()) {
                        if (!pUsedFunction._isForVertex()) {
                            this._error(EEffectErrors.BAD_FUNCTION_USAGE_VERTEX, { funcDef: pTestedFunction._getStringDef() });
                            pTestedFunction._addToBlackList();
                            isNewDelete = true;
                            continue mainFor;
                        }

                        if (!pUsedFunction._isUsedInVertex()) {
                            pUsedFunction._markUsedInVertex();
                            isNewUsageSet = true;
                        }

                    }

                    if (pTestedFunction._isUsedInPixel()) {
                        if (!pUsedFunction._isForPixel()) {
                            this._error(EEffectErrors.BAD_FUNCTION_USAGE_PIXEL, { funcDef: pTestedFunction._getStringDef() });
                            pTestedFunction._addToBlackList();
                            isNewDelete = true;
                            continue mainFor;
                        }

                        if (!pUsedFunction._isUsedInPixel()) {
                            pUsedFunction._markUsedInPixel();
                            isNewUsageSet = true;
                        }
                    }

                }
            }

        }

        return;
    }

    private generateInfoAboutUsedData(): void {
        let pFunctionList: IAFXFunctionDeclInstruction[] = this._pFunctionWithImplementationList;

        for (let i: number = 0; i < pFunctionList.length; i++) {
            pFunctionList[i]._generateInfoAboutUsedData();
        }
    }

    private generateShadersFromFunctions(): void {
        let pFunctionList: IAFXFunctionDeclInstruction[] = this._pFunctionWithImplementationList;

        for (let i: number = 0; i < pFunctionList.length; i++) {
            // let pShader: IAFXFunctionDeclInstruction = null;

            if (pFunctionList[i]._isUsedAsVertex()) {
                // pShader = pFunctionList[i]._convertToVertexShader();
            }
            if (pFunctionList[i]._isUsedAsPixel()) {
                // pShader = pFunctionList[i]._convertToPixelShader();
            }

            if (pFunctionList[i]._isErrorOccured()) {
                this._errorFromInstruction(pFunctionList[i]._getLastError());
                pFunctionList[i]._clearError();
            }
        }
    }

    private analyzeVariableDecl(pNode: IParseNode, pInstruction: IAFXInstruction = null): void {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let pGeneralType: IAFXVariableTypeInstruction = null;
        let pVariable: IAFXVariableDeclInstruction = null;
        let i: number = 0;

        pGeneralType = this.analyzeUsageType(pChildren[pChildren.length - 1]);

        for (i = pChildren.length - 2; i >= 1; i--) {
            if (pChildren[i].name === 'Variable') {
                pVariable = this.analyzeVariable(pChildren[i], pGeneralType);

                if (!isNull(pInstruction)) {
                    pInstruction._push(pVariable, true);
                    if (pInstruction._getInstructionType() === EAFXInstructionTypes.k_DeclStmtInstruction) {
                        let pVariableSubDecls: IAFXVariableDeclInstruction[] = pVariable._getSubVarDecls();
                        if (!isNull(pVariableSubDecls)) {
                            for (let j: number = 0; j < pVariableSubDecls.length; j++) {
                                pInstruction._push(pVariableSubDecls[j], false);
                            }
                        }
                    }
                }
            }
        }
    }

    private analyzeUsageType(pNode: IParseNode): IAFXVariableTypeInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let i: number = 0;
        let pType: IAFXVariableTypeInstruction = new VariableTypeInstruction();

        for (i = pChildren.length - 1; i >= 0; i--) {
            if (pChildren[i].name === 'Type') {
                let pMainType: IAFXTypeInstruction = this.analyzeType(pChildren[i]);
                pType._pushType(pMainType);
            }
            else if (pChildren[i].name === 'Usage') {
                let sUsage: string = this.analyzeUsage(pChildren[i]);
                pType._addUsage(sUsage);
            }
        }

        this.checkInstruction(pType, ECheckStage.CODE_TARGET_SUPPORT);

        return pType;
    }

    private analyzeType(pNode: IParseNode): IAFXTypeInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let pType: IAFXTypeInstruction = null;

        switch (pNode.name) {
            case 'T_TYPE_ID':
                pType = this.getType(pNode.value);

                if (isNull(pType)) {
                    this._error(EEffectErrors.BAD_TYPE_NAME_NOT_TYPE, { typeName: pNode.value });
                }
                break;

            case 'Struct':
                pType = this.analyzeStruct(pNode);
                break;

            case 'T_KW_VOID':
                pType = Effect.getSystemType('void');
                break;

            case 'ScalarType':
            case 'ObjectType':
                pType = this.getType(pChildren[pChildren.length - 1].value);

                if (isNull(pType)) {
                    this._error(EEffectErrors.BAD_TYPE_NAME_NOT_TYPE, { typeName: pChildren[pChildren.length - 1].value });
                }

                break;

            case 'VectorType':
            case 'MatrixType':
                this._error(EEffectErrors.BAD_TYPE_VECTOR_MATRIX);
                break;

            case 'BaseType':
            case 'Type':
                return this.analyzeType(pChildren[0]);
        }

        return pType;
    }

    private analyzeUsage(pNode: IParseNode): string {
        this.setAnalyzedNode(pNode);

        pNode = pNode.children[0];
        return pNode.value;
    }

    private analyzeVariable(pNode: IParseNode, pGeneralType: IAFXVariableTypeInstruction): IAFXVariableDeclInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;

        let pVarDecl: IAFXVariableDeclInstruction = new VariableDeclInstruction();
        let pVariableType: IAFXVariableTypeInstruction = new VariableTypeInstruction();
        let pAnnotation: IAFXAnnotationInstruction = null;
        let sSemantic: string = '';
        let pInitExpr: IAFXInitExprInstruction = null;

        pVarDecl._push(pVariableType, true);
        pVariableType._pushType(pGeneralType);
        pVarDecl._setScope(this.getScope());

        this.analyzeVariableDim(pChildren[pChildren.length - 1], pVarDecl);

        let i: number = 0;
        for (i = pChildren.length - 2; i >= 0; i--) {
            if (pChildren[i].name === 'Annotation') {
                pAnnotation = this.analyzeAnnotation(pChildren[i]);
                pVarDecl._setAnnotation(pAnnotation);
            }
            else if (pChildren[i].name === 'Semantic') {
                sSemantic = this.analyzeSemantic(pChildren[i]);
                pVarDecl._setSemantic(sSemantic);
                pVarDecl._getNameId()._setRealName(sSemantic);
            }
            else if (pChildren[i].name === 'Initializer') {
                pInitExpr = this.analyzeInitializer(pChildren[i]);
                if (!pInitExpr._optimizeForVariableType(pVariableType)) {
                    this._error(EEffectErrors.BAD_VARIABLE_INITIALIZER, { varName: pVarDecl._getName() });
                    return null;
                }
                pVarDecl._push(pInitExpr, true);
            }
        }

        this.checkInstruction(pVarDecl, ECheckStage.CODE_TARGET_SUPPORT);

        this.addVariableDecl(pVarDecl);
        pVarDecl._getNameIndex();

        return pVarDecl;
    }

    private analyzeVariableDim(pNode: IParseNode, pVariableDecl: IAFXVariableDeclInstruction): void {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let pVariableType: IAFXVariableTypeInstruction = <IAFXVariableTypeInstruction>pVariableDecl._getType();

        if (pChildren.length === 1) {
            let pName: IAFXIdInstruction = new IdInstruction();
            pName._setName(pChildren[0].value);
            pVariableDecl._push(pName, true);
            return;
        }

        this.analyzeVariableDim(pChildren[pChildren.length - 1], pVariableDecl);

        if (pChildren.length === 3) {
            pVariableType._addPointIndex(true);
        }
        else if (pChildren.length === 4 && pChildren[0].name === 'FromExpr') {

            let pBuffer: IAFXVariableDeclInstruction = this.analyzeFromExpr(pChildren[0]);
            pVariableType._addPointIndex(true);
            pVariableType._setVideoBuffer(pBuffer);
        }
        else {
            if (pVariableType._isPointer()) {
                //TODO: add support for v[][10]
                this._error(EEffectTempErrors.BAD_ARRAY_OF_POINTERS);
            }

            let pIndexExpr: IAFXExprInstruction = this.analyzeExpr(pChildren[pChildren.length - 3]);
            pVariableType._addArrayIndex(pIndexExpr);
        }
    }

    private analyzeAnnotation(pNode: IParseNode): IAFXAnnotationInstruction {
        this.setAnalyzedNode(pNode);

        return null;
    }

    private analyzeSemantic(pNode: IParseNode): string {
        this.setAnalyzedNode(pNode);

        let sSemantic: string = pNode.children[0].value;
        // let pDecl: IAFXDeclInstruction = <IAFXDeclInstruction>this._pCurrentInstruction;
        // pDecl._setSemantic(sSemantic);
        return sSemantic;
    }

    private analyzeInitializer(pNode: IParseNode): IAFXInitExprInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let pInitExpr: IAFXInitExprInstruction = new InitExprInstruction();

        if (pChildren.length === 2) {
            pInitExpr._push(this.analyzeExpr(pChildren[0]), true);
        }
        else {
            for (let i: number = pChildren.length - 3; i >= 1; i--) {
                if (pChildren[i].name === 'InitExpr') {
                    pInitExpr._push(this.analyzeInitExpr(pChildren[i]), true);
                }
            }
        }

        return pInitExpr;
    }

    private analyzeFromExpr(pNode: IParseNode): IAFXVariableDeclInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let pBuffer: IAFXVariableDeclInstruction = null;

        if (pChildren[1].name === 'T_NON_TYPE_ID') {
            pBuffer = this.getVariable(pChildren[1].value);
        }
        else {
            pBuffer = (<MemExprInstruction>this.analyzeMemExpr(pChildren[1])).getBuffer();
        }

        return pBuffer;
    }

    private analyzeInitExpr(pNode: IParseNode): IAFXInitExprInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let pInitExpr: IAFXInitExprInstruction = new InitExprInstruction();

        if (pChildren.length === 1) {
            pInitExpr._push(this.analyzeExpr(pChildren[0]), true);
        }
        else {
            for (let i: number = 0; i < pChildren.length; i++) {
                if (pChildren[i].name === 'InitExpr') {
                    pInitExpr._push(this.analyzeInitExpr(pChildren[i]), true);
                }
            }
        }

        return pInitExpr;
    }

    private analyzeExpr(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);
        let sName: string = pNode.name;

        switch (sName) {
            case 'ObjectExpr':
                return this.analyzeObjectExpr(pNode);
            case 'ComplexExpr':
                return this.analyzeComplexExpr(pNode);
            case 'PrimaryExpr':
                return this.analyzePrimaryExpr(pNode);
            case 'PostfixExpr':
                return this.analyzePostfixExpr(pNode);
            case 'UnaryExpr':
                return this.analyzeUnaryExpr(pNode);
            case 'CastExpr':
                return this.analyzeCastExpr(pNode);
            case 'ConditionalExpr':
                return this.analyzeConditionalExpr(pNode);
            case 'MulExpr':
            case 'AddExpr':
                return this.analyzeArithmeticExpr(pNode);
            case 'RelationalExpr':
            case 'EqualityExpr':
                return this.analyzeRelationExpr(pNode);
            case 'AndExpr':
            case 'OrExpr':
                return this.analyzeLogicalExpr(pNode);
            case 'AssignmentExpr':
                return this.analyzeAssignmentExpr(pNode);
            case 'T_NON_TYPE_ID':
                return this.analyzeIdExpr(pNode);
            case 'T_STRING':
            case 'T_UINT':
            case 'T_FLOAT':
            case 'T_KW_TRUE':
            case 'T_KW_FALSE':
                return this.analyzeSimpleExpr(pNode);
            case 'MemExpr':
                return this.analyzeMemExpr(pNode);
            default:
                this._error(EEffectErrors.UNSUPPORTED_EXPR, { exprName: sName });
                break;
        }

        return null;
    }

    private analyzeObjectExpr(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let sName: string = pNode.children[pNode.children.length - 1].name;

        switch (sName) {
            case 'T_KW_COMPILE':
                return this.analyzeCompileExpr(pNode);
            case 'T_KW_SAMPLER_STATE':
                return this.analyzeSamplerStateBlock(pNode);
            default:
        }
        return null;
    }

    private analyzeCompileExpr(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let pExpr: CompileExprInstruction = new CompileExprInstruction();
        let pExprType: IAFXVariableTypeInstruction;
        let pArguments: IAFXExprInstruction[] = null;
        let sShaderFuncName: string = pChildren[pChildren.length - 2].value;
        let pShaderFunc: IAFXFunctionDeclInstruction = null;
        let i: number = 0;

        pArguments = [];

        if (pChildren.length > 4) {
            let pArgumentExpr: IAFXExprInstruction;

            for (i = pChildren.length - 3; i > 0; i--) {
                if (pChildren[i].value !== ',') {
                    pArgumentExpr = this.analyzeExpr(pChildren[i]);
                    pArguments.push(pArgumentExpr);
                }
            }
        }

        pShaderFunc = this.findShaderFunction(sShaderFuncName, pArguments);

        if (isNull(pShaderFunc)) {
            this._error(EEffectErrors.BAD_COMPILE_NOT_FUNCTION, { funcName: sShaderFuncName });
            return null;
        }

        pExprType = (<IAFXVariableTypeInstruction>pShaderFunc._getType())._wrap();

        pExpr._setType(pExprType);
        pExpr._setOperator('complile');
        pExpr._push(pShaderFunc._getNameId(), false);

        if (!isNull(pArguments)) {
            for (i = 0; i < pArguments.length; i++) {
                pExpr._push(pArguments[i], true);
            }
        }

        this.checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

        return pExpr;
    }

    private analyzeSamplerStateBlock(pNode: IParseNode): IAFXExprInstruction {
        pNode = pNode.children[0];
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let pExpr: SamplerStateBlockInstruction = new SamplerStateBlockInstruction();
        let i: number = 0;

        pExpr._setOperator('sample_state');

        for (i = pChildren.length - 2; i >= 1; i--) {
            this.analyzeSamplerState(pChildren[i], pExpr);
        }

        this.checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

        return pExpr;
    }

    private analyzeSamplerState(pNode: IParseNode, pSamplerStates: SamplerStateBlockInstruction): void {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        if (pChildren[pChildren.length - 2].name === 'StateIndex') {
            this._error(EEffectErrors.NOT_SUPPORT_STATE_INDEX);
            return;
        }

        let pStateExprNode: IParseNode = pChildren[pChildren.length - 3];
        let pSubStateExprNode: IParseNode = pStateExprNode.children[pStateExprNode.children.length - 1];
        let sStateType: string = pChildren[pChildren.length - 1].value.toUpperCase();
        let sStateValue: string = '';
        // let isTexture: boolean = false;

        if (isNull(pSubStateExprNode.value)) {
            this._error(EEffectErrors.BAD_TEXTURE_FOR_SAMLER);
            return;
        }
        let pTexture: IAFXVariableDeclInstruction = null;

        switch (sStateType) {
            case 'TEXTURE':
                // let pTexture: IAFXVariableDeclInstruction = null;
                if (pStateExprNode.children.length !== 3 || pSubStateExprNode.value === '{') {
                    this._error(EEffectErrors.BAD_TEXTURE_FOR_SAMLER);
                    return;
                }
                let sTextureName: string = pStateExprNode.children[1].value;
                if (isNull(sTextureName) || !this.hasVariable(sTextureName)) {
                    this._error(EEffectErrors.BAD_TEXTURE_FOR_SAMLER);
                    return;
                }

                pTexture = this.getVariable(sTextureName);
                sStateValue = sTextureName;
                break;

            case 'ADDRESSU': /* WRAP_S */
            case 'ADDRESSV': /* WRAP_T */
                sStateValue = pSubStateExprNode.value.toUpperCase();
                switch (sStateValue) {
                    case 'WRAP':
                    case 'CLAMP':
                    case 'MIRROR':
                        break;
                    default:
                        logger.warn('Webgl don`t support this wrapmode: ' + sStateValue);
                        return;
                }
                break;

            case 'MAGFILTER':
            case 'MINFILTER':
                sStateValue = pSubStateExprNode.value.toUpperCase();
                switch (sStateValue) {
                    case 'POINT':
                        sStateValue = 'NEAREST';
                        break;
                    case 'POINT_MIPMAP_POINT':
                        sStateValue = 'NEAREST_MIPMAP_NEAREST';
                        break;
                    case 'LINEAR_MIPMAP_POINT':
                        sStateValue = 'LINEAR_MIPMAP_NEAREST';
                        break;
                    case 'POINT_MIPMAP_LINEAR':
                        sStateValue = 'NEAREST_MIPMAP_LINEAR';
                        break;

                    case 'NEAREST':
                    case 'LINEAR':
                    case 'NEAREST_MIPMAP_NEAREST':
                    case 'LINEAR_MIPMAP_NEAREST':
                    case 'NEAREST_MIPMAP_LINEAR':
                    case 'LINEAR_MIPMAP_LINEAR':
                        break;
                    default:
                        logger.warn('Webgl don`t support this texture filter: ' + sStateValue);
                        return;
                }
                break;

            default:
                logger.warn('Don`t support this texture param: ' + sStateType);
                return;
        }

        if (sStateType !== 'TEXTURE') {
            pSamplerStates.addState(sStateType, sStateValue);
        }
        else {
            pSamplerStates.setTexture(pTexture);
        }
    }

    private analyzeComplexExpr(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let sFirstNodeName: string = pChildren[pChildren.length - 1].name;

        switch (sFirstNodeName) {
            case 'T_NON_TYPE_ID':
                return this.analyzeFunctionCallExpr(pNode);
            case 'BaseType':
            case 'T_TYPE_ID':
                return this.analyzeConstructorCallExpr(pNode);
            default:
                return this.analyzeSimpleComplexExpr(pNode);
        }
    }

    private analyzeFunctionCallExpr(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let pExpr: IAFXExprInstruction = null;
        let pExprType: IAFXVariableTypeInstruction = null;
        let pArguments: IAFXExprInstruction[] = null;
        let sFuncName: string = pChildren[pChildren.length - 1].value;
        let pFunction: IAFXFunctionDeclInstruction = null;
        let pFunctionId: IAFXIdExprInstruction = null;
        let i: number = 0;
        let pCurrentAnalyzedFunction: IAFXFunctionDeclInstruction = this.getCurrentAnalyzedFunction();

        if (pChildren.length > 3) {
            let pArgumentExpr: IAFXExprInstruction;

            pArguments = [];

            for (i = pChildren.length - 3; i > 0; i--) {
                if (pChildren[i].value !== ',') {
                    pArgumentExpr = this.analyzeExpr(pChildren[i]);
                    pArguments.push(pArgumentExpr);
                }
            }
        }

        pFunction = this.findFunction(sFuncName, pArguments);

        if (isNull(pFunction)) {
            this._error(EEffectErrors.BAD_COMPLEX_NOT_FUNCTION, { funcName: sFuncName });
            return null;
        }

        if (!isDef(pFunction)) {
            this._error(EEffectErrors.BAD_CANNOT_CHOOSE_FUNCTION, { funcName: sFuncName });
            return null;
        }

        if (!isNull(pCurrentAnalyzedFunction)) {
            if (!pFunction._isForPixel()) {
                pCurrentAnalyzedFunction._setForPixel(false);
            }

            if (!pFunction._isForVertex()) {
                pCurrentAnalyzedFunction._setForVertex(false);
            }
        }

        if (pFunction._getInstructionType() === EAFXInstructionTypes.k_FunctionDeclInstruction) {
            let pFunctionCallExpr: FunctionCallInstruction = new FunctionCallInstruction();

            pFunctionId = new IdExprInstruction();
            pFunctionId._push(pFunction._getNameId(), false);

            pExprType = (<IAFXVariableTypeInstruction>pFunction._getType())._wrap();

            pFunctionCallExpr._setType(pExprType);
            pFunctionCallExpr._push(pFunctionId, true);

            if (!isNull(pArguments)) {
                for (i = 0; i < pArguments.length; i++) {
                    pFunctionCallExpr._push(pArguments[i], true);
                }

                let pFunctionArguments: IAFXVariableDeclInstruction[] = (<FunctionDeclInstruction>pFunction)._getArguments();
                for (i = 0; i < pArguments.length; i++) {
                    if (pFunctionArguments[i]._getType()._hasUsage('out')) {
                        if (!pArguments[i]._getType()._isWritable()) {
                            this._error(EEffectErrors.BAD_TYPE_FOR_WRITE);
                            return null;
                        }

                        if (pArguments[i]._getType()._isStrongEqual(Effect.getSystemType('ptr'))) {
                            this.addPointerForExtract(pArguments[i]._getType()._getParentVarDecl());
                        }
                    }
                    else if (pFunctionArguments[i]._getType()._hasUsage('inout')) {
                        if (!pArguments[i]._getType()._isWritable()) {
                            this._error(EEffectErrors.BAD_TYPE_FOR_WRITE);
                            return null;
                        }

                        if (!pArguments[i]._getType()._isReadable()) {
                            this._error(EEffectErrors.BAD_TYPE_FOR_READ);
                            return null;
                        }

                        if (pArguments[i]._getType()._isStrongEqual(Effect.getSystemType('ptr'))) {
                            this.addPointerForExtract(pArguments[i]._getType()._getParentVarDecl());
                        }
                    }
                    else {
                        if (!pArguments[i]._getType()._isReadable()) {
                            this._error(EEffectErrors.BAD_TYPE_FOR_READ);
                            return null;
                        }
                    }
                }

                for (i = pArguments.length; i < pFunctionArguments.length; i++) {
                    pFunctionCallExpr._push(pFunctionArguments[i]._getInitializeExpr(), false);
                }

            }

            if (!isNull(pCurrentAnalyzedFunction)) {
                pCurrentAnalyzedFunction._addUsedFunction(pFunction);
            }

            pFunction._markUsedAs(EFunctionType.k_Function);

            pExpr = pFunctionCallExpr;
        }
        else {
            let pSystemCallExpr: SystemCallInstruction = new SystemCallInstruction();

            pSystemCallExpr.setSystemCallFunction(pFunction);
            pSystemCallExpr.fillByArguments(pArguments);

            if (!isNull(pCurrentAnalyzedFunction)) {
                for (i = 0; i < pArguments.length; i++) {
                    if (!pArguments[i]._getType()._isReadable()) {
                        this._error(EEffectErrors.BAD_TYPE_FOR_READ);
                        return null;
                    }
                }
            }

            pExpr = pSystemCallExpr;

            if (!pFunction._isBuiltIn() && !isNull(pCurrentAnalyzedFunction)) {
                pCurrentAnalyzedFunction._addUsedFunction(pFunction);
            }
        }

        this.checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

        return pExpr;
    }

    private analyzeConstructorCallExpr(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let pExpr: ConstructorCallInstruction = new ConstructorCallInstruction();
        let pExprType: IAFXVariableTypeInstruction = null;
        let pArguments: IAFXExprInstruction[] = null;
        let pConstructorType: IAFXTypeInstruction = null;
        let i: number = 0;

        pConstructorType = this.analyzeType(pChildren[pChildren.length - 1]);

        if (isNull(pConstructorType)) {
            this._error(EEffectErrors.BAD_COMPLEX_NOT_TYPE);
            return null;
        }

        if (pChildren.length > 3) {
            let pArgumentExpr: IAFXExprInstruction = null;

            pArguments = [];

            for (i = pChildren.length - 3; i > 0; i--) {
                if (pChildren[i].value !== ',') {
                    pArgumentExpr = this.analyzeExpr(pChildren[i]);
                    pArguments.push(pArgumentExpr);
                }
            }
        }

        pExprType = this.findConstructor(pConstructorType, pArguments);

        if (isNull(pExprType)) {
            this._error(EEffectErrors.BAD_COMPLEX_NOT_CONSTRUCTOR, { typeName: pConstructorType.toString() });
            return null;
        }

        pExpr._setType(pExprType);
        pExpr._push(pConstructorType, false);

        if (!isNull(pArguments)) {
            for (i = 0; i < pArguments.length; i++) {
                if (!pArguments[i]._getType()._isReadable()) {
                    this._error(EEffectErrors.BAD_TYPE_FOR_READ);
                    return null;
                }

                pExpr._push(pArguments[i], true);
            }
        }

        this.checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

        return pExpr;
    }

    private analyzeSimpleComplexExpr(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let pExpr: ComplexExprInstruction = new ComplexExprInstruction();
        let pComplexExpr: IAFXExprInstruction;
        let pExprType: IAFXVariableTypeInstruction;

        pComplexExpr = this.analyzeExpr(pChildren[1]);
        pExprType = <IAFXVariableTypeInstruction>pComplexExpr._getType();

        pExpr._setType(pExprType);
        pExpr._push(pComplexExpr, true);

        this.checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

        return pExpr;
    }

    private analyzePrimaryExpr(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let pExpr: PrimaryExprInstruction = new PrimaryExprInstruction();
        let pPrimaryExpr: IAFXExprInstruction;
        let pPointer: IAFXVariableDeclInstruction = null;
        let pPrimaryExprType: IAFXVariableTypeInstruction;

        pPrimaryExpr = this.analyzeExpr(pChildren[0]);
        pPrimaryExprType = <IAFXVariableTypeInstruction>pPrimaryExpr._getType();

        pPointer = pPrimaryExprType._getPointer();

        if (isNull(pPointer)) {
            this._error(EEffectErrors.BAD_PRIMARY_NOT_POINT, { typeName: pPrimaryExprType._getHash() });
            return null;
        }

        // let pPointerVarType: IAFXVariableTypeInstruction = <IAFXVariableTypeInstruction>pPrimaryExprType._getParent();
        if (!pPrimaryExprType._isStrictPointer()) {
            this.getCurrentAnalyzedFunction()._setForPixel(false);
            this.getCurrentAnalyzedFunction()._notCanUsedAsFunction();
            pPrimaryExprType._setPointerToStrict();
        }

        pExpr._setType(pPointer._getType());
        pExpr._setOperator('@');
        pExpr._push(pPointer._getNameId(), false);

        this.checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

        return pExpr;
    }

    private analyzePostfixExpr(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let sSymbol: string = pChildren[pChildren.length - 2].value;

        switch (sSymbol) {
            case '[':
                return this.analyzePostfixIndex(pNode);
            case '.':
                return this.analyzePostfixPoint(pNode);
            case '++':
            case '--':
                return this.analyzePostfixArithmetic(pNode);
        }

        return null;
    }

    private analyzePostfixIndex(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let pExpr: PostfixIndexInstruction = new PostfixIndexInstruction();
        let pPostfixExpr: IAFXExprInstruction = null;
        let pIndexExpr: IAFXExprInstruction = null;
        let pExprType: IAFXVariableTypeInstruction = null;
        let pPostfixExprType: IAFXVariableTypeInstruction = null;
        let pIndexExprType: IAFXVariableTypeInstruction = null;
        let pIntType: IAFXTypeInstruction = null;

        pPostfixExpr = this.analyzeExpr(pChildren[pChildren.length - 1]);
        pPostfixExprType = <IAFXVariableTypeInstruction>pPostfixExpr._getType();

        if (!pPostfixExprType._isArray()) {
            this._error(EEffectErrors.BAD_POSTIX_NOT_ARRAY, { typeName: pPostfixExprType.toString() });
            return null;
        }

        pIndexExpr = this.analyzeExpr(pChildren[pChildren.length - 3]);
        pIndexExprType = <IAFXVariableTypeInstruction>pIndexExpr._getType();

        pIntType = Effect.getSystemType('number');

        if (!pIndexExprType._isEqual(pIntType)) {
            this._error(EEffectErrors.BAD_POSTIX_NOT_INT_INDEX, { typeName: pIndexExprType.toString() });
            return null;
        }

        pExprType = <IAFXVariableTypeInstruction>(pPostfixExprType._getArrayElementType());

        pExpr._setType(pExprType);
        pExpr._push(pPostfixExpr, true);
        pExpr._push(pIndexExpr, true);

        this.checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

        return pExpr;
    }

    private analyzePostfixPoint(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let pExpr: PostfixPointInstruction = new PostfixPointInstruction();
        let pPostfixExpr: IAFXExprInstruction = null;
        let sFieldName: string = '';
        let pFieldNameExpr: IAFXIdExprInstruction = null;
        let pExprType: IAFXVariableTypeInstruction = null;
        let pPostfixExprType: IAFXVariableTypeInstruction = null;

        pPostfixExpr = this.analyzeExpr(pChildren[pChildren.length - 1]);
        pPostfixExprType = <IAFXVariableTypeInstruction>pPostfixExpr._getType();

        sFieldName = pChildren[pChildren.length - 3].value;

        pFieldNameExpr = pPostfixExprType._getFieldExpr(sFieldName);

        if (isNull(pFieldNameExpr)) {
            this._error(EEffectErrors.BAD_POSTIX_NOT_FIELD, {
                typeName: pPostfixExprType.toString(),
                fieldName: sFieldName
            });
            return null;
        }

        pExprType = <IAFXVariableTypeInstruction>pFieldNameExpr._getType();

        if (pChildren.length === 4) {
            if (!pExprType._isPointer()) {
                this._error(EEffectErrors.BAD_POSTIX_NOT_POINTER, { typeName: pExprType.toString() });
                return null;
            }

            let pBuffer: IAFXVariableDeclInstruction = this.analyzeFromExpr(pChildren[0]);
            pExprType._setVideoBuffer(pBuffer);
        }

        pExpr._setType(pExprType);
        pExpr._push(pPostfixExpr, true);
        pExpr._push(pFieldNameExpr, true);

        this.checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

        return pExpr;
    }

    private analyzePostfixArithmetic(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let sOperator: string = pChildren[0].value;
        let pExpr: PostfixArithmeticInstruction = new PostfixArithmeticInstruction();
        let pPostfixExpr: IAFXExprInstruction;
        let pExprType: IAFXVariableTypeInstruction;
        let pPostfixExprType: IAFXVariableTypeInstruction;

        pPostfixExpr = this.analyzeExpr(pChildren[1]);
        pPostfixExprType = <IAFXVariableTypeInstruction>pPostfixExpr._getType();

        pExprType = this.checkOneOperandExprType(sOperator, pPostfixExprType);

        if (isNull(pExprType)) {
            this._error(EEffectErrors.BAD_POSTIX_ARITHMETIC, {
                operator: sOperator,
                typeName: pPostfixExprType.toString()
            });
            return null;
        }

        pExpr._setType(pExprType);
        pExpr._setOperator(sOperator);
        pExpr._push(pPostfixExpr, true);

        this.checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

        return pExpr;
    }

    private analyzeUnaryExpr(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let sOperator: string = pChildren[1].value;
        let pExpr: UnaryExprInstruction = new UnaryExprInstruction();
        let pUnaryExpr: IAFXExprInstruction;
        let pExprType: IAFXVariableTypeInstruction;
        let pUnaryExprType: IAFXVariableTypeInstruction;

        pUnaryExpr = this.analyzeExpr(pChildren[0]);
        pUnaryExprType = <IAFXVariableTypeInstruction>pUnaryExpr._getType();

        pExprType = this.checkOneOperandExprType(sOperator, pUnaryExprType);

        if (isNull(pExprType)) {
            this._error(EEffectErrors.BAD_UNARY_OPERATION, <IEffectErrorInfo>{
                operator: sOperator,
                tyepName: pUnaryExprType.toString()
            });
            return null;
        }

        pExpr._setOperator(sOperator);
        pExpr._setType(pExprType);
        pExpr._push(pUnaryExpr, true);

        this.checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

        return pExpr;
    }

    private analyzeCastExpr(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let pExpr: CastExprInstruction = new CastExprInstruction();
        let pExprType: IAFXVariableTypeInstruction;
        let pCastedExpr: IAFXExprInstruction;

        pExprType = this.analyzeConstTypeDim(pChildren[2]);
        pCastedExpr = this.analyzeExpr(pChildren[0]);

        if (!(<IAFXVariableTypeInstruction>pCastedExpr._getType())._isReadable()) {
            this._error(EEffectErrors.BAD_TYPE_FOR_READ);
            return null;
        }

        pExpr._setType(pExprType);
        pExpr._push(pExprType, true);
        pExpr._push(pCastedExpr, true);

        this.checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

        return pExpr;
    }

    private analyzeConditionalExpr(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let pExpr: ConditionalExprInstruction = new ConditionalExprInstruction();
        let pConditionExpr: IAFXExprInstruction;
        let pTrueExpr: IAFXExprInstruction;
        let pFalseExpr: IAFXExprInstruction;
        let pConditionType: IAFXVariableTypeInstruction;
        let pTrueExprType: IAFXVariableTypeInstruction;
        let pFalseExprType: IAFXVariableTypeInstruction;
        // let pExprType: IAFXVariableTypeInstruction;
        let pBoolType: IAFXTypeInstruction;

        pConditionExpr = this.analyzeExpr(pChildren[pChildren.length - 1]);
        pTrueExpr = this.analyzeExpr(pChildren[pChildren.length - 3]);
        pFalseExpr = this.analyzeExpr(pChildren[0]);

        pConditionType = <IAFXVariableTypeInstruction>pConditionExpr._getType();
        pTrueExprType = <IAFXVariableTypeInstruction>pTrueExpr._getType();
        pFalseExprType = <IAFXVariableTypeInstruction>pFalseExpr._getType();

        pBoolType = Effect.getSystemType('bool');

        if (!pConditionType._isEqual(pBoolType)) {
            this._error(EEffectErrors.BAD_CONDITION_TYPE, { typeName: pConditionType.toString() });
            return null;
        }

        if (!pTrueExprType._isEqual(pFalseExprType)) {
            this._error(EEffectErrors.BAD_CONDITION_VALUE_TYPES, <IEffectErrorInfo>{
                leftTypeName: pTrueExprType.toString(),
                rightTypeName: pFalseExprType.toString()
            });
            return null;
        }

        if (!pConditionType._isReadable()) {
            this._error(EEffectErrors.BAD_TYPE_FOR_READ);
            return null;
        }

        if (!pTrueExprType._isReadable()) {
            this._error(EEffectErrors.BAD_TYPE_FOR_READ);
            return null;
        }

        if (!pFalseExprType._isReadable()) {
            this._error(EEffectErrors.BAD_TYPE_FOR_READ);
            return null;
        }

        pExpr._setType(pTrueExprType);
        pExpr._push(pConditionExpr, true);
        pExpr._push(pTrueExpr, true);
        pExpr._push(pFalseExpr, true);

        this.checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

        return pExpr;
    }

    private analyzeArithmeticExpr(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let sOperator: string = pNode.children[1].value;
        let pExpr: ArithmeticExprInstruction = new ArithmeticExprInstruction();
        let pLeftExpr: IAFXExprInstruction = null;
        let pRightExpr: IAFXExprInstruction = null;
        let pLeftType: IAFXVariableTypeInstruction = null;
        let pRightType: IAFXVariableTypeInstruction = null;
        let pExprType: IAFXVariableTypeInstruction = null;

        pLeftExpr = this.analyzeExpr(pChildren[pChildren.length - 1]);
        pRightExpr = this.analyzeExpr(pChildren[0]);

        pLeftType = <IAFXVariableTypeInstruction>pLeftExpr._getType();
        pRightType = <IAFXVariableTypeInstruction>pRightExpr._getType();

        pExprType = this.checkTwoOperandExprTypes(sOperator, pLeftType, pRightType);

        if (isNull(pExprType)) {
            this._error(EEffectErrors.BAD_ARITHMETIC_OPERATION, <IEffectErrorInfo>{
                operator: sOperator,
                leftTypeName: pLeftType.toString(),
                rightTypeName: pRightType.toString()
            });
            return null;
        }

        pExpr._setOperator(sOperator);
        pExpr._setType(pExprType);
        pExpr._push(pLeftExpr, true);
        pExpr._push(pRightExpr, true);

        this.checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

        return pExpr;
    }

    private analyzeRelationExpr(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let sOperator: string = pNode.children[1].value;
        let pExpr: RelationalExprInstruction = new RelationalExprInstruction();
        let pLeftExpr: IAFXExprInstruction;
        let pRightExpr: IAFXExprInstruction;
        let pLeftType: IAFXVariableTypeInstruction;
        let pRightType: IAFXVariableTypeInstruction;
        let pExprType: IAFXVariableTypeInstruction;

        pLeftExpr = this.analyzeExpr(pChildren[pChildren.length - 1]);
        pRightExpr = this.analyzeExpr(pChildren[0]);

        pLeftType = <IAFXVariableTypeInstruction>pLeftExpr._getType();
        pRightType = <IAFXVariableTypeInstruction>pRightExpr._getType();

        pExprType = this.checkTwoOperandExprTypes(sOperator, pLeftType, pRightType);

        if (isNull(pExprType)) {
            this._error(EEffectErrors.BAD_RELATIONAL_OPERATION, <IEffectErrorInfo>{
                operator: sOperator,
                leftTypeName: pLeftType._getHash(),
                rightTypeName: pRightType._getHash()
            });
            return null;
        }

        pExpr._setOperator(sOperator);
        pExpr._setType(pExprType);
        pExpr._push(pLeftExpr, true);
        pExpr._push(pRightExpr, true);

        this.checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

        return pExpr;
    }

    private analyzeLogicalExpr(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let sOperator: string = pNode.children[1].value;
        let pExpr: LogicalExprInstruction = new LogicalExprInstruction();
        let pLeftExpr: IAFXExprInstruction;
        let pRightExpr: IAFXExprInstruction;
        let pLeftType: IAFXVariableTypeInstruction;
        let pRightType: IAFXVariableTypeInstruction;
        let pBoolType: IAFXTypeInstruction;

        pLeftExpr = this.analyzeExpr(pChildren[pChildren.length - 1]);
        pRightExpr = this.analyzeExpr(pChildren[0]);

        pLeftType = <IAFXVariableTypeInstruction>pLeftExpr._getType();
        pRightType = <IAFXVariableTypeInstruction>pRightExpr._getType();

        pBoolType = Effect.getSystemType('bool');

        if (!pLeftType._isEqual(pBoolType)) {
            this._error(EEffectErrors.BAD_LOGICAL_OPERATION, {
                operator: sOperator,
                typeName: pLeftType.toString()
            });
            return null;
        }
        if (!pRightType._isEqual(pBoolType)) {
            this._error(EEffectErrors.BAD_LOGICAL_OPERATION, {
                operator: sOperator,
                typeName: pRightType.toString()
            });
            return null;
        }

        if (!pLeftType._isReadable()) {
            this._error(EEffectErrors.BAD_TYPE_FOR_READ);
            return null;
        }

        if (!pRightType._isReadable()) {
            this._error(EEffectErrors.BAD_TYPE_FOR_READ);
            return null;
        }

        pExpr._setOperator(sOperator);
        pExpr._setType((<SystemTypeInstruction>pBoolType).getVariableType());
        pExpr._push(pLeftExpr, true);
        pExpr._push(pRightExpr, true);

        this.checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

        return pExpr;
    }

    private analyzeAssignmentExpr(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let sOperator: string = pChildren[1].value;
        let pExpr: AssignmentExprInstruction = new AssignmentExprInstruction();
        let pLeftExpr: IAFXExprInstruction;
        let pRightExpr: IAFXExprInstruction;
        let pLeftType: IAFXVariableTypeInstruction;
        let pRightType: IAFXVariableTypeInstruction;
        let pExprType: IAFXVariableTypeInstruction;

        pLeftExpr = this.analyzeExpr(pChildren[pChildren.length - 1]);
        pRightExpr = this.analyzeExpr(pChildren[0]);

        pLeftType = <IAFXVariableTypeInstruction>pLeftExpr._getType();
        pRightType = <IAFXVariableTypeInstruction>pRightExpr._getType();

        if (sOperator !== '=') {
            pExprType = this.checkTwoOperandExprTypes(sOperator, pLeftType, pRightType);
            if (isNull(pExprType)) {
                this._error(EEffectErrors.BAD_ARITHMETIC_ASSIGNMENT_OPERATION, <IEffectErrorInfo>{
                    operator: sOperator,
                    leftTypeName: pLeftType._getHash(),
                    rightTypeName: pRightType._getHash()
                });
            }
        }
        else {
            pExprType = pRightType;
        }

        pExprType = this.checkTwoOperandExprTypes('=', pLeftType, pExprType);

        if (isNull(pExprType)) {
            this._error(EEffectErrors.BAD_ASSIGNMENT_OPERATION, <IEffectErrorInfo>{
                leftTypeName: pLeftType._getHash(),
                rightTypeName: pRightType._getHash()
            });
        }

        pExpr._setOperator(sOperator);
        pExpr._setType(pExprType);
        pExpr._push(pLeftExpr, true);
        pExpr._push(pRightExpr, true);

        this.checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

        return pExpr;
    }

    private analyzeIdExpr(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let sName: string = pNode.value;
        let pVariable: IAFXVariableDeclInstruction = this.getVariable(sName);

        if (isNull(pVariable)) {
            this._error(EEffectErrors.UNKNOWN_VARNAME, { varName: sName });
            return null;
        }

        if (pVariable._getType()._isUnverifiable() && !this.isAnalzeInPass()) {
            this._error(EEffectErrors.BAD_USE_OF_ENGINE_VARIABLE);
            return null;
        }

        if (!isNull(this.getCurrentAnalyzedFunction())) {
            if (!pVariable._isForPixel()) {
                this.getCurrentAnalyzedFunction()._setForPixel(false);
            }
            if (!pVariable._isForVertex()) {
                this.getCurrentAnalyzedFunction()._setForVertex(false);
            }
        }

        if (!isNull(this.getCurrentAnalyzedPass()) && pVariable._getType()._isForeign()) {
            this.getCurrentAnalyzedPass()._addOwnUsedForignVariable(pVariable);
        }

        let pVarId: IdExprInstruction = new IdExprInstruction();
        pVarId._push(pVariable._getNameId(), false);

        this.checkInstruction(pVarId, ECheckStage.CODE_TARGET_SUPPORT);

        return pVarId;
    }

    private analyzeSimpleExpr(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        let pInstruction: IAFXLiteralInstruction = null;
        const sName: string = pNode.name;
        const sValue: string = pNode.value;

        switch (sName) {
            case 'T_UINT':
                pInstruction = new IntInstruction();
                pInstruction._setValue((<number><any>sValue) * 1);
                break;
            case 'T_FLOAT':
                pInstruction = new FloatInstruction();
                pInstruction._setValue((<number><any>sValue) * 1.0);
                break;
            case 'T_STRING':
                pInstruction = new StringInstruction();
                pInstruction._setValue(sValue);
                break;
            case 'T_KW_TRUE':
                pInstruction = new BoolInstruction();
                pInstruction._setValue(true);
                break;
            case 'T_KW_FALSE':
                pInstruction = new BoolInstruction();
                pInstruction._setValue(false);
                break;
        }

        return pInstruction;
    }

    private analyzeMemExpr(pNode: IParseNode): IAFXExprInstruction {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        const pMemExpr: MemExprInstruction = new MemExprInstruction();

        const pPostfixExpr: IAFXExprInstruction = this.analyzeExpr(pChildren[0]);
        const pPostfixExprType: IAFXVariableTypeInstruction = <IAFXVariableTypeInstruction>pPostfixExpr._getType();

        if (!pPostfixExprType._isFromVariableDecl()) {
            this._error(EEffectErrors.BAD_MEMOF_ARGUMENT);
            return null;
        }

        const pBuffer: IAFXVariableDeclInstruction = pPostfixExprType._getVideoBuffer();

        if (isNull(pBuffer)) {
            this._error(EEffectErrors.BAD_MEMOF_NO_BUFFER);
        }

        if (!pPostfixExprType._isStrictPointer() && !isNull(this.getCurrentAnalyzedFunction())) {
            this.getCurrentAnalyzedFunction()._setForPixel(false);
            this.getCurrentAnalyzedFunction()._notCanUsedAsFunction();
            pPostfixExprType._setPointerToStrict();
        }

        pMemExpr.setBuffer(pBuffer);

        return pMemExpr;
    }

    private analyzeConstTypeDim(pNode: IParseNode): IAFXVariableTypeInstruction {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        if (pChildren.length > 1) {
            this._error(EEffectErrors.BAD_CAST_TYPE_USAGE);
            return null;
        }

        let pType: IAFXVariableTypeInstruction;

        pType = <IAFXVariableTypeInstruction>(this.analyzeType(pChildren[0]));

        if (!pType._isBase()) {
            this._error(EEffectErrors.BAD_CAST_TYPE_NOT_BASE, { typeName: pType.toString() });
        }

        this.checkInstruction(pType, ECheckStage.CODE_TARGET_SUPPORT);

        return pType;
    }

    private analyzeVarStructDecl(pNode: IParseNode, pInstruction: IAFXInstruction = null): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        let pUsageType: IAFXVariableTypeInstruction = null;
        let pVariable: IAFXVariableDeclInstruction = null;
        let i: number = 0;

        pUsageType = this.analyzeUsageStructDecl(pChildren[pChildren.length - 1]);

        for (i = pChildren.length - 2; i >= 1; i--) {
            if (pChildren[i].name === 'Variable') {
                pVariable = this.analyzeVariable(pChildren[i], pUsageType);

                if (!isNull(pInstruction)) {
                    pInstruction._push(pVariable, true);
                }
            }
        }
    }

    private analyzeUsageStructDecl(pNode: IParseNode): IAFXVariableTypeInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;
        let i: number = 0;
        let pType: IAFXVariableTypeInstruction = new VariableTypeInstruction();

        for (i = pChildren.length - 1; i >= 0; i--) {
            if (pChildren[i].name === 'StructDecl') {
                const pMainType: IAFXTypeInstruction = this.analyzeStructDecl(pChildren[i]);
                pType._pushType(pMainType);

                const pTypeDecl: IAFXTypeDeclInstruction = new TypeDeclInstruction();
                pTypeDecl._push(pMainType, true);

                this.addTypeDecl(pTypeDecl);
            }
            else if (pChildren[i].name === 'Usage') {
                const sUsage: string = this.analyzeUsage(pChildren[i]);
                pType._addUsage(sUsage);
            }
        }

        this.checkInstruction(pType, ECheckStage.CODE_TARGET_SUPPORT);

        return pType;
    }

    private analyzeTypeDecl(pNode: IParseNode, pParentInstruction: IAFXInstruction = null): IAFXTypeDeclInstruction {
        this.setAnalyzedNode(pNode);

        let pChildren: IParseNode[] = pNode.children;

        let pTypeDeclInstruction: IAFXTypeDeclInstruction = new TypeDeclInstruction();

        if (pChildren.length === 2) {
            const pStructInstruction: ComplexTypeInstruction = <ComplexTypeInstruction>this.analyzeStructDecl(pChildren[1]);
            pTypeDeclInstruction._push(pStructInstruction, true);
        }
        else {
            this._error(EEffectErrors.UNSUPPORTED_TYPEDECL);
        }

        this.checkInstruction(pTypeDeclInstruction, ECheckStage.CODE_TARGET_SUPPORT);

        this.addTypeDecl(pTypeDeclInstruction);

        pNode.isAnalyzed = true;

        if (!isNull(pParentInstruction)) {
            pParentInstruction._push(pTypeDeclInstruction, true);
        }

        return pTypeDeclInstruction;
    }

    private analyzeStructDecl(pNode: IParseNode): IAFXTypeInstruction {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        const pStruct: ComplexTypeInstruction = new ComplexTypeInstruction();
        const pFieldCollector: IAFXInstruction = new InstructionCollector();

        const sName: string = pChildren[pChildren.length - 2].value;

        pStruct._setName(sName);

        this.newScope(EScopeType.k_Struct);

        let i: number = 0;
        for (i = pChildren.length - 4; i >= 1; i--) {
            if (pChildren[i].name === 'VariableDecl') {
                this.analyzeVariableDecl(pChildren[i], pFieldCollector);
            }
        }

        this.endScope();

        pStruct.addFields(pFieldCollector, true);

        this.checkInstruction(pStruct, ECheckStage.CODE_TARGET_SUPPORT);

        return pStruct;
    }

    private analyzeStruct(pNode: IParseNode): IAFXTypeInstruction {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        const pStruct: ComplexTypeInstruction = new ComplexTypeInstruction();
        const pFieldCollector: IAFXInstruction = new InstructionCollector();

        this.newScope(EScopeType.k_Struct);

        let i: number = 0;
        for (i = pChildren.length - 4; i >= 1; i--) {
            if (pChildren[i].name === 'VariableDecl') {
                this.analyzeVariableDecl(pChildren[i], pFieldCollector);
            }
        }

        this.endScope();

        pStruct.addFields(pFieldCollector, true);

        this.checkInstruction(pStruct, ECheckStage.CODE_TARGET_SUPPORT);

        return pStruct;
    }

    private analyzeFunctionDeclOnlyDefinition(pNode: IParseNode): IAFXFunctionDeclInstruction {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        let pFunction: FunctionDeclInstruction = null;
        let pFunctionDef: FunctionDefInstruction = null;
        // let pStmtBlock: StmtBlockInstruction = null;
        let pAnnotation: IAFXAnnotationInstruction = null;
        const sLastNodeValue: string = pChildren[0].value;
        let bNeedAddFunction: boolean = false;

        pFunctionDef = this.analyzeFunctionDef(pChildren[pChildren.length - 1]);

        pFunction = <FunctionDeclInstruction>this.findFunctionByDef(pFunctionDef);

        if (!isDef(pFunction)) {
            this._error(EEffectErrors.BAD_CANNOT_CHOOSE_FUNCTION, { funcName: pFunction._getNameId().toString() });
            return null;
        }

        if (!isNull(pFunction) && pFunction._hasImplementation()) {
            this._error(EEffectErrors.BAD_REDEFINE_FUNCTION, { funcName: pFunction._getNameId().toString() });
            return null;
        }

        if (isNull(pFunction)) {
            pFunction = new FunctionDeclInstruction();
            bNeedAddFunction = true;
        }
        else {
            if (!pFunction._getReturnType()._isEqual(pFunctionDef.getReturnType())) {
                this._error(EEffectErrors.BAD_FUNCTION_DEF_RETURN_TYPE, { funcName: pFunction._getNameId().toString() });
                return null;
            }

            bNeedAddFunction = false;
        }

        pFunction._setFunctionDef(<IAFXDeclInstruction>pFunctionDef);

        this.resumeScope();

        if (pChildren.length === 3) {
            pAnnotation = this.analyzeAnnotation(pChildren[1]);
            pFunction._setAnnotation(pAnnotation);
        }

        if (sLastNodeValue !== ';') {
            pFunction._setParseNode(pNode);
            pFunction._setImplementationScope(this.getScope());
            this._pFunctionWithImplementationList.push(pFunction);
        }

        this.endScope();

        if (bNeedAddFunction) {
            this.addFunctionDecl(pFunction);
        }

        return pFunction;
    }

    private resumeFunctionAnalysis(pAnalzedFunction: IAFXFunctionDeclInstruction): void {
        const pFunction: FunctionDeclInstruction = <FunctionDeclInstruction>pAnalzedFunction;
        const pNode: IParseNode = pFunction._getParseNode();

        this.setAnalyzedNode(pNode);
        this.setScope(pFunction._getImplementationScope());

        const pChildren: IParseNode[] = pNode.children;
        let pStmtBlock: StmtBlockInstruction = null;

        this.setCurrentAnalyzedFunction(pFunction);

        pStmtBlock = <StmtBlockInstruction>this.analyzeStmtBlock(pChildren[0]);
        pFunction._setImplementation(<IAFXStmtInstruction>pStmtBlock);

        if (!pFunction._getReturnType()._isEqual(Effect.getSystemType('void')) && !this._bHaveCurrentFunctionReturnOccur) {
            this._error(EEffectErrors.BAD_FUNCTION_DONT_HAVE_RETURN_STMT, { funcName: pFunction._getNameId().toString() })
        }

        this.setCurrentAnalyzedFunction(null);

        this.endScope();

        this.checkInstruction(pFunction, ECheckStage.CODE_TARGET_SUPPORT);
    }

    private analyzeFunctionDef(pNode: IParseNode): FunctionDefInstruction {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        const pFunctionDef: FunctionDefInstruction = new FunctionDefInstruction();
        let pReturnType: IAFXVariableTypeInstruction = null;
        let pFuncName: IAFXIdInstruction = null;
        // let pArguments: IAFXVariableDeclInstruction[] = null;
        const sFuncName: string = pChildren[pChildren.length - 2].value;

        pReturnType = this.analyzeUsageType(pChildren[pChildren.length - 1]);

        if (pReturnType._isPointer() || pReturnType._containSampler() || pReturnType._containPointer()) {
            this._error(EEffectErrors.BAD_RETURN_TYPE_FOR_FUNCTION, { funcName: sFuncName });
            return null;
        }

        pFuncName = new IdInstruction();
        pFuncName._setName(sFuncName);
        pFuncName._setRealName(sFuncName + '_' + '0000'); // TODO: use uniq guid <<

        pFunctionDef.setReturnType(pReturnType);
        pFunctionDef.setFunctionName(pFuncName);

        if (pChildren.length === 4) {
            const sSemantic: string = this.analyzeSemantic(pChildren[0]);
            pFunctionDef._setSemantic(sSemantic);
        }

        this.newScope();

        this.analyzeParamList(pChildren[pChildren.length - 3], pFunctionDef);

        this.endScope();

        this.checkInstruction(pFunctionDef, ECheckStage.CODE_TARGET_SUPPORT);

        return pFunctionDef;
    }

    private analyzeParamList(pNode: IParseNode, pFunctionDef: FunctionDefInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        let pParameter: IAFXVariableDeclInstruction;

        let i: number = 0;

        for (i = pChildren.length - 2; i >= 1; i--) {
            if (pChildren[i].name === 'ParameterDecl') {
                pParameter = this.analyzeParameterDecl(pChildren[i]);
                pParameter._setScope(this.getScope());
                pFunctionDef.addParameter(pParameter, this.isStrictMode());
            }
        }
    }

    private analyzeParameterDecl(pNode: IParseNode): IAFXVariableDeclInstruction {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        let pType: IAFXVariableTypeInstruction = null;
        let pParameter: IAFXVariableDeclInstruction = null;

        pType = this.analyzeParamUsageType(pChildren[1]);
        pParameter = this.analyzeVariable(pChildren[0], pType);

        return pParameter;
    }

    private analyzeParamUsageType(pNode: IParseNode): IAFXVariableTypeInstruction {
        const pChildren: IParseNode[] = pNode.children;
        let i: number = 0;
        const pType: IAFXVariableTypeInstruction = new VariableTypeInstruction();

        for (i = pChildren.length - 1; i >= 0; i--) {
            if (pChildren[i].name === 'Type') {
                const pMainType: IAFXTypeInstruction = this.analyzeType(pChildren[i]);
                pType._pushType(pMainType);
            }
            else if (pChildren[i].name === 'ParamUsage') {
                const sUsage: string = this.analyzeUsage(pChildren[i]);
                pType._addUsage(sUsage);
            }
        }

        this.checkInstruction(pType, ECheckStage.CODE_TARGET_SUPPORT);

        return pType;
    }

    private analyzeStmtBlock(pNode: IParseNode): IAFXStmtInstruction {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        const pStmtBlock: StmtBlockInstruction = new StmtBlockInstruction();
        let pStmt: IAFXStmtInstruction;
        let i: number = 0;

        pStmtBlock._setScope(this.getScope());

        this.newScope();

        for (i = pChildren.length - 2; i > 0; i--) {
            pStmt = this.analyzeStmt(pChildren[i]);
            if (!isNull(pStmt)) {
                pStmtBlock._push(pStmt);
            }

            this.addExtactionStmts(pStmtBlock);
        }

        this.endScope();

        this.checkInstruction(pStmtBlock, ECheckStage.CODE_TARGET_SUPPORT);

        return pStmtBlock;
    }

    private analyzeStmt(pNode: IParseNode): IAFXStmtInstruction {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        const sFirstNodeName: string = pChildren[pChildren.length - 1].name;

        switch (sFirstNodeName) {
            case 'SimpleStmt':
                return this.analyzeSimpleStmt(pChildren[0]);
            case 'UseDecl':
                this.analyzeUseDecl(pChildren[0]);
                return null;
            case 'T_KW_WHILE':
                return this.analyzeWhileStmt(pNode);
            case 'T_KW_FOR':
                return this.analyzeForStmt(pNode);
            case 'T_KW_IF':
                return this.analyzeIfStmt(pNode);
        }
        return null;
    }

    private analyzeSimpleStmt(pNode: IParseNode): IAFXStmtInstruction {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        const sFirstNodeName: string = pChildren[pChildren.length - 1].name;

        switch (sFirstNodeName) {
            case 'T_KW_RETURN':
                return this.analyzeReturnStmt(pNode);

            case 'T_KW_DO':
                return this.analyzeWhileStmt(pNode);

            case 'StmtBlock':
                return this.analyzeStmtBlock(pChildren[0]);

            case 'T_KW_DISCARD':
            case 'T_KW_BREAK':
            case 'T_KW_CONTINUE':
                return this.analyzeBreakStmt(pNode);

            case 'TypeDecl':
            case 'VariableDecl':
            case 'VarStructDecl':
                return this.analyzeDeclStmt(pChildren[0]);

            default:
                if (pChildren.length === 2) {
                    return this.analyzeExprStmt(pNode);
                }
                else {
                    return (new SemicolonStmtInstruction());
                }
        }
    }

    private analyzeReturnStmt(pNode: IParseNode): IAFXStmtInstruction {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        const pReturnStmtInstruction: ReturnStmtInstruction = new ReturnStmtInstruction();

        const pFunctionReturnType: IAFXVariableTypeInstruction = this.getCurrentAnalyzedFunction()._getReturnType();

        this._bHaveCurrentFunctionReturnOccur = true;

        if (pFunctionReturnType._isEqual(Effect.getSystemType('void')) && pChildren.length === 3) {
            this._error(EEffectErrors.BAD_RETURN_STMT_VOID);
            return null;
        }
        else if (!pFunctionReturnType._isEqual(Effect.getSystemType('void')) && pChildren.length === 2) {
            this._error(EEffectErrors.BAD_RETURN_STMT_EMPTY);
            return null;
        }

        if (pChildren.length === 3) {
            const pExprInstruction: IAFXExprInstruction = this.analyzeExpr(pChildren[1]);
            const pOutVar: IAFXVariableDeclInstruction = this.getCurrentAnalyzedFunction()._getOutVariable();

            if (!isNull(pOutVar) && pOutVar._getType() !== pExprInstruction._getType()) {
                this._error(EEffectErrors.BAD_RETURN_STMT_NOT_EQUAL_TYPES);
                return null;
            }

            if (!pFunctionReturnType._isEqual(pExprInstruction._getType())) {
                this._error(EEffectErrors.BAD_RETURN_STMT_NOT_EQUAL_TYPES);
                return null;
            }
            pReturnStmtInstruction._push(pExprInstruction, true);
        }

        this.checkInstruction(pReturnStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

        return pReturnStmtInstruction;
    }

    private analyzeBreakStmt(pNode: IParseNode): IAFXStmtInstruction {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        const pBreakStmtInstruction: BreakStmtInstruction = new BreakStmtInstruction();
        const sOperatorName: string = pChildren[1].value;

        pBreakStmtInstruction._setOperator(sOperatorName);

        if (sOperatorName === 'discard' && !isNull(this.getCurrentAnalyzedFunction())) {
            this.getCurrentAnalyzedFunction()._setForVertex(false);
        }

        this.checkInstruction(pBreakStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

        return pBreakStmtInstruction;
    }

    private analyzeDeclStmt(pNode: IParseNode): IAFXStmtInstruction {
        this.setAnalyzedNode(pNode);

        // let pChildren: IParseNode[] = pNode.children;
        const sNodeName: string = pNode.name;
        const pDeclStmtInstruction: DeclStmtInstruction = new DeclStmtInstruction();

        switch (sNodeName) {
            case 'TypeDecl':
                this.analyzeTypeDecl(pNode, pDeclStmtInstruction);
                break;
            case 'VariableDecl':
                this.analyzeVariableDecl(pNode, pDeclStmtInstruction);
                break;
            case 'VarStructDecl':
                this.analyzeVarStructDecl(pNode, pDeclStmtInstruction);
                break;
        }

        this.checkInstruction(pDeclStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

        return pDeclStmtInstruction;
    }

    private analyzeExprStmt(pNode: IParseNode): IAFXStmtInstruction {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        const pExprStmtInstruction: ExprStmtInstruction = new ExprStmtInstruction();
        const pExprInstruction: IAFXExprInstruction = this.analyzeExpr(pChildren[1]);

        pExprStmtInstruction._push(pExprInstruction, true);

        this.checkInstruction(pExprStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

        return pExprStmtInstruction;
    }

    private analyzeWhileStmt(pNode: IParseNode): IAFXStmtInstruction {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        const isDoWhile: boolean = (pChildren[pChildren.length - 1].value === 'do');
        const isNonIfStmt: boolean = (pNode.name === 'NonIfStmt') ? true : false;

        const pWhileStmt: WhileStmtInstruction = new WhileStmtInstruction();
        let pCondition: IAFXExprInstruction = null;
        let pConditionType: IAFXVariableTypeInstruction = null;
        const pBoolType: IAFXTypeInstruction = Effect.getSystemType('bool');
        let pStmt: IAFXStmtInstruction = null;

        if (isDoWhile) {
            pWhileStmt._setOperator('do_while');
            pCondition = this.analyzeExpr(pChildren[2]);
            pConditionType = <IAFXVariableTypeInstruction>pCondition._getType();

            if (!pConditionType._isEqual(pBoolType)) {
                this._error(EEffectErrors.BAD_DO_WHILE_CONDITION, { typeName: pConditionType.toString() });
                return null;
            }

            pStmt = this.analyzeStmt(pChildren[0]);
        }
        else {
            pWhileStmt._setOperator('while');
            pCondition = this.analyzeExpr(pChildren[2]);
            pConditionType = <IAFXVariableTypeInstruction>pCondition._getType();

            if (!pConditionType._isEqual(pBoolType)) {
                this._error(EEffectErrors.BAD_WHILE_CONDITION, { typeName: pConditionType.toString() });
                return null;
            }

            if (isNonIfStmt) {
                pStmt = this.analyzeNonIfStmt(pChildren[0]);
            }
            else {
                pStmt = this.analyzeStmt(pChildren[0]);
            }

            pWhileStmt._push(pCondition, true);
            pWhileStmt._push(pStmt, true);
        }

        this.checkInstruction(pWhileStmt, ECheckStage.CODE_TARGET_SUPPORT);

        return pWhileStmt;
    }

    private analyzeIfStmt(pNode: IParseNode): IAFXStmtInstruction {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        const isIfElse: boolean = (pChildren.length === 7);

        const pIfStmtInstruction: IfStmtInstruction = new IfStmtInstruction();
        const pCondition: IAFXExprInstruction = this.analyzeExpr(pChildren[pChildren.length - 3]);
        const pConditionType: IAFXVariableTypeInstruction = <IAFXVariableTypeInstruction>pCondition._getType();
        const pBoolType: IAFXTypeInstruction = Effect.getSystemType('bool');

        let pIfStmt: IAFXStmtInstruction = null;
        let pElseStmt: IAFXStmtInstruction = null;

        if (!pConditionType._isEqual(pBoolType)) {
            this._error(EEffectErrors.BAD_IF_CONDITION, { typeName: pConditionType.toString() });
            return null;
        }

        pIfStmtInstruction._push(pCondition, true);

        if (isIfElse) {
            pIfStmtInstruction._setOperator('if_else');
            pIfStmt = this.analyzeNonIfStmt(pChildren[2]);
            pElseStmt = this.analyzeStmt(pChildren[0]);

            pIfStmtInstruction._push(pIfStmt, true);
            pIfStmtInstruction._push(pElseStmt, true);
        }
        else {
            pIfStmtInstruction._setOperator('if');
            pIfStmt = this.analyzeNonIfStmt(pChildren[0]);

            pIfStmtInstruction._push(pIfStmt, true);
        }

        this.checkInstruction(pIfStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

        return pIfStmtInstruction;
    }

    private analyzeNonIfStmt(pNode: IParseNode): IAFXStmtInstruction {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        const sFirstNodeName: string = pChildren[pChildren.length - 1].name;

        switch (sFirstNodeName) {
            case 'SimpleStmt':
                return this.analyzeSimpleStmt(pChildren[0]);
            case 'T_KW_WHILE':
                return this.analyzeWhileStmt(pNode);
            case 'T_KW_FOR':
                return this.analyzeForStmt(pNode);
        }
        return null;
    }

    private analyzeForStmt(pNode: IParseNode): IAFXStmtInstruction {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        const isNonIfStmt: boolean = (pNode.name === 'NonIfStmt');
        const pForStmtInstruction: ForStmtInstruction = new ForStmtInstruction();
        let pStmt: IAFXStmtInstruction = null;

        this.newScope();

        this.analyzeForInit(pChildren[pChildren.length - 3], pForStmtInstruction);
        this.analyzeForCond(pChildren[pChildren.length - 4], pForStmtInstruction);

        if (pChildren.length === 7) {
            this.analyzeForStep(pChildren[2], pForStmtInstruction);
        }
        else {
            pForStmtInstruction._push(null);
        }


        if (isNonIfStmt) {
            pStmt = this.analyzeNonIfStmt(pChildren[0]);
        }
        else {
            pStmt = this.analyzeStmt(pChildren[0]);
        }

        pForStmtInstruction._push(pStmt, true);

        this.endScope();

        this.checkInstruction(pForStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

        return pForStmtInstruction;
    }

    private analyzeForInit(pNode: IParseNode, pForStmtInstruction: ForStmtInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        const sFirstNodeName: string = pChildren[pChildren.length - 1].name;

        switch (sFirstNodeName) {
            case 'VariableDecl':
                this.analyzeVariableDecl(pChildren[0], pForStmtInstruction);
                break;
            case 'Expr':
                const pExpr: IAFXExprInstruction = this.analyzeExpr(pChildren[0]);
                pForStmtInstruction._push(pExpr, true);
                break;
            default:
                // ForInit : ';'
                pForStmtInstruction._push(null);
                break;
        }

        return;
    }

    private analyzeForCond(pNode: IParseNode, pForStmtInstruction: ForStmtInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        if (pChildren.length === 1) {
            pForStmtInstruction._push(null);
            return;
        }

        const pConditionExpr: IAFXExprInstruction = this.analyzeExpr(pChildren[1]);

        pForStmtInstruction._push(pConditionExpr, true);
        return;
    }

    private analyzeForStep(pNode: IParseNode, pForStmtInstruction: ForStmtInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        const pStepExpr: IAFXExprInstruction = this.analyzeExpr(pChildren[0]);

        pForStmtInstruction._push(pStepExpr, true);

        return;
    }


    private analyzeUseDecl(pNode: IParseNode): void {
        this.setAnalyzedNode(pNode);
        this.setStrictModeOn();
    }

    private analyzeTechniqueForImport(pNode: IParseNode): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        const pTechnique: IAFXTechniqueInstruction = new TechniqueInstruction();
        const sTechniqueName: string = this.analyzeComplexName(pChildren[pChildren.length - 2]);
        const isComplexName: boolean = pChildren[pChildren.length - 2].children.length !== 1;

        pTechnique._setName(sTechniqueName, isComplexName);

        for (let i: number = pChildren.length - 3; i >= 0; i--) {
            if (pChildren[i].name === 'Annotation') {
                const pAnnotation: IAFXAnnotationInstruction = this.analyzeAnnotation(pChildren[i]);
                pTechnique._setAnnotation(pAnnotation);
            }
            else if (pChildren[i].name === 'Semantic') {
                const sSemantic: string = this.analyzeSemantic(pChildren[i]);
                pTechnique._setSemantic(sSemantic);
            }
            else {
                this.analyzeTechniqueBodyForImports(pChildren[i], pTechnique);
            }
        }

        this.addTechnique(pTechnique);
    }

    private analyzeComplexName(pNode: IParseNode): string {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        let sName: string = '';

        for (let i: number = pChildren.length - 1; i >= 0; i--) {
            sName += pChildren[i].value;
        }

        return sName;
    }

    private analyzeTechniqueBodyForImports(pNode: IParseNode, pTechnique: IAFXTechniqueInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        for (let i: number = pChildren.length - 2; i >= 1; i--) {
            this.analyzePassDeclForImports(pChildren[i], pTechnique);
        }
    }

    private analyzePassDeclForImports(pNode: IParseNode, pTechnique: IAFXTechniqueInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        if (pChildren[0].name === 'ImportDecl') {
            this.analyzeImportDecl(pChildren[0], pTechnique);
        }
        else if (pChildren.length > 1) {
            const pPass: IAFXPassInstruction = new PassInstruction();
            //TODO: add annotation and id
            this.analyzePassStateBlockForShaders(pChildren[0], pPass);

            pPass._setParseNode(pNode);

            pTechnique._addPass(pPass);
        }
    }

    private analyzePassStateBlockForShaders(pNode: IParseNode, pPass: IAFXPassInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        for (let i: number = pChildren.length - 2; i >= 1; i--) {
            this.analyzePassStateForShader(pChildren[i], pPass);
        }
    }

    private analyzePassStateForShader(pNode: IParseNode, pPass: IAFXPassInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        if (pChildren.length === 1) {
            pPass._markAsComplex(true);

            if (pChildren[0].name === 'StateIf') {
                this.analyzePassStateIfForShader(pChildren[0], pPass);
            }
            else if (pChildren[0].name === 'StateSwitch') {
                this.analyzePassStateSwitchForShader(pChildren[0], pPass);
            }

            return;
        }

        const sType: string = pChildren[pChildren.length - 1].value.toUpperCase();
        let eShaderType: EFunctionType = EFunctionType.k_Vertex;

        if (sType === 'VERTEXSHADER') {
            eShaderType = EFunctionType.k_Vertex
        }
        else if (sType === 'PIXELSHADER') {
            eShaderType = EFunctionType.k_Pixel;
        }
        else {
            return;
        }

        pNode.isAnalyzed = true;

        const pStateExprNode: IParseNode = pChildren[pChildren.length - 3];
        const pExprNode: IParseNode = pStateExprNode.children[pStateExprNode.children.length - 1];
        const pCompileExpr: CompileExprInstruction = <CompileExprInstruction>this.analyzeExpr(pExprNode);
        const pShaderFunc: IAFXFunctionDeclInstruction = pCompileExpr.getFunction();

        if (eShaderType === EFunctionType.k_Vertex) {
            if (!pShaderFunc._checkDefenitionForVertexUsage()) {
                this._error(EEffectErrors.BAD_FUNCTION_VERTEX_DEFENITION, { funcDef: pShaderFunc._getStringDef() });
            }
        }
        else {
            if (!pShaderFunc._checkDefenitionForPixelUsage()) {
                this._error(EEffectErrors.BAD_FUNCTION_PIXEL_DEFENITION, { funcDef: pShaderFunc._getStringDef() });
            }
        }

        pShaderFunc._markUsedAs(eShaderType);

        pPass._addFoundFunction(pNode, pShaderFunc, eShaderType);
    }

    private analyzePassStateIfForShader(pNode: IParseNode, pPass: IAFXPassInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        if (pChildren.length === 5) {
            this.analyzePassStateBlockForShaders(pChildren[0], pPass);
        }
        else if (pChildren.length === 7 && pChildren[0].name === 'PassStateBlock') {
            this.analyzePassStateBlockForShaders(pChildren[2], pPass);
            this.analyzePassStateBlockForShaders(pChildren[0], pPass);
        }
        else {
            this.analyzePassStateBlockForShaders(pChildren[2], pPass);
            this.analyzePassStateIfForShader(pChildren[0], pPass);
        }
    }

    private analyzePassStateSwitchForShader(pNode: IParseNode, pPass: IAFXPassInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        this.analyzePassCaseBlockForShader(pChildren[0], pPass);
    }

    private analyzePassCaseBlockForShader(pNode: IParseNode, pPass: IAFXPassInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        for (let i: number = pChildren.length - 2; i >= 1; i--) {
            if (pChildren[i].name === 'CaseState') {
                this.analyzePassCaseStateForShader(pChildren[i], pPass);
            }
            else if (pChildren[i].name === 'DefaultState') {
                this.analyzePassDefaultStateForShader(pChildren[i], pPass);
            }
        }
    }

    private analyzePassCaseStateForShader(pNode: IParseNode, pPass: IAFXPassInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        for (let i: number = pChildren.length - 4; i >= 0; i--) {
            if (pChildren[i].name === 'PassState') {
                this.analyzePassStateForShader(pChildren[i], pPass);
            }
        }
    }

    private analyzePassDefaultStateForShader(pNode: IParseNode, pPass: IAFXPassInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        for (let i: number = pChildren.length - 3; i >= 0; i--) {
            if (pChildren[i].name === 'PassState') {
                this.analyzePassStateForShader(pChildren[i], pPass);
            }
        }
    }

    private resumeTechniqueAnalysis(pTechnique: IAFXTechniqueInstruction): void {
        const pPassList: IAFXPassInstruction[] = pTechnique._getPassList();

        for (let i: number = 0; i < pPassList.length; i++) {
            this.resumePassAnalysis(pPassList[i]);
        }
    }

    private resumePassAnalysis(pPass: IAFXPassInstruction): void {
        const pNode: IParseNode = pPass._getParseNode();

        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        this.setCurrentAnalyzedPass(pPass);
        this.setAnalyzeInPass(true);
        this.analyzePassStateBlock(pChildren[0], pPass);
        this.setAnalyzeInPass(false);
        this.setCurrentAnalyzedPass(null);

        pPass._finalizePass();
    }

    private analyzePassStateBlock(pNode: IParseNode, pPass: IAFXPassInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        pPass._addCodeFragment('{');

        for (let i: number = pChildren.length - 2; i >= 1; i--) {
            this.analyzePassState(pChildren[i], pPass);
        }

        pPass._addCodeFragment('}');
    }

    private analyzePassState(pNode: IParseNode, pPass: IAFXPassInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        if (pChildren.length === 1) {
            if (pChildren[0].name === 'StateIf') {
                this.analyzePassStateIf(pChildren[0], pPass);
            }
            else if (pChildren[0].name === 'StateSwitch') {
                this.analyzePassStateSwitch(pChildren[0], pPass);
            }

            return;
        }

        if (pNode.isAnalyzed) {
            const pFunc: IAFXFunctionDeclInstruction = pPass._getFoundedFunction(pNode);
            const eShaderType: EFunctionType = pPass._getFoundedFunctionType(pNode);
            let pShader: IAFXFunctionDeclInstruction = null;

            if (eShaderType === EFunctionType.k_Vertex) {
                pShader = pFunc._getVertexShader();
            }
            else {
                pShader = pFunc._getPixelShader();
            }

            pPass._addShader(pShader);
        }
        else {
            const sType: string = pChildren[pChildren.length - 1].value.toUpperCase();
            const eType: ERenderStates = this.getRenderState(sType);
            const pStateExprNode: IParseNode = pChildren[pChildren.length - 3];
            const pExprNode: IParseNode = pStateExprNode.children[pStateExprNode.children.length - 1];

            if (isNull(pExprNode.value) || isNull(eType)) {
                logger.warn('So pass state are incorrect');
                return;
            }

            if (pExprNode.value === '{' && pStateExprNode.children.length > 3) {
                const pValues: ERenderStateValues[] = new Array(Math.ceil((pStateExprNode.children.length - 2) / 2));
                for (let i: number = pStateExprNode.children.length - 2, j: number = 0; i >= 1; i -= 2, j++) {
                    pValues[j] = this.getRenderStateValue(eType, pStateExprNode.children[i].value.toUpperCase());
                }

                switch (eType) {
                    case ERenderStates.BLENDFUNC:
                        if (pValues.length !== 2) {
                            logger.warn('So pass state are incorrect');
                            return;
                        }
                        pPass._setState(ERenderStates.SRCBLENDCOLOR, pValues[0]);
                        pPass._setState(ERenderStates.SRCBLENDALPHA, pValues[0]);
                        pPass._setState(ERenderStates.DESTBLENDCOLOR, pValues[1]);
                        pPass._setState(ERenderStates.DESTBLENDALPHA, pValues[1]);
                        break;

                    case ERenderStates.BLENDFUNCSEPARATE:
                        if (pValues.length !== 4) {
                            logger.warn('So pass state are incorrect');
                            return;
                        }
                        pPass._setState(ERenderStates.SRCBLENDCOLOR, pValues[0]);
                        pPass._setState(ERenderStates.SRCBLENDALPHA, pValues[2]);
                        pPass._setState(ERenderStates.DESTBLENDCOLOR, pValues[1]);
                        pPass._setState(ERenderStates.DESTBLENDALPHA, pValues[3]);
                        break;

                    case ERenderStates.BLENDEQUATIONSEPARATE:
                        if (pValues.length !== 2) {
                            logger.warn('So pass state are incorrect');
                            return;
                        }
                        pPass._setState(ERenderStates.BLENDEQUATIONCOLOR, pValues[0]);
                        pPass._setState(ERenderStates.BLENDEQUATIONALPHA, pValues[1]);
                        break;

                    default:
                        logger.warn('So pass state are incorrect');
                        return;
                }
            }
            else {
                let sValue: string = '';
                if (pExprNode.value === '{') {
                    sValue = pStateExprNode.children[1].value.toUpperCase();
                }
                else {
                    sValue = pExprNode.value.toUpperCase();
                }

                const eValue: ERenderStateValues = this.getRenderStateValue(eType, sValue);

                if (eValue !== ERenderStateValues.UNDEF) {
                    switch (eType) {
                        case ERenderStates.SRCBLEND:
                            pPass._setState(ERenderStates.SRCBLENDCOLOR, eValue);
                            pPass._setState(ERenderStates.SRCBLENDALPHA, eValue);
                            break;
                        case ERenderStates.DESTBLEND:
                            pPass._setState(ERenderStates.DESTBLENDCOLOR, eValue);
                            pPass._setState(ERenderStates.DESTBLENDALPHA, eValue);
                            break;
                        case ERenderStates.BLENDEQUATION:
                            pPass._setState(ERenderStates.BLENDEQUATIONCOLOR, eValue);
                            pPass._setState(ERenderStates.BLENDEQUATIONALPHA, eValue);
                            break;
                        default:
                            pPass._setState(eType, eValue);
                            break;
                    }
                }
            }
        }

    }

    private getRenderState(sState: string): ERenderStates {
        let eType: ERenderStates = null;

        switch (sState) {
            case 'BLENDENABLE':
                eType = ERenderStates.BLENDENABLE;
                break;
            case 'CULLFACEENABLE':
                eType = ERenderStates.CULLFACEENABLE;
                break;
            case 'ZENABLE':
                eType = ERenderStates.ZENABLE;
                break;
            case 'ZWRITEENABLE':
                eType = ERenderStates.ZWRITEENABLE;
                break;
            case 'DITHERENABLE':
                eType = ERenderStates.DITHERENABLE;
                break;
            case 'SCISSORTESTENABLE':
                eType = ERenderStates.SCISSORTESTENABLE;
                break;
            case 'STENCILTESTENABLE':
                eType = ERenderStates.STENCILTESTENABLE;
                break;
            case 'POLYGONOFFSETFILLENABLE':
                eType = ERenderStates.POLYGONOFFSETFILLENABLE;
                break;
            case 'CULLFACE':
                eType = ERenderStates.CULLFACE;
                break;
            case 'FRONTFACE':
                eType = ERenderStates.FRONTFACE;
                break;

            case 'SRCBLENDCOLOR':
                eType = ERenderStates.SRCBLENDCOLOR;
                break;
            case 'DESTBLENDCOLOR':
                eType = ERenderStates.DESTBLENDCOLOR;
                break;
            case 'SRCBLENDALPHA':
                eType = ERenderStates.SRCBLENDALPHA;
                break;
            case 'DESTBLENDALPHA':
                eType = ERenderStates.DESTBLENDALPHA;
                break;

            case 'BLENDEQUATIONCOLOR':
                eType = ERenderStates.BLENDEQUATIONCOLOR;
                break;
            case 'BLENDEQUATIONALPHA':
                eType = ERenderStates.BLENDEQUATIONALPHA;
                break;

            case 'SRCBLEND':
                eType = ERenderStates.SRCBLEND;
                break;
            case 'DESTBLEND':
                eType = ERenderStates.DESTBLEND;
                break;
            case 'BLENDFUNC':
                eType = ERenderStates.BLENDFUNC;
                break;
            case 'BLENDFUNCSEPARATE':
                eType = ERenderStates.BLENDFUNCSEPARATE;
                break;

            case 'BLENDEQUATION':
                eType = ERenderStates.BLENDEQUATION;
                break;
            case 'BLENDEQUATIONSEPARATE':
                eType = ERenderStates.BLENDEQUATIONSEPARATE;
                break;

            case 'ZFUNC':
                eType = ERenderStates.ZFUNC;
                break;
            case 'ALPHABLENDENABLE':
                eType = ERenderStates.ALPHABLENDENABLE;
                break;
            case 'ALPHATESTENABLE':
                eType = ERenderStates.ALPHATESTENABLE;
                break;

            default:
                logger.warn('Unsupported render state type used: ' + sState + '. WebGl...');
                break;
        }

        return eType;
    }

    private getRenderStateValue(eState: ERenderStates, sValue: string): ERenderStateValues {
        let eValue: ERenderStateValues = ERenderStateValues.UNDEF;

        switch (eState) {
            case ERenderStates.ALPHABLENDENABLE:
            case ERenderStates.ALPHATESTENABLE:
                logger.warn('ALPHABLENDENABLE/ALPHATESTENABLE not supported in WebGL.');
                return ERenderStateValues.UNDEF;

            case ERenderStates.BLENDENABLE:
            case ERenderStates.CULLFACEENABLE:
            case ERenderStates.ZENABLE:
            case ERenderStates.ZWRITEENABLE:
            case ERenderStates.DITHERENABLE:
            case ERenderStates.SCISSORTESTENABLE:
            case ERenderStates.STENCILTESTENABLE:
            case ERenderStates.POLYGONOFFSETFILLENABLE:
                switch (sValue) {
                    case 'TRUE':
                        eValue = ERenderStateValues.TRUE;
                        break;
                    case 'FALSE':
                        eValue = ERenderStateValues.FALSE;
                        break;

                    default:
                        logger.warn('Unsupported render state ALPHABLENDENABLE/ZENABLE/ZWRITEENABLE/DITHERENABLE value used: '
                            + sValue + '.');
                        return eValue;
                }
                break;

            case ERenderStates.CULLFACE:
                switch (sValue) {
                    case 'FRONT':
                        eValue = ERenderStateValues.FRONT;
                        break;
                    case 'BACK':
                        eValue = ERenderStateValues.BACK;
                        break
                    case 'FRONT_AND_BACK':
                        eValue = ERenderStateValues.FRONT_AND_BACK;
                        break;

                    default:
                        logger.warn('Unsupported render state CULLFACE value used: ' + sValue + '.');
                        return eValue;
                }
                break;

            case ERenderStates.FRONTFACE:
                switch (sValue) {
                    case 'CW':
                        eValue = ERenderStateValues.CW;
                        break;
                    case 'CCW':
                        eValue = ERenderStateValues.CCW;
                        break;

                    default:
                        logger.warn('Unsupported render state FRONTFACE value used: ' + sValue + '.');
                        return eValue;
                }
                break;

            case ERenderStates.SRCBLEND:
            case ERenderStates.DESTBLEND:
            case ERenderStates.SRCBLENDALPHA:
            case ERenderStates.DESTBLENDALPHA:
            case ERenderStates.SRCBLENDCOLOR:
            case ERenderStates.DESTBLENDCOLOR:
            case ERenderStates.BLENDFUNC:
            case ERenderStates.BLENDFUNCSEPARATE:
                switch (sValue) {
                    case 'ZERO':
                        eValue = ERenderStateValues.ZERO;
                        break;
                    case 'ONE':
                        eValue = ERenderStateValues.ONE;
                        break;
                    case 'SRCCOLOR':
                        eValue = ERenderStateValues.SRCCOLOR;
                        break;
                    case 'INVSRCCOLOR':
                        eValue = ERenderStateValues.INVSRCCOLOR;
                        break;
                    case 'SRCALPHA':
                        eValue = ERenderStateValues.SRCALPHA;
                        break;
                    case 'INVSRCALPHA':
                        eValue = ERenderStateValues.INVSRCALPHA;
                        break;
                    case 'DESTALPHA':
                        eValue = ERenderStateValues.DESTALPHA;
                        break;
                    case 'INVDESTALPHA':
                        eValue = ERenderStateValues.INVDESTALPHA;
                        break;
                    case 'DESTCOLOR':
                        eValue = ERenderStateValues.DESTCOLOR;
                        break;
                    case 'INVDESTCOLOR':
                        eValue = ERenderStateValues.INVDESTCOLOR;
                        break;
                    case 'SRCALPHASAT':
                        eValue = ERenderStateValues.SRCALPHASAT;
                        break;

                    default:
                        logger.warn('Unsupported render state SRCBLEND/DESTBLEND value used: ' + sValue + '.');
                        return eValue;
                }
                break;

            case ERenderStates.BLENDEQUATION:
            case ERenderStates.BLENDEQUATIONSEPARATE:
            case ERenderStates.BLENDEQUATIONCOLOR:
            case ERenderStates.BLENDEQUATIONALPHA:
                switch (sValue) {
                    case 'FUNCADD':
                    case 'ADD':
                        eValue = ERenderStateValues.FUNCADD;
                        break;
                    case 'FUNCSUBTRACT':
                    case 'SUBTRACT':
                        eValue = ERenderStateValues.FUNCSUBTRACT;
                        break;
                    case 'FUNCREVERSESUBTRACT':
                    case 'REVERSESUBTRACT':
                        eValue = ERenderStateValues.FUNCREVERSESUBTRACT;
                        break;
                    default:
                        logger.warn('Unsupported render state BLENDEQUATION/BLENDEQUATIONSEPARATE value used: ' + sValue + '.');
                        return eValue;
                }
                break;

            case ERenderStates.ZFUNC:
                switch (sValue) {
                    case 'NEVER':
                        eValue = ERenderStateValues.NEVER;
                        break;
                    case 'LESS':
                        eValue = ERenderStateValues.LESS;
                        break;
                    case 'EQUAL':
                        eValue = ERenderStateValues.EQUAL;
                        break;
                    case 'LESSEQUAL':
                        eValue = ERenderStateValues.LESSEQUAL;
                        break;
                    case 'GREATER':
                        eValue = ERenderStateValues.GREATER;
                        break;
                    case 'NOTEQUAL':
                        eValue = ERenderStateValues.NOTEQUAL;
                        break;
                    case 'GREATEREQUAL':
                        eValue = ERenderStateValues.GREATEREQUAL;
                        break;
                    case 'ALWAYS':
                        eValue = ERenderStateValues.ALWAYS;
                        break;

                    default:
                        logger.warn('Unsupported render state ZFUNC value used: ' +
                            sValue + '.');
                        return eValue;
                }
                break;
        }

        return eValue;
    }

    private analyzePassStateIf(pNode: IParseNode, pPass: IAFXPassInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        const pIfExpr: IAFXExprInstruction = this.analyzeExpr(pChildren[pChildren.length - 3]);
        pIfExpr._prepareFor(EFunctionType.k_PassFunction);

        pPass._addCodeFragment('if(' + pIfExpr._toFinalCode() + ')');

        this.analyzePassStateBlock(pChildren[pChildren.length - 5], pPass);

        if (pChildren.length > 5) {
            pPass._addCodeFragment('else');

            if (pChildren[0].name === 'PassStateBlock') {
                this.analyzePassStateBlock(pChildren[0], pPass);
            }
            else {
                pPass._addCodeFragment(' ');
                this.analyzePassStateIf(pChildren[0], pPass);
            }
        }
    }

    private analyzePassStateSwitch(pNode: IParseNode, pPass: IAFXPassInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        // let sCodeFragment: string = "switch";
        const pSwitchExpr: IAFXExprInstruction = this.analyzeExpr(pChildren[pChildren.length - 3]);
        pSwitchExpr._prepareFor(EFunctionType.k_PassFunction);

        pPass._addCodeFragment('(' + pSwitchExpr._toFinalCode() + ')');

        this.analyzePassCaseBlock(pChildren[0], pPass);
    }

    private analyzePassCaseBlock(pNode: IParseNode, pPass: IAFXPassInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        pPass._addCodeFragment('{');

        for (let i: number = pChildren.length - 2; i >= 1; i--) {
            if (pChildren[i].name === 'CaseState') {
                this.analyzePassCaseState(pChildren[i], pPass);
            }
            else if (pChildren[i].name === 'DefaultState') {
                this.analyzePassDefault(pChildren[i], pPass);
            }
        }

        pPass._addCodeFragment('}');
    }

    private analyzePassCaseState(pNode: IParseNode, pPass: IAFXPassInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        const pCaseStateExpr: IAFXExprInstruction = this.analyzeExpr(pChildren[pChildren.length - 2]);
        pCaseStateExpr._prepareFor(EFunctionType.k_PassFunction);

        pPass._addCodeFragment('case ' + pCaseStateExpr._toFinalCode() + ': ');

        for (let i: number = pChildren.length - 4; i >= 0; i--) {
            if (pChildren[i].name === 'PassState') {
                this.analyzePassStateForShader(pChildren[i], pPass);
            }
            else {
                pPass._addCodeFragment(pChildren[i].value);
            }
        }
    }

    private analyzePassDefault(pNode: IParseNode, pPass: IAFXPassInstruction): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        pPass._addCodeFragment('default: ');

        for (let i: number = pChildren.length - 3; i >= 0; i--) {
            if (pChildren[i].name === 'PassState') {
                this.analyzePassStateForShader(pChildren[i], pPass);
            }
            else {
                pPass._addCodeFragment(pChildren[i].value);
            }
        }
    }

    private analyzeImportDecl(pNode: IParseNode, pTechnique: IAFXTechniqueInstruction = null): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;
        const sComponentName: string = this.analyzeComplexName(pChildren[pChildren.length - 2]);
        // let iShift: number = 0;

        if (pChildren[0].name === 'ExtOpt') {
            logger.warn('We don`t suppor ext-commands for import');
        }
        if (pChildren.length !== 2) {
            // iShift = this.analyzeShiftOpt(pChildren[0]);
        }

        if (!isNull(pTechnique)) {
            //We can import techniques from the same file, but on this stage they don`t have component yet.
            //So we need special mehanism to add them on more belated stage
            // let sShortedComponentName: string = sComponentName;
            if (this._sProvideNameSpace !== '') {
                // sShortedComponentName = sComponentName.replace(this._sProvideNameSpace + ".", "");
            }

            throw null;
            // let pTechniqueFromSameEffect: IAFXTechniqueInstruction = this._pTechniqueMap[sComponentName] || this._pTechniqueMap[sShortedComponentName];
            // if (isDefAndNotNull(pTechniqueFromSameEffect)) {
            //     pTechnique._addTechniqueFromSameEffect(pTechniqueFromSameEffect, iShift);
            //     return;
            // }
        }

        const pSourceTechnique: IAFXTechniqueInstruction = fx.techniques[sComponentName];
        if (!pSourceTechnique) {
            this._error(EEffectErrors.BAD_IMPORTED_COMPONENT_NOT_EXIST, { componentName: sComponentName });
            return;
        }

        // this.addComponent(pSourceTechnique, iShift, pTechnique);
        throw null;
    }

    private analyzeProvideDecl(pNode: IParseNode): void {
        this.setAnalyzedNode(pNode);

        const pChildren: IParseNode[] = pNode.children;

        if (pChildren.length === 2) {
            this._sProvideNameSpace = this.analyzeComplexName(pChildren[0]);
        }
        else {
            this._error(EEffectTempErrors.UNSUPPORTED_PROVIDE_AS);
            return;
        }
    }


    /**
     * Проверят возможность использования оператора между двумя типами.
     * Возращает тип получаемый в результате приминения опрератора, или, если применить его невозможно - null.
     *
     * @sOperator {string} Один из операторов: + - * / % += -= *= /= %= = < > <= >= == != =
     * @pLeftType {IAFXVariableTypeInstruction} Тип левой части выражения
     * @pRightType {IAFXVariableTypeInstruction} Тип правой части выражения
     */
    private checkTwoOperandExprTypes(sOperator: string,
                                     pLeftType: IAFXVariableTypeInstruction,
                                     pRightType: IAFXVariableTypeInstruction): IAFXVariableTypeInstruction {
        if (pLeftType._isUnverifiable()) {
            return pLeftType;
        }

        if (pRightType._isUnverifiable()) {
            return pRightType;
        }

        const isComplex: boolean = pLeftType._isComplex() || pRightType._isComplex();
        const isArray: boolean = pLeftType._isNotBaseArray() || pRightType._isNotBaseArray();
        const isSampler: boolean = Effect.isSamplerType(pLeftType) || Effect.isSamplerType(pRightType);
        const pBoolType: IAFXVariableTypeInstruction = Effect.getSystemType('bool').getVariableType();

        if (isArray || isSampler) {
            return null;
        }

        if (sOperator === '%' || sOperator === '%=') {
            return null;
        }

        if (this.isAssignmentOperator(sOperator)) {
            if (!pLeftType._isWritable()) {
                this._error(EEffectErrors.BAD_TYPE_FOR_WRITE);
                return null;
            }

            if (pLeftType._isStrongEqual(Effect.getSystemType('ptr'))) {
                this.addPointerForExtract(pLeftType._getParentVarDecl());
            }

            if (!pRightType._isReadable()) {
                this._error(EEffectErrors.BAD_TYPE_FOR_READ);
                return null;
            }

            if (sOperator !== '=' && !pLeftType._isReadable()) {
                this._error(EEffectErrors.BAD_TYPE_FOR_READ)
            }
        }
        else {
            if (!pLeftType._isReadable()) {
                this._error(EEffectErrors.BAD_TYPE_FOR_READ);
                return null;
            }

            if (!pRightType._isReadable()) {
                this._error(EEffectErrors.BAD_TYPE_FOR_READ);
                return null;
            }
        }

        if (isComplex) {
            if (sOperator === '=' && pLeftType._isEqual(pRightType)) {
                return <IAFXVariableTypeInstruction>pLeftType;
            }
            else if (this.isEqualOperator(sOperator) && !pLeftType._containArray() && !pLeftType._containSampler()) {
                return pBoolType;
            }
            else {
                return null;
            }
        }

        // let pReturnType: IAFXVariableTypeInstruction = null;
        const pLeftBaseType: IAFXVariableTypeInstruction = (<SystemTypeInstruction>pLeftType._getBaseType()).getVariableType();
        const pRightBaseType: IAFXVariableTypeInstruction = (<SystemTypeInstruction>pRightType._getBaseType()).getVariableType();


        if (pLeftType._isConst() && this.isAssignmentOperator(sOperator)) {
            return null;
        }

        if (pLeftType._isEqual(pRightType)) {
            if (this.isArithmeticalOperator(sOperator)) {
                if (!Effect.isMatrixType(pLeftType) || (sOperator !== '/' && sOperator !== '/=')) {
                    return pLeftBaseType;
                }
                else {
                    return null;
                }
            }
            else if (this.isRelationalOperator(sOperator)) {
                if (Effect.isScalarType(pLeftType)) {
                    return pBoolType;
                }
                else {
                    return null;
                }
            }
            else if (this.isEqualOperator(sOperator)) {
                return pBoolType;
            }
            else if (sOperator === '=') {
                return pLeftBaseType;
            }
            else {
                return null;
            }

        }

        if (this.isArithmeticalOperator(sOperator)) {
            if (Effect.isBoolBasedType(pLeftType) || Effect.isBoolBasedType(pRightType) ||
                Effect.isFloatBasedType(pLeftType) !== Effect.isFloatBasedType(pRightType) ||
                Effect.isIntBasedType(pLeftType) !== Effect.isIntBasedType(pRightType)) {
                return null;
            }

            if (Effect.isScalarType(pLeftType)) {
                return pRightBaseType;
            }

            if (Effect.isScalarType(pRightType)) {
                return pLeftBaseType;
            }

            if (sOperator === '*' || sOperator === '*=') {
                if (Effect.isMatrixType(pLeftType) && Effect.isVectorType(pRightType) &&
                    pLeftType._getLength() === pRightType._getLength()) {
                    return pRightBaseType;
                }
                else if (Effect.isMatrixType(pRightType) && Effect.isVectorType(pLeftType) &&
                    pLeftType._getLength() === pRightType._getLength()) {
                    return pLeftBaseType;
                }
                else {
                    return null;
                }
            }
        }

        return null;
    }

    /**
     * Проверят возможность использования оператора к типу данных.
     * Возращает тип получаемый в результате приминения опрератора, или, если применить его невозможно - null.
     *
     * @sOperator {string} Один из операторов: + - ! ++ --
     * @pLeftType {IAFXVariableTypeInstruction} Тип операнда
     */
    private checkOneOperandExprType(sOperator: string,
                                    pType: IAFXVariableTypeInstruction): IAFXVariableTypeInstruction {

        if (pType._isUnverifiable === undefined) {
            // debug.log(pType);
            throw new Error(<{}>pType);
        }
        if (pType._isUnverifiable()) {
            return pType;
        }

        const isComplex: boolean = pType._isComplex();
        const isArray: boolean = pType._isNotBaseArray();
        const isSampler: boolean = Effect.isSamplerType(pType);

        if (isComplex || isArray || isSampler) {
            return null;
        }

        if (!pType._isReadable()) {
            this._error(EEffectErrors.BAD_TYPE_FOR_READ);
            return null;
        }


        if (sOperator === '++' || sOperator === '--') {
            if (!pType._isWritable()) {
                this._error(EEffectErrors.BAD_TYPE_FOR_WRITE);
                return null;
            }

            if (pType._isStrongEqual(Effect.getSystemType('ptr'))) {
                this.addPointerForExtract(pType._getParentVarDecl());
            }

            return pType;
        }

        if (sOperator === '!') {
            const pBoolType: IAFXVariableTypeInstruction = Effect.getSystemType('bool').getVariableType();

            if (pType._isEqual(pBoolType)) {
                return pBoolType;
            }
            else {
                return null;
            }
        }
        else {
            if (Effect.isBoolBasedType(pType)) {
                return null;
            }
            else {
                return (<SystemTypeInstruction>pType._getBaseType()).getVariableType();
            }
        }

        //return null;
    }

    private isAssignmentOperator(sOperator: string): boolean {
        return sOperator === '+=' || sOperator === '-=' ||
            sOperator === '*=' || sOperator === '/=' ||
            sOperator === '%=' || sOperator === '=';
    }

    private isArithmeticalOperator(sOperator: string): boolean {
        return sOperator === '+' || sOperator === '+=' ||
            sOperator === '-' || sOperator === '-=' ||
            sOperator === '*' || sOperator === '*=' ||
            sOperator === '/' || sOperator === '/=';
    }

    private isRelationalOperator(sOperator: string): boolean {
        return sOperator === '>' || sOperator === '>=' ||
            sOperator === '<' || sOperator === '<=';
    }

    private isEqualOperator(sOperator: string): boolean {
        return sOperator === '==' || sOperator === '!=';
    }

    private addExtactionStmts(pStmt: IAFXStmtInstruction): void {
        const pPointerList: IAFXVariableDeclInstruction[] = this.getPointerForExtractList();

        for (let i: number = 0; i < pPointerList.length; i++) {
            this.generateExtractStmtFromPointer(pPointerList[i], pStmt);
        }

        this.clearPointersForExtract();
    }

    private generateExtractStmtFromPointer(pPointer: IAFXVariableDeclInstruction, pParentStmt: IAFXStmtInstruction): IAFXStmtInstruction {
        const pPointerType: IAFXVariableTypeInstruction = pPointer._getType();
        let pWhatExtracted: IAFXVariableDeclInstruction = pPointerType._getDownPointer();
        let pWhatExtractedType: IAFXVariableTypeInstruction = null;

        const pFunction: IAFXFunctionDeclInstruction = this.getCurrentAnalyzedFunction();

        while (!isNull(pWhatExtracted)) {
            pWhatExtractedType = pWhatExtracted._getType();

            if (!pWhatExtractedType._isComplex()) {
                const pSingleExtract: ExtractStmtInstruction = new ExtractStmtInstruction();
                pSingleExtract.generateStmtForBaseType(
                    pWhatExtracted,
                    pWhatExtractedType._getPointer(),
                    pWhatExtractedType._getVideoBuffer(), 0, null);

                this.checkInstruction(pSingleExtract, ECheckStage.CODE_TARGET_SUPPORT);

                pParentStmt._push(pSingleExtract, true);

                if (!isNull(pFunction)) {
                    pFunction._addUsedFunction(pSingleExtract.getExtractFunction());
                }
            }
            else {
                this.generateExtractStmtForComplexVar(
                    pWhatExtracted, pParentStmt,
                    pWhatExtractedType._getPointer(),
                    pWhatExtractedType._getVideoBuffer(), 0);
            }

            pWhatExtracted = pWhatExtractedType._getDownPointer();
        }

        return pParentStmt;
    }

    private generateExtractStmtForComplexVar(pVarDecl: IAFXVariableDeclInstruction,
                                             pParentStmt: IAFXStmtInstruction,
                                             pPointer: IAFXVariableDeclInstruction,
                                             pBuffer: IAFXVariableDeclInstruction,
                                             iPadding: number): void {
        const pVarType: IAFXVariableTypeInstruction = pVarDecl._getType();
        const pFieldNameList: string[] = pVarType._getFieldNameList();
        let pField: IAFXVariableDeclInstruction = null;
        let pFieldType: IAFXVariableTypeInstruction = null;
        let pSingleExtract: ExtractStmtInstruction = null;

        const pFunction: IAFXFunctionDeclInstruction = this.getCurrentAnalyzedFunction();

        for (let i: number = 0; i < pFieldNameList.length; i++) {
            pField = pVarType._getField(pFieldNameList[i]);

            if (isNull(pField)) {
                continue;
            }

            pFieldType = pField._getType();

            if (pFieldType._isPointer()) {
                const pFieldPointer: IAFXVariableDeclInstruction = pFieldType._getMainPointer();
                pSingleExtract = new ExtractStmtInstruction();
                pSingleExtract.generateStmtForBaseType(pFieldPointer, pPointer, pFieldType._getVideoBuffer(), iPadding + pFieldType._getPadding(), null);

                this.checkInstruction(pSingleExtract, ECheckStage.CODE_TARGET_SUPPORT);

                pParentStmt._push(pSingleExtract, true);
                this.generateExtractStmtFromPointer(pFieldPointer, pParentStmt);

                if (!isNull(pFunction)) {
                    pFunction._addUsedFunction(pSingleExtract.getExtractFunction());
                }
            } else if (pFieldType._isComplex()) {
                this.generateExtractStmtForComplexVar(pField, pParentStmt, pPointer, pBuffer, iPadding + pFieldType._getPadding());
            } else {
                pSingleExtract = new ExtractStmtInstruction();
                pSingleExtract.generateStmtForBaseType(pField, pPointer, pBuffer, iPadding + pFieldType._getPadding(), null);

                this.checkInstruction(pSingleExtract, ECheckStage.CODE_TARGET_SUPPORT);

                pParentStmt._push(pSingleExtract, true);

                if (!isNull(pFunction)) {
                    pFunction._addUsedFunction(pSingleExtract.getExtractFunction());
                }
            }
        }
    }

    private getNodeSourceLocation(pNode: IParseNode): { line: number; column: number; } {
        if (isDef(pNode.line)) {
            return { line: pNode.line, column: pNode.start };
        } else {
            return this.getNodeSourceLocation(pNode.children[pNode.children.length - 1]);
        }
    }

    private checkInstruction(pInst: IAFXInstruction, eStage: ECheckStage): void {
        if (!pInst._check(eStage)) {
            this._errorFromInstruction(pInst._getLastError());
        }
    }
}
