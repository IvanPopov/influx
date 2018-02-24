import { isNull } from '../../common';
import { EInstructionTypes, IPassInstruction, ITechniqueInstruction } from '../../idl/IInstruction';
import { DeclInstruction } from './DeclInstruction';
import { PassInstruction } from './PassInstruction';
import { IParseNode } from '../../idl/parser/IParser';

export class TechniqueInstruction extends DeclInstruction implements ITechniqueInstruction {
    private _sName: string;
    private _bHasComplexName: boolean;
    private _pPassList: IPassInstruction[];

    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_TechniqueInstruction);
        this._sName = null;
        this._bHasComplexName = null;
        this._pPassList = [];

    }

    set name(sName: string) {
        this._sName = sName;
    }

    set complexName(bVal: boolean) {
        this._bHasComplexName = bVal;
    }

    get name(): string {
        return this._sName;
    }

    get complexName(): boolean {
        return this._bHasComplexName;
    }

    get passList(): IPassInstruction[] {
        return this._pPassList;
    }

    
    get totalPasses(): number {
        return this._pPassList.length;
    }


    addPass(pPass: IPassInstruction): void {
        if (isNull(this._pPassList)) {
            this._pPassList = [];
        }

        this._pPassList.push(pPass);
    }


    getPass(iPass: number): IPassInstruction {
        return iPass < this._pPassList.length ? this._pPassList[iPass] : null;
    }
}
