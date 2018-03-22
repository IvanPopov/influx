import { IFunctionDeclInstruction, ISimpleInstruction, ITypeDeclInstruction, IIdInstruction, ITypeInstruction, EInstructionTypes, IVariableTypeInstruction, EFunctionType, IInstruction, IDeclInstruction, IVariableDeclInstruction, EVarUsedMode, IStmtInstruction, ITypedInstruction, IScope } from "../../idl/IInstruction";
import { IDeclInstructionSettings } from "./DeclInstruction";
import { DeclInstruction } from "./DeclInstruction";
import { IdInstruction } from "./IdInstruction";
import { isNull, assert } from "../../common";
import { IMap } from "../../idl/IMap";
import { VariableTypeInstruction } from "./VariableTypeInstruction";
import { TypedInstruction } from "./TypedInstruction";
import * as SystemScope from "../SystemScope";
import { IFunctionDeclInstructionSettings, FunctionDeclInstruction } from "./FunctionDeclInstruction";


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


    $overwriteType(type: EFunctionType) {
        console.error("@undefined_behavior");
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

