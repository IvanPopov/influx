import { isNull } from "@lib/common";
import { isNumber } from "@lib/common";
import { ERenderStates } from "@lib/idl/ERenderStates";
import { ERenderStateValues } from "@lib/idl/ERenderStateValues";
import { EInstructionTypes, IAnnotationInstruction, IFunctionDeclInstruction, IIdInstruction, IPassInstruction } from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";
import { ISamplerState } from "@lib/idl/ISamplerState";
import { ETextureFilters, ETextureWrapModes } from "@lib/idl/ITexture";

import { DeclInstruction, IDeclInstructionSettings } from "./DeclInstruction";
import { Instruction } from "./Instruction";

export interface IPassInstructionSettings extends IDeclInstructionSettings {
    vertexShader?: IFunctionDeclInstruction;
    pixelShader?: IFunctionDeclInstruction;
    renderStates?: IMap<ERenderStateValues>;
    id?: IIdInstruction;
}


export class PassInstruction extends DeclInstruction implements IPassInstruction {
    protected _vertexShader: IFunctionDeclInstruction;
    protected _pixelShader: IFunctionDeclInstruction;
    protected _passStateMap: IMap<ERenderStateValues>;
    protected _id: IIdInstruction;
    protected _annotation: IAnnotationInstruction;

    constructor({ id = null, vertexShader = null, pixelShader = null, renderStates = {}, ...settings }: IPassInstructionSettings) {
        super({ instrType: EInstructionTypes.k_PassDecl, ...settings });

        this._passStateMap = {};
        PassInstruction.clearRenderStateMap(this._passStateMap);
        PassInstruction.copyRenderStateMap(renderStates, this._passStateMap);
 
        this._vertexShader = Instruction.$withNoParent(vertexShader);
        this._pixelShader = Instruction.$withNoParent(pixelShader);

        this._id = id;
    }


    get id(): IIdInstruction {
        return this._id;
    }


    get name(): string {
        if (isNull(this._id)) {
            return null;
        }
        return this._id.name;
    }


    get vertexShader(): IFunctionDeclInstruction {
        return this._vertexShader;
    }

    get pixelShader(): IFunctionDeclInstruction {
        return this._pixelShader;
    }


    getState(state: ERenderStates): ERenderStateValues {
        return this._passStateMap[state];
    }

    get renderStates(): IMap<ERenderStateValues> {
        return this._passStateMap;
    }

    static createRenderStateMap(): IMap<ERenderStateValues> {
        let map: IMap<ERenderStateValues> = <IMap<ERenderStateValues>>{};
        PassInstruction.clearRenderStateMap(map);

        return map;
    }

    static copyRenderStateMap(from: IMap<ERenderStateValues>, to: IMap<ERenderStateValues>): void {
        if (isNull(from)) {
            return;
        }

        Object
            .keys(ERenderStates)
            .filter(k => isNumber(ERenderStates[k]))
            .map(k => ERenderStates[k])
            .forEach(rs => { to[rs] = from[rs] || to[rs] });
    }


    static clearRenderStateMap(map: IMap<ERenderStateValues>): void {
        Object
            .keys(ERenderStates)
            .filter(k => isNumber(ERenderStates[k]))
            .map(k => ERenderStates[k])
            .forEach(rs => { map[rs] = ERenderStateValues.UNDEF });
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

