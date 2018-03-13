import { IFunctionDeclInstruction, IPassInstruction, EFunctionType, IVariableDeclInstruction, EInstructionTypes, ITypeInstruction } from "../../idl/IInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";
import { IDeclInstructionSettings } from "./DeclInstruction";
import { IAnnotationInstruction } from "./../../idl/IInstruction";
import { ERenderStateValues } from "../../idl/ERenderStateValues";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";
import { DeclInstruction } from "./DeclInstruction";
import { isNull } from "../../common";
import { ERenderStates } from "../../idl/ERenderStates";
import { ETextureWrapModes, ETextureFilters } from "../../idl/ITexture";
import { ISamplerState } from "../../idl/ISamplerState";


export interface IPassInstructionSettings extends IDeclInstructionSettings {
    vertexShader?: IFunctionDeclInstruction;
    pixelShader?: IFunctionDeclInstruction;
    renderStates?: IMap<ERenderStateValues>;
}


export class PassInstruction extends DeclInstruction implements IPassInstruction {
    protected _vertexShader: IFunctionDeclInstruction;
    protected _pixelShader: IFunctionDeclInstruction;
    protected _passStateMap: IMap<ERenderStateValues>;

    protected _uniformVariableMapV: IMap<IVariableDeclInstruction>;
    protected _textureVariableMapV: IMap<IVariableDeclInstruction>;
    protected _usedComplexTypeMapV: IMap<ITypeInstruction>;

    protected _uniformVariableMapP: IMap<IVariableDeclInstruction>;
    protected _textureVariableMapP: IMap<IVariableDeclInstruction>;
    protected _usedComplexTypeMapP: IMap<ITypeInstruction>;

    // todo: remove this extra info
    protected _fullUniformVariableMap: IMap<IVariableDeclInstruction>;
    protected _fullTextureVariableMap: IMap<IVariableDeclInstruction>;

    constructor({ vertexShader = null, pixelShader = null, renderStates = {}, ...settings }: IPassInstructionSettings) {
        super({ instrType: EInstructionTypes.k_PassInstruction, ...settings });

        this._passStateMap = {};
        PassInstruction.clearRenderStateMap(this._passStateMap);
        PassInstruction.copyRenderStateMap(renderStates, this._passStateMap);

        this._vertexShader = Instruction.$withParent(vertexShader, this);
        this._pixelShader = Instruction.$withParent(pixelShader, this);

        console.assert(vertexShader.functionType === EFunctionType.k_Vertex);
        console.assert(pixelShader.functionType === EFunctionType.k_Pixel);

        this._uniformVariableMapV = {};
        this._textureVariableMapV = {};
        this._usedComplexTypeMapV = {};

        this._uniformVariableMapP = {};
        this._textureVariableMapP = {};
        this._usedComplexTypeMapP = {};

        this._fullUniformVariableMap = {};
        this._fullTextureVariableMap = {};
    }

    get uniformVariableMapV(): IMap<IVariableDeclInstruction> {
        return this._uniformVariableMapV;
    }

    get textureVariableMapV(): IMap<IVariableDeclInstruction> {
        return this._textureVariableMapV;
    }

    get usedComplexTypeMapV(): IMap<ITypeInstruction> {
        return this._usedComplexTypeMapV;
    }

    get uniformVariableMapP(): IMap<IVariableDeclInstruction> {
        return this._uniformVariableMapP;
    }

    get textureVariableMapP(): IMap<IVariableDeclInstruction> {
        return this._textureVariableMapP;
    }

    get usedComplexTypeMapP(): IMap<ITypeInstruction> {
        return this._usedComplexTypeMapP;
    }

    get fullUniformMap(): IMap<IVariableDeclInstruction> {
        return this._fullUniformVariableMap;
    }

    get fullTextureMap(): IMap<IVariableDeclInstruction> {
        return this._fullTextureVariableMap;
    }

    get vertexShader(): IFunctionDeclInstruction {
        return this._vertexShader;
    }

