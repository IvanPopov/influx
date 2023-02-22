import { EInstructionTypes, IExprInstruction, IStateBlockInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";

import { ExprInstruction, IExprInstructionSettings } from "./ExprInstruction";
import { Instruction } from "./Instruction";

/**
 * Represents this kind of initialization:
 *   DepthStencilState depthState { DepthEnable = TRUE; };
 *                                ^^^^^^^^^^^^^^^^^^^^^^^
 */

export interface IInitExprInstructionSettings extends IExprInstructionSettings {
    props: Object;
}

export class StateBlockInstruction extends ExprInstruction implements IStateBlockInstruction {
    readonly props: Object;

    constructor({ type, props = {}, ...settings }: IInitExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_StateBlockExpr, type, ...settings });
        this.props = props;
    }

    toCode(): string {
        console.error(`not implemeted`);
        return null;
    }

    isConst(): boolean {
        return true;
    }
}
