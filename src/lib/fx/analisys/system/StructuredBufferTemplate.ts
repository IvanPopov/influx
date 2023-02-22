import { IScope, ITypeInstruction, IVariableDeclInstruction, IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import { instruction } from "@lib/fx/analisys/helpers";
import { SystemTypeInstruction } from "@lib/fx/analisys/instructions/SystemTypeInstruction";
import TypeTemplate from "./TypeTemplate";

class StructuredBufferTemplate extends TypeTemplate {
    constructor() {
        super('StructuredBuffer');
    }
    produceType(scope: IScope, args?: ITypeInstruction[]): ITypeInstruction {
        if (args.length !== 1) {
            // TODO: print error
            return null;
        }

        const name = this.typeName(args);
        const size = -1;
        const elementType = args[0];
        const length = instruction.UNDEFINE_LENGTH;
        const fields: IVariableDeclInstruction[] = [];
        const methods: IFunctionDeclInstruction[] = [];

        return new SystemTypeInstruction({ scope, name, elementType, length, fields, size, methods });
    }
}

export default StructuredBufferTemplate;
