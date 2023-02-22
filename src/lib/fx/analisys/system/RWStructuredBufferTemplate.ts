import { IScope, ITypeInstruction, IVariableDeclInstruction, IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import { instruction } from "@lib/fx/analisys/helpers";
import { FunctionDefInstruction } from "@lib/fx/analisys/instructions/FunctionDefInstruction";
import { IdInstruction } from "@lib/fx/analisys/instructions/IdInstruction";
import { SystemFunctionInstruction } from "@lib/fx/analisys/instructions/SystemFunctionInstruction";
import { SystemTypeInstruction } from "@lib/fx/analisys/instructions/SystemTypeInstruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";
import TypeTemplate from "./TypeTemplate";

class RWStructuredBufferTemplate extends TypeTemplate {
    constructor() {
        super('RWStructuredBuffer');
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

        {
            let returnType = new VariableTypeInstruction({ type: scope.findType("uint"), scope });
            let id = new IdInstruction({ scope, name: 'IncrementCounter' });
            let definition = new FunctionDefInstruction({ scope, returnType, id });
            let func = new SystemFunctionInstruction({ scope, definition, pixel: false, vertex: false });
            methods.push(func);
        }

        {
            let returnType = new VariableTypeInstruction({ type: scope.findType("uint"), scope });
            let id = new IdInstruction({ scope, name: 'DecrementCounter' });
            let definition = new FunctionDefInstruction({ scope, returnType, id });
            let func = new SystemFunctionInstruction({ scope, definition, pixel: false, vertex: false });
            methods.push(func);
        }


        return new SystemTypeInstruction({ scope, name, elementType, length, fields, size, methods });
    }
}


export default RWStructuredBufferTemplate;

