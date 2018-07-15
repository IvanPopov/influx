import { IIdExprInstruction, IVariableTypeInstruction, EInstructionTypes, IVariableDeclInstruction, EFunctionType, IInstruction, EVarUsedMode, ITypeUseInfoContainer } from "../../idl/IInstruction";
import { IFunctionDeclInstruction } from "../../idl/IInstruction";
import { IInstructionSettings } from "./Instruction";
import { VariableTypeInstruction } from "./VariableTypeInstruction";
import { IDeclInstruction } from "../../idl/IInstruction";
import { IIdInstruction } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";
import { ExprInstruction } from "./ExprInstruction";
import { isNull, isDef } from "../../common";
import { IMap } from "../../idl/IMap";
import { IdInstruction } from "./IdInstruction";


export interface IIdExprInstructionSettings extends IInstructionSettings {
    id: IIdInstruction;
    decl: IVariableDeclInstruction;
}


export class IdExprInstruction extends ExprInstruction implements IIdExprInstruction {
    protected _id: IIdInstruction;
    // helpers
    protected _decl: IVariableDeclInstruction; // << move to resolveDecl() method.

    constructor({ id, decl, ...settings }: IIdExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_IdExprInstruction, type: decl.type, ...settings });

        this._id = id.$withNoParent();
        this._decl = decl;
    }

    
    get declaration(): IDeclInstruction {
        return this._decl;
    }

    
    isConst(): boolean {
        return this.type.isConst();
    }

    
    evaluate(): boolean {
        return false;
    }

    toCode(): string {
        var scode: string = "";
        if (this.visible) {
            {
                scode += this._decl.id.toCode();
            }
        }
        return scode;
    }


    addUsedData(usedDataCollector: IMap<ITypeUseInfoContainer>,
        usedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        if (!VariableTypeInstruction.isInheritedFromVariableDecl(this.type)) {
            return;
        }

        var info: ITypeUseInfoContainer = null;
        info = usedDataCollector[this.type.instructionID];

        if (!isDef(info)) {
            info = <ITypeUseInfoContainer>{
                type: this.type,
                isRead: false,
                isWrite: false,
                numRead: 0,
                numWrite: 0,
                numUsed: 0
            }

            usedDataCollector[this.type.instructionID] = info;
        }

        if (usedMode !== EVarUsedMode.k_Write && usedMode !== EVarUsedMode.k_Undefined) {
            info.isRead = true;
            info.numRead++;
        }

        if (usedMode === EVarUsedMode.k_Write || usedMode === EVarUsedMode.k_ReadWrite) {
            info.isWrite = true;
            info.numWrite++;
        }

        info.numUsed++;
    }
}