    get pixelShader(): IFunctionDeclInstruction {
        return this._pixelShader;
    }

    finalizePass(): void {
        this.generateInfoAboutUsedVaraibles();
    }


    evaluate(pEngineStates: any, pUniforms: any): boolean {
        return true;
    }


    getState(eType: ERenderStates): ERenderStateValues {
        return this._passStateMap[eType];
    }

    get renderStates(): IMap<ERenderStateValues> {
        return this._passStateMap;
    }


    private generateInfoAboutUsedVaraibles(): void {
        {
            if (!isNull(this._vertexShader)) {
                this.addInfoAbouUsedVariablesFromFunction(this._vertexShader);
            }
            if (!isNull(this._pixelShader)) {
                this.addInfoAbouUsedVariablesFromFunction(this._pixelShader);
            }
        }
    }

    private addInfoAbouUsedVariablesFromFunction(pFunction: IFunctionDeclInstruction): void {
        var uniformVars: IMap<IVariableDeclInstruction> = pFunction.uniformVariableMap;
        var textureVars: IMap<IVariableDeclInstruction> = pFunction.textureVariableMap;
        var types: IMap<ITypeInstruction> = pFunction.usedComplexTypeMap;

        var uniformVarsTo: IMap<IVariableDeclInstruction> = null;
        var textureVarsTo: IMap<IVariableDeclInstruction> = null;
        var typesTo: IMap<ITypeInstruction> = null;

        if (pFunction.functionType === EFunctionType.k_Vertex) {
            uniformVarsTo = this._uniformVariableMapV;
            textureVarsTo = this._textureVariableMapV;
            typesTo = this._usedComplexTypeMapV;
        }
        else {
            uniformVarsTo = this._uniformVariableMapP;
            textureVarsTo = this._textureVariableMapP;
            typesTo = this._usedComplexTypeMapP;
        }

        for (var i in uniformVars) {
            if (!isNull(uniformVars[i])) {
                uniformVarsTo[i] = uniformVars[i];
                this._fullUniformVariableMap[i] = uniformVars[i];
            }
        }
        for (var i in textureVars) {
            if (!isNull(textureVars[i])) {
                textureVarsTo[i] = textureVars[i];
                this._fullTextureVariableMap[i] = textureVars[i];
            }
        }
        for (var i in types) {
            if (!isNull(types[i])) {
                typesTo[i] = types[i];
            }
        }
    }

    static createRenderStateMap(): IMap<ERenderStateValues> {
        var map: IMap<ERenderStateValues> = <IMap<ERenderStateValues>>{};
        PassInstruction.clearRenderStateMap(map);

        return map;
    }

