import { IIdExprInstruction, IVariableTypeInstruction, EInstructionTypes, IVariableDeclInstruction, EFunctionType, IInstruction, EVarUsedMode, ITypeUseInfoContainer } from "../../idl/IInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { ExprInstruction } from "./ExprInstruction";
import { isNull, isDef } from "../../common";
import { IMap } from "../../idl/IMap";
import { IdInstruction } from "./IdInstruction";

export class IdExprInstruction extends ExprInstruction implements IIdExprInstruction {
    protected _pType: IVariableTypeInstruction = null;

    private _bToFinalCode: boolean = true;
    private _isInPassUnifoms: boolean = false;
    
    constructor(pNode: IParseNode, eType: EInstructionTypes = EInstructionTypes.k_IdExprInstruction) {
        super(pNode, eType);
    }

    get visible(): boolean {
        return this.instructions[0].visible;
    }

    get type(): IVariableTypeInstruction {
        if (!isNull(this._pType)) {
            return this._pType;
        }
        else {
            var pVar: IdInstruction = <IdInstruction>this.instructions[0];
            this._pType = (<IVariableDeclInstruction>pVar.parent).type;
            return this._pType;
        }
    }

    set type(pType: IVariableTypeInstruction) {
        this._pType = pType;
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
            var pVarDecl: IVariableDeclInstruction = <IVariableDeclInstruction>this.instructions[0].parent;
            if (isNull(pVarDecl.parent)) {
                this._isInPassUnifoms = true;
            }
        }
    }


    toCode(): string {
        var sCode: string = "";
        if (this._bToFinalCode) {
            if ( this._isInPassUnifoms) {
                var pVarDecl: IVariableDeclInstruction = <IVariableDeclInstruction>this.instructions[0].parent;
                {
                    sCode += "uniforms[\"" + pVarDecl.nameIndex + "\"]";
                }
            }
            else {
                sCode += this.instructions[0].toCode();
            }
        }
        return sCode;
    }


    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        if (!this.type.isFromVariableDecl()) {
            return;
        }

        var pInfo: ITypeUseInfoContainer = null;
        pInfo = pUsedDataCollector[this.type.instructionID];

        if (!isDef(pInfo)) {
            pInfo = <ITypeUseInfoContainer>{
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

