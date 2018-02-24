import { ExprInstruction } from "./ExprInstruction";
import { IVariableDeclInstruction, EInstructionTypes, ISamplerStateBlockInstruction } from "../../idl/IInstruction";
import { isNull, isDef } from "../../common";
import { ISamplerState } from "../../idl/ISamplerState"
import { ETextureWrapModes, ETextureFilters } from "../../idl/ITexture";
import { IParseNode } from "../../idl/parser/IParser";


/**
  * Represetn sampler_state { states }
  */
export class SamplerStateBlockInstruction extends ExprInstruction implements ISamplerStateBlockInstruction {
    private _pTexture: IVariableDeclInstruction;
    private _pSamplerParams: any;

    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_SamplerStateBlockInstruction);
        this._pSamplerParams = null;
        this._pTexture = null;
    }

    set texture(pTexture: IVariableDeclInstruction) {
        this._pTexture = pTexture;
    }

    get texture(): IVariableDeclInstruction {
        return this._pTexture;
    }


    addState(sStateType: string, sStateValue: string): void {
        if (isNull(this._pSamplerParams)) {
            this._pSamplerParams = {};
        }

        this._pSamplerParams[sStateType] = sStateValue;
        return;
    }


    isConst(): boolean {
        return true;
    }


    evaluate(): boolean {
        var pSamplerState: ISamplerState = {
            // texture: null,
            textureName: "",

            wrap_s: 0,
            wrap_t: 0,

            mag_filter: 0,
            min_filter: 0
        };

        if (!isNull(this._pTexture)) {
            pSamplerState.textureName = this._pTexture.realName;
        }

        if (!isNull(this._pSamplerParams)) {
            if (isDef(this._pSamplerParams["ADDRESSU"])) {
                pSamplerState.wrap_s = SamplerStateBlockInstruction.convertWrapMode(this._pSamplerParams["ADDRESSU"]);
            }

            if (isDef(this._pSamplerParams["ADDRESSV"])) {
                pSamplerState.wrap_t = SamplerStateBlockInstruction.convertWrapMode(this._pSamplerParams["ADDRESSV"]);
            }

            if (isDef(this._pSamplerParams["MAGFILTER"])) {
                pSamplerState.mag_filter = SamplerStateBlockInstruction.convertFilters(this._pSamplerParams["MAGFILTER"]);
            }

            if (isDef(this._pSamplerParams["MINFILTER"])) {
                pSamplerState.min_filter = SamplerStateBlockInstruction.convertFilters(this._pSamplerParams["MINFILTER"]);
            }
        }


        this._pLastEvalResult = pSamplerState;

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
