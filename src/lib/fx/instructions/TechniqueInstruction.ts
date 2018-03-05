import { isNull } from '../../common';
import { IAnnotationInstruction } from "./../../idl/IInstruction";
import { EInstructionTypes, IPassInstruction, ITechniqueInstruction } from '../../idl/IInstruction';
import { DeclInstruction } from './DeclInstruction';
import { PassInstruction } from './PassInstruction';
import { IParseNode } from '../../idl/parser/IParser';

export class TechniqueInstruction extends DeclInstruction implements ITechniqueInstruction {
    protected _name: string;
    protected _passList: IPassInstruction[];

    constructor(node: IParseNode, name: string, passes: IPassInstruction[], 
                semantics: string = null, annotation: IAnnotationInstruction = null) {
        super(node, semantics, annotation, EInstructionTypes.k_TechniqueInstruction);
        this._name = name;
        this._passList = passes;
    }


    get name(): string {
        return this._name;
    }

    
    get passList(): IPassInstruction[] {
        return this._passList;
    }
}