    static copyRenderStateMap(from: IMap<ERenderStateValues>, to: IMap<ERenderStateValues>): void {
        if (isNull(from)) {
            return;
        }

        to[ERenderStates.BLENDENABLE] = from[ERenderStates.BLENDENABLE] || to[ERenderStates.BLENDENABLE];
        to[ERenderStates.CULLFACEENABLE] = from[ERenderStates.CULLFACEENABLE] || to[ERenderStates.CULLFACEENABLE];
        to[ERenderStates.ZENABLE] = from[ERenderStates.ZENABLE] || to[ERenderStates.ZENABLE];
        to[ERenderStates.ZWRITEENABLE] = from[ERenderStates.ZWRITEENABLE] || to[ERenderStates.ZWRITEENABLE];
        to[ERenderStates.DITHERENABLE] = from[ERenderStates.DITHERENABLE] || to[ERenderStates.DITHERENABLE];
        to[ERenderStates.SCISSORTESTENABLE] = from[ERenderStates.SCISSORTESTENABLE] || to[ERenderStates.SCISSORTESTENABLE];
        to[ERenderStates.STENCILTESTENABLE] = from[ERenderStates.STENCILTESTENABLE] || to[ERenderStates.STENCILTESTENABLE];
        to[ERenderStates.POLYGONOFFSETFILLENABLE] = from[ERenderStates.POLYGONOFFSETFILLENABLE] || to[ERenderStates.POLYGONOFFSETFILLENABLE];
        to[ERenderStates.CULLFACE] = from[ERenderStates.CULLFACE] || to[ERenderStates.CULLFACE];
        to[ERenderStates.FRONTFACE] = from[ERenderStates.FRONTFACE] || to[ERenderStates.FRONTFACE];
        to[ERenderStates.SRCBLENDCOLOR] = from[ERenderStates.SRCBLENDCOLOR] || to[ERenderStates.SRCBLENDCOLOR];
        to[ERenderStates.DESTBLENDCOLOR] = from[ERenderStates.DESTBLENDCOLOR] || to[ERenderStates.DESTBLENDCOLOR];
        to[ERenderStates.SRCBLENDALPHA] = from[ERenderStates.SRCBLENDALPHA] || to[ERenderStates.SRCBLENDALPHA];
        to[ERenderStates.DESTBLENDALPHA] = from[ERenderStates.DESTBLENDALPHA] || to[ERenderStates.DESTBLENDALPHA];
        to[ERenderStates.BLENDEQUATIONCOLOR] = from[ERenderStates.BLENDEQUATIONCOLOR] || to[ERenderStates.BLENDEQUATIONCOLOR];
        to[ERenderStates.BLENDEQUATIONALPHA] = from[ERenderStates.BLENDEQUATIONALPHA] || to[ERenderStates.BLENDEQUATIONALPHA];
        to[ERenderStates.ZFUNC] = from[ERenderStates.ZFUNC] || to[ERenderStates.ZFUNC];
        to[ERenderStates.ALPHABLENDENABLE] = from[ERenderStates.ALPHABLENDENABLE] || to[ERenderStates.ALPHABLENDENABLE];
        to[ERenderStates.ALPHATESTENABLE] = from[ERenderStates.ALPHATESTENABLE] || to[ERenderStates.ALPHATESTENABLE];
    }

    static mergeRenderStateMap(fromA: IMap<ERenderStateValues>, fromB: IMap<ERenderStateValues>, to: IMap<ERenderStateValues>): void {
        if (isNull(fromA) || isNull(fromB)) {
            return;
        }
        to[ERenderStates.BLENDENABLE] = fromA[ERenderStates.BLENDENABLE] || fromB[ERenderStates.BLENDENABLE];
        to[ERenderStates.CULLFACEENABLE] = fromA[ERenderStates.CULLFACEENABLE] || fromB[ERenderStates.CULLFACEENABLE];
        to[ERenderStates.ZENABLE] = fromA[ERenderStates.ZENABLE] || fromB[ERenderStates.ZENABLE];
        to[ERenderStates.ZWRITEENABLE] = fromA[ERenderStates.ZWRITEENABLE] || fromB[ERenderStates.ZWRITEENABLE];
        to[ERenderStates.DITHERENABLE] = fromA[ERenderStates.DITHERENABLE] || fromB[ERenderStates.DITHERENABLE];
        to[ERenderStates.SCISSORTESTENABLE] = fromA[ERenderStates.SCISSORTESTENABLE] || fromB[ERenderStates.SCISSORTESTENABLE];
        to[ERenderStates.STENCILTESTENABLE] = fromA[ERenderStates.STENCILTESTENABLE] || fromB[ERenderStates.STENCILTESTENABLE];
        to[ERenderStates.POLYGONOFFSETFILLENABLE] = fromA[ERenderStates.POLYGONOFFSETFILLENABLE] || fromB[ERenderStates.POLYGONOFFSETFILLENABLE];
        to[ERenderStates.CULLFACE] = fromA[ERenderStates.CULLFACE] || fromB[ERenderStates.CULLFACE];
        to[ERenderStates.FRONTFACE] = fromA[ERenderStates.FRONTFACE] || fromB[ERenderStates.FRONTFACE];
        to[ERenderStates.SRCBLENDCOLOR] = fromA[ERenderStates.SRCBLENDCOLOR] || fromB[ERenderStates.SRCBLENDCOLOR];
        to[ERenderStates.DESTBLENDCOLOR] = fromA[ERenderStates.DESTBLENDCOLOR] || fromB[ERenderStates.DESTBLENDCOLOR];
        to[ERenderStates.SRCBLENDALPHA] = fromA[ERenderStates.SRCBLENDALPHA] || fromB[ERenderStates.SRCBLENDALPHA];
        to[ERenderStates.DESTBLENDALPHA] = fromA[ERenderStates.DESTBLENDALPHA] || fromB[ERenderStates.DESTBLENDALPHA];
        to[ERenderStates.BLENDEQUATIONCOLOR] = fromA[ERenderStates.BLENDEQUATIONCOLOR] || fromB[ERenderStates.BLENDEQUATIONCOLOR];
        to[ERenderStates.BLENDEQUATIONALPHA] = fromA[ERenderStates.BLENDEQUATIONALPHA] || fromB[ERenderStates.BLENDEQUATIONALPHA];
        to[ERenderStates.ZFUNC] = fromA[ERenderStates.ZFUNC] || fromB[ERenderStates.ZFUNC];
        to[ERenderStates.ALPHABLENDENABLE] = fromA[ERenderStates.ALPHABLENDENABLE] || fromB[ERenderStates.ALPHABLENDENABLE];
        to[ERenderStates.ALPHATESTENABLE] = fromA[ERenderStates.ALPHATESTENABLE] || fromB[ERenderStates.ALPHATESTENABLE];
    }

