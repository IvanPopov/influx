import { EInstructionTypes, IExprInstruction, IStateBlockInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";

import { ExprInstruction, IExprInstructionSettings } from "./ExprInstruction";
import { Instruction } from "./Instruction";

/**
 * Represents this kind of initialization:
 *   DepthStencilState depthState { DepthEnable = TRUE; };
 *                                ^^^^^^^^^^^^^^^^^^^^^^^
 */

export interface IInitExprInstructionSettings extends IExprInstructionSettings {
    props?: Object;
    blocks?: IStateBlockInstruction[];
}

export class StateBlockInstruction extends ExprInstruction implements IStateBlockInstruction {
    readonly props: Object;
    readonly blocks: IStateBlockInstruction[];

    constructor({ type, blocks = null, props = null, ...settings }: IInitExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_StateBlockExpr, type, ...settings });
        this.props = props;
        this.blocks = blocks;
    }

    toCode(): string {
        console.error(`not implemeted`);
        return null;
    }

    isConst(): boolean {
        return true;
    }
}
