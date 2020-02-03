import { isNull } from "@lib/common";
import { ECheckStage, EInstructionTypes, IInstruction, IInstructionError, IScope } from "@lib/idl/IInstruction";
import { IParseNode } from "@lib/idl/parser/IParser";

export interface IInstructionSettings {
    scope: IScope;

    sourceNode?: IParseNode;
    visible?: boolean;

    instrType?: EInstructionTypes;
}

export class Instruction implements IInstruction {
    private _sourceNode: IParseNode;
    private _instructionID: number;
    private _instructionType: EInstructionTypes;
    private _scope: IScope;
    private _parent: IInstruction;
    private _lastError: IInstructionError;

    private static INSTRUCTION_COUNTER: number = 0;

    constructor({
        scope,
        instrType/* = EInstructionTypes.k_Instruction*/,
        sourceNode = null,
        visible = true
    }: IInstructionSettings) {

        this._sourceNode = sourceNode;
        this._instructionType = instrType;
        this._instructionID = (Instruction.INSTRUCTION_COUNTER++);
        this._scope = scope;
        this._parent = null;
        this._lastError = null;
    }


    get parent(): IInstruction {
        // console.assert(this._parent, "Parent is not defined!");
        return this._parent;
    }


    get instructionType(): EInstructionTypes {
        console.assert(this._instructionType != EInstructionTypes.k_Instruction, "Instruction type 'k_Instruction' is forbidden.");
        return this._instructionType;
    }

    get instructionName(): string {
        return EInstructionTypes[this.instructionType];
    }


    get instructionID(): number {
        return this._instructionID;
    }


    get scope(): IScope {
        if (!isNull(this._scope)) {
            return this._scope;
        }

        if (!isNull(this.parent)) {
            return this.parent.scope;
        }
        return null;
    }


    get sourceNode(): IParseNode {
        return this._sourceNode;
    }


    toString(): string {
        console.error("@pure_virtual");
        return null;
    }


    toCode(): string {
        console.error("@pure_virtual");
        return null;
    }


    $withParent<T extends IInstruction>(parent: IInstruction | null): T {
        console.assert(this._parent == null, "parent redefenition detected!");
        if (this.instructionType === EInstructionTypes.k_SystemType && (this as any).name === 'float' && this._parent == null && parent != null) {
            debugger;
        }
        this._parent = parent;
        // todo: remove this hack!
        return <any>this;
    }


    // An auxiliary function created to maintain the clarity of the code.
    $withNoParent<T extends IInstruction>(): T {
        return <any>this;
    }


    static $withParent<T extends IInstruction>(child: T, parent: IInstruction): T | null {
        if (isNull(child)) {
            return null;
        }
        return child.$withParent(parent);
    }

    static $withNoParent<T extends IInstruction>(child: T): T | null {
        if (isNull(child)) {
            return null;
        }
        return child.$withNoParent();
    }
}