    static clearRenderStateMap(map: IMap<ERenderStateValues>): void {
        map[ERenderStates.BLENDENABLE] = ERenderStateValues.UNDEF;
        map[ERenderStates.CULLFACEENABLE] = ERenderStateValues.UNDEF;
        map[ERenderStates.ZENABLE] = ERenderStateValues.UNDEF;
        map[ERenderStates.ZWRITEENABLE] = ERenderStateValues.UNDEF;
        map[ERenderStates.DITHERENABLE] = ERenderStateValues.UNDEF;
        map[ERenderStates.SCISSORTESTENABLE] = ERenderStateValues.UNDEF;
        map[ERenderStates.STENCILTESTENABLE] = ERenderStateValues.UNDEF;
        map[ERenderStates.POLYGONOFFSETFILLENABLE] = ERenderStateValues.UNDEF;
        map[ERenderStates.CULLFACE] = ERenderStateValues.UNDEF;
        map[ERenderStates.FRONTFACE] = ERenderStateValues.UNDEF;
        map[ERenderStates.SRCBLENDCOLOR] = ERenderStateValues.UNDEF;
        map[ERenderStates.DESTBLENDCOLOR] = ERenderStateValues.UNDEF;
        map[ERenderStates.SRCBLENDALPHA] = ERenderStateValues.UNDEF;
        map[ERenderStates.DESTBLENDALPHA] = ERenderStateValues.UNDEF;
        map[ERenderStates.BLENDEQUATIONCOLOR] = ERenderStateValues.UNDEF;
        map[ERenderStates.BLENDEQUATIONALPHA] = ERenderStateValues.UNDEF;
        map[ERenderStates.ZFUNC] = ERenderStateValues.UNDEF;
        map[ERenderStates.ALPHABLENDENABLE] = ERenderStateValues.UNDEF;
        map[ERenderStates.ALPHATESTENABLE] = ERenderStateValues.UNDEF;
    }


    static createSamplerState(): ISamplerState {
        return <ISamplerState>{
            textureName: "",
            texture: null,
            wrap_s: ETextureWrapModes.UNDEF,
            wrap_t: ETextureWrapModes.UNDEF,
            mag_filter: ETextureFilters.UNDEF,
            min_filter: ETextureFilters.UNDEF
            /*wrap_s: ETextureWrapModes.CLAMP_TO_EDGE,
            wrap_t: ETextureWrapModes.CLAMP_TO_EDGE,
            mag_filter: ETextureFilters.LINEAR,
            min_filter: ETextureFilters.LINEAR*/
        };
    }
}

