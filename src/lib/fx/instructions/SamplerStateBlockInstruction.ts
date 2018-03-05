import { ExprInstruction } from "./ExprInstruction";
import { IMap } from "./../../idl/IMap";
import { IVariableDeclInstruction, EInstructionTypes, ISamplerStateBlockInstruction } from "../../idl/IInstruction";
import { isNull, isDef } from "../../common";
import { ISamplerState } from "../../idl/ISamplerState"
import { ETextureWrapModes, ETextureFilters } from "../../idl/ITexture";
import { IParseNode } from "../../idl/parser/IParser";


/**
  * Represetn sampler_state { states }
  */
export class SamplerStateBlockInstruction extends ExprInstruction implements ISamplerStateBlockInstruction {
    protected _texture: IVariableDeclInstruction;
    protected _samplerParams: IMap<string>;
    protected _operator: string;


    constructor(node: IParseNode, texture: IVariableDeclInstruction, samplerParams: IMap<string>, operator: string) {
        super(node, texture.type, EInstructionTypes.k_SamplerStateBlockInstruction);
        this._samplerParams = samplerParams || {};
        this._texture = texture;
        this._operator = operator;
    }

    
    get texture(): IVariableDeclInstruction {
        return this._texture;
    }

    
    get params(): IMap<string> {
        return this._samplerParams;
    }


    get operator(): string {
        return this._operator;
    }


    isConst(): boolean {
        return true;
    }

    
    evaluate(): boolean {
        var samplerState: ISamplerState = {
            textureName: "",

            wrap_s: 0,
            wrap_t: 0,

            mag_filter: 0,
            min_filter: 0
        };

        if (!isNull(this._texture)) {
            samplerState.textureName = this._texture.realName;
        }

        if (!isNull(this._samplerParams)) {
            if (isDef(this._samplerParams["ADDRESSU"])) {
                samplerState.wrap_s = SamplerStateBlockInstruction.convertWrapMode(this._samplerParams["ADDRESSU"]);
            }

            if (isDef(this._samplerParams["ADDRESSV"])) {
                samplerState.wrap_t = SamplerStateBlockInstruction.convertWrapMode(this._samplerParams["ADDRESSV"]);
            }

            if (isDef(this._samplerParams["MAGFILTER"])) {
                samplerState.mag_filter = SamplerStateBlockInstruction.convertFilters(this._samplerParams["MAGFILTER"]);
            }

            if (isDef(this._samplerParams["MINFILTER"])) {
                samplerState.min_filter = SamplerStateBlockInstruction.convertFilters(this._samplerParams["MINFILTER"]);
            }
        }


        this._evalResult = samplerState;
        return true;
    }


    static convertWrapMode(sState: string): ETextureWrapModes {
        switch (sState) {
            case "WRAP":
                return ETextureWrapModes.REPEAT;
            case "CLAMP":
                return ETextureWrapModes.CLAMP_TO_EDGE;
            case "MIRROR":
                return ETextureWrapModes.MIRRORED_REPEAT;
            default:
                return 0;
        }
    }
    

    static convertFilters(sState: string): ETextureFilters {
        switch (sState) {
            case "NEAREST":
                return ETextureFilters.NEAREST;
            case "LINEAR":
                return ETextureFilters.LINEAR;
            case "NEAREST_MIPMAP_NEAREST":
                return ETextureFilters.NEAREST_MIPMAP_NEAREST;
            case "LINEAR_MIPMAP_NEAREST":
                return ETextureFilters.LINEAR_MIPMAP_NEAREST;
            case "NEAREST_MIPMAP_LINEAR":
                return ETextureFilters.NEAREST_MIPMAP_LINEAR;
            case "LINEAR_MIPMAP_LINEAR":
                return ETextureFilters.LINEAR_MIPMAP_LINEAR;
            default:
                return 0;
        }
    }
}
