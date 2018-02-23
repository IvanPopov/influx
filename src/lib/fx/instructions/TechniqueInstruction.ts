import { isNull } from '../../common';
import { EAFXInstructionTypes, IAFXPassInstruction, IAFXTechniqueInstruction } from '../../idl/IAFXInstruction';
import { DeclInstruction } from './DeclInstruction';
import { PassInstruction } from './PassInstruction';

export class TechniqueInstruction extends DeclInstruction implements IAFXTechniqueInstruction {
    private _sName: string = '';
    private _bHasComplexName: boolean = false;
    private _pPassList: IAFXPassInstruction[] = null;
    private _nTotalPasses: number = 0;
    private _bIsPostEffect: boolean = false;

    constructor() {
        super();
        this._pInstructionList = null;
        this._eInstructionType = EAFXInstructionTypes.k_TechniqueInstruction;
    }

    _setName(sName: string, isComplexName: boolean): void {
        this._sName = sName;
        this._bHasComplexName = isComplexName;
    }

    _getName(): string {
        return this._sName;
    }

    _setSemantic(sSemantic: string): void {
        super._setSemantic(sSemantic);

        if (sSemantic === PassInstruction.POST_EFFECT_SEMANTIC) {
            this._bIsPostEffect = true;
        } else {
            this._bIsPostEffect = false;
        }
    }

    _hasComplexName(): boolean {
        return this._bHasComplexName;
    }

    _isPostEffect(): boolean {
        return this._bIsPostEffect;
    }

    _addPass(pPass: IAFXPassInstruction): void {
        if (isNull(this._pPassList)) {
            this._pPassList = [];
        }

        this._pPassList.push(pPass);
    }

    _getPassList(): IAFXPassInstruction[] {
        return this._pPassList;
    }

    _getPass(iPass: number): IAFXPassInstruction {
        return iPass < this._pPassList.length ? this._pPassList[iPass] : null;
    }

    _totalOwnPasses(): number {
        return this._pPassList.length;
    }

    _totalPasses(): number {
        return this._nTotalPasses;
    }
}
