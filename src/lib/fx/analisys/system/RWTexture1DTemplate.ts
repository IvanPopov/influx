import { IScope, ITypeInstruction, IVariableDeclInstruction, IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import { types, instruction } from "@lib/fx/analisys/helpers";
import { SystemTypeInstruction } from "@lib/fx/analisys/instructions/SystemTypeInstruction";
import TypeTemplate from "./TypeTemplate";
import { isBase } from "./utils";

class RWTexture1DTemplate extends TypeTemplate {
    constructor() {
        super(RWTexture1DTemplate.TYPE_NAME);
    }
    produceType(scope: IScope, args?: ITypeInstruction[]): ITypeInstruction {
        if (args.length > 1) {
            // TODO: print error
            return null;
        }

        const type = args.length > 0 ? args[0] : scope.findType('float4');

        if (!isBase(type)) {
            // TODO: print error
            return null;
        }

        const name = this.typeName(args);
        const size = -1;
        const elementType = type;
        const length = instruction.UNDEFINE_LENGTH;
        const fields: IVariableDeclInstruction[] = [];
        const methods: IFunctionDeclInstruction[] = [];
        return new SystemTypeInstruction({ scope, name, elementType, length, fields, size, methods });
    }

    static TYPE_NAME = 'RWTexture1D';
}


export default RWTexture1DTemplate;