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
    
    constructor({ vertex = true, pixel = true, implementation = null, ...settings }: ISystemFunctionInstructionSettings) {
        super({ instrType: EInstructionTypes.k_SystemFunctionDeclInstruction, implementation: null, ...settings });
        
        assert(isNull(implementation));

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

