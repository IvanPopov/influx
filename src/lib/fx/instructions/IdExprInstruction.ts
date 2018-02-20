import { IAFXIdExprInstruction, IAFXVariableTypeInstruction, EAFXInstructionTypes, IAFXVariableDeclInstruction, EFunctionType, IAFXInstruction, EVarUsedMode, IAFXTypeUseInfoContainer } from "../../idl/IAFXInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { ExprInstruction } from "./ExprInstruction";
import { isNull, isDef } from "../../common";
import { IMap } from "../../idl/IMap";
import { IdInstruction } from "./IdInstruction";

export class IdExprInstruction extends ExprInstruction implements IAFXIdExprInstruction {
    protected _pType: IAFXVariableTypeInstruction = null;

    private _bToFinalCode: boolean = true;
    private _isInPassUnifoms: boolean = false;
    private _isInPassForeigns: boolean = false;

    get visible(): boolean {
        return this._pInstructionList[0].visible;
    }

    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = [null];
        this._eInstructionType = EAFXInstructionTypes.k_IdExprInstruction;
    }

    get type(): IAFXVariableTypeInstruction {
        if (!isNull(this._pType)) {
            return this._pType;
        }
        else {
            var pVar: IdInstruction = <IdInstruction>this._pInstructionList[0];
            this._pType = (<IAFXVariableDeclInstruction>pVar.parent).type;
            return this._pType;
        }
    }

    isConst(): boolean {
        return this.type.isConst();
    }

    evaluate(): boolean {
        return false;
    }

    prepareFor(eUsedMode: EFunctionType): void {
        if (!this.visible) {
            this._bToFinalCode = false;
        }

        if (eUsedMode === EFunctionType.k_PassFunction) {
            var pVarDecl: IAFXVariableDeclInstruction = <IAFXVariableDeclInstruction>this.instructions[0].parent;
            if (!this.type.isUnverifiable() && isNull(pVarDecl.parent)) {
                this._isInPassUnifoms = true;
            }
        }
    }

    _toFinalCode(): string {
        var sCode: string = "";
        if (this._bToFinalCode) {
            if (this._isInPassForeigns || this._isInPassUnifoms) {
                var pVarDecl: IAFXVariableDeclInstruction = <IAFXVariableDeclInstruction>this.instructions[0].parent;
                if (this._isInPassForeigns) {
                    sCode += "foreigns[\"" + pVarDecl.nameIndex + "\"]";
                }
                else {
                    sCode += "uniforms[\"" + pVarDecl.nameIndex + "\"]";
                }
            }
            else {
                sCode += this.instructions[0]._toFinalCode();
            }
        }
        return sCode;
    }

    _clone(pRelationMap?: IMap<IAFXInstruction>): IAFXIdExprInstruction {
        if (this.type.isSampler()) {
            //TODO: Need fix for shaders used as functions. Need use relation map.
            return this;
        }
        return <IAFXIdExprInstruction>super._clone(pRelationMap);
    }

    _addUsedData(pUsedDataCollector: IMap<IAFXTypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        if (!this.type.isFromVariableDecl()) {
            return;
        }

        var pInfo: IAFXTypeUseInfoContainer = null;
        pInfo = pUsedDataCollector[this.type.instructionID];

        if (!isDef(pInfo)) {
            pInfo = <IAFXTypeUseInfoContainer>{
                type: this.type,
                isRead: false,
                isWrite: false,
                numRead: 0,
                numWrite: 0,
                numUsed: 0
            }

            pUsedDataCollector[this.type.instructionID] = pInfo;
        }

        if (eUsedMode !== EVarUsedMode.k_Write && eUsedMode !== EVarUsedMode.k_Undefined) {
            pInfo.isRead = true;
            pInfo.numRead++;
        }

        if (eUsedMode === EVarUsedMode.k_Write || eUsedMode === EVarUsedMode.k_ReadWrite) {
            pInfo.isWrite = true;
            pInfo.numWrite++;
        }

        pInfo.numUsed++;
    }
}

