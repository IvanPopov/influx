import { assert, isNull } from "@lib/common";
import { EInstructionTypes, IFunctionDeclInstruction } from "@lib/idl/IInstruction";

import { FunctionDeclInstruction, IFunctionDeclInstructionSettings } from "./FunctionDeclInstruction";

export interface ISystemFunctionInstructionSettings extends IFunctionDeclInstructionSettings {
    vertex?: boolean;
    pixel?: boolean;
}


export class SystemFunctionInstruction extends FunctionDeclInstruction implements IFunctionDeclInstruction {
    protected _bForVertex: boolean;
    protected _bForPixel: boolean;
    // protected _bForCompute;
    // protected _bForGeometry;
    
     constructor({ vertex = true, pixel = true, impl = null, ...settings }: ISystemFunctionInstructionSettings) {
        super({ instrType: EInstructionTypes.k_SystemFunctionDecl, impl: null, ...settings });
        
        assert(isNull(impl));

        this._bForVertex = vertex;
        this._bForPixel = pixel;
    }


    checkVertexUsage(): boolean {
        return this._bForVertex;
    }


    checkPixelUsage(): boolean {
        return this._bForPixel;
    }


    $makeVertexCompatible(val: boolean): void {
        console.warn("@deprecated");
        this._bForVertex = val;
    }


    $makePixelCompatible(val: boolean): void {
        console.warn("@deprecated");
        this._bForPixel = val;
    }
}

