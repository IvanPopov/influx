import { StmtInstruction } from "./StmtInstruction";
import { EInstructionTypes, IStmtBlockInstruction, IStmtInstruction, IExprInstruction } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";
import { IInstructionSettings, Instruction } from "./Instruction";


export interface IStmtBlockInstructionSettings extends IInstructionSettings {
    stmtList: IStmtInstruction[];
}


/**
 * Represent {stmts}
 * EMPTY_OPERATOR StmtInstruction ... StmtInstruction
 */
export class StmtBlockInstruction extends StmtInstruction implements IStmtBlockInstruction {
    protected _stmtList: IStmtInstruction[];

    
    constructor({ stmtList, ...settings }: IStmtBlockInstructionSettings) {
        super({ instrType: EInstructionTypes.k_StmtBlock, ...settings });
        this._stmtList = stmtList.map(stmt => Instruction.$withParent(stmt, this));
    }


    get stmtList(): IStmtInstruction[] {
        return this._stmtList;
    }


    toCode(): string {
        var code: string = "{" + "\n";

        for (var i: number = 0; i < this.stmtList.length; i++) {
            code += "\t" + this.stmtList[i].toCode() + "\n";
        }

        code += "}";

        return code;
    }
}
