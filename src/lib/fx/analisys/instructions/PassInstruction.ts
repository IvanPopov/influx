import { isNull, isNumber } from "@lib/common";
import { ERenderStates } from "@lib/idl/ERenderStates";
import { ERenderStateValues } from "@lib/idl/ERenderStateValues";
import { EInstructionTypes, IFunctionDeclInstruction, IIdInstruction, IPassInstruction } from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";

import { DeclInstruction, IDeclInstructionSettings } from "./DeclInstruction";
import { Instruction } from "./Instruction";

export interface IPassInstructionSettings extends IDeclInstructionSettings {
    vertexShader?: IFunctionDeclInstruction;
    pixelShader?: IFunctionDeclInstruction;
    renderStates?: IMap<ERenderStateValues>;
    id?: IIdInstruction;
}


export class PassInstruction extends DeclInstruction implements IPassInstruction {
    protected _id: IIdInstruction;
    protected _vertexShader: IFunctionDeclInstruction;
    protected _pixelShader: IFunctionDeclInstruction;
    protected _passStateMap: IMap<ERenderStateValues>;

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


    // TODO: move it to helpers
    private static copyRenderStateMap(from: IMap<ERenderStateValues>, to: IMap<ERenderStateValues>): void {
        if (isNull(from)) {
            return;
        }

        Object
            .keys(ERenderStates)
            .filter(k => isNumber(ERenderStates[k]))
            .map(k => ERenderStates[k])
            .forEach(rs => { to[rs] = from[rs] || to[rs] });
    }


    // TODO: move it to helpers
    private static clearRenderStateMap(map: IMap<ERenderStateValues>): void {
        Object
            .keys(ERenderStates)
            .filter(k => isNumber(ERenderStates[k]))
            .map(k => ERenderStates[k])
            .forEach(rs => { map[rs] = ERenderStateValues.UNDEF });
    }


    isValid(): boolean {
        return true;
    }
}

