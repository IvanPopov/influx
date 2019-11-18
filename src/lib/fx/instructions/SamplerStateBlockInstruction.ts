import { ExprInstruction } from "./ExprInstruction";
import { IMap } from "../../idl/IMap";
import { IVariableDeclInstruction, EInstructionTypes, ISamplerStateBlockInstruction, ISamplerStateInstruction } from "../../idl/IInstruction";
import { isNull, isDef } from "../../common";
import { ISamplerState } from "../../idl/ISamplerState"
import { ETextureWrapModes, ETextureFilters } from "../../idl/ITexture";
import { IParseNode } from "../../idl/parser/IParser";
import { IInstructionSettings, Instruction } from "./Instruction";
import * as SystemScope from '../SystemScope';

export type SamplerOperator = "sampler_state";

export interface ISamplerStateBlockInstructionSettings extends IInstructionSettings {
    operator: SamplerOperator;
    params?: ISamplerStateInstruction[];
}


/**
  * Represetn sampler_state { states }
  */
export class SamplerStateBlockInstruction extends ExprInstruction implements ISamplerStateBlockInstruction {
    protected _samplerParams: ISamplerStateInstruction[];
    protected _operator: SamplerOperator;


    constructor({ operator, params = [], ...settings }: ISamplerStateBlockInstructionSettings) {
        // todo: resolve type from texture type!
        super({ instrType: EInstructionTypes.k_SamplerStateBlockExpr, type: SystemScope.T_SAMPLER, ...settings } );
        
        this._samplerParams = params.map(param => Instruction.$withParent(param, this));
        this._operator = operator;
    }

    
    get texture(): IVariableDeclInstruction {
        let params = this._samplerParams;
        for (let i = 0; i < params.length; ++ i) {
            if (params[i].name === "TEXTURE") {
                return <IVariableDeclInstruction>params[i].value;
            }
        }
        return null;
    }

    
    get params(): ISamplerStateInstruction[] {
        return this._samplerParams;
    }


    get operator(): string {
        return this._operator;
    }


    isConst(): boolean {
        return true;
    }

    
    // todo: rewrite it!
    evaluate(): boolean {
        var samplerState: ISamplerState = {
            textureName: "",

            wrap_s: 0,
            wrap_t: 0,

            mag_filter: 0,
            min_filter: 0
        };

        if (!isNull(this.texture)) {
            samplerState.textureName = this.texture.name;
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
