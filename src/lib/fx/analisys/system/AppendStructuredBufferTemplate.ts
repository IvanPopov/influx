import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";
import { IFunctionDeclInstruction, IScope, ITypeInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { instruction } from "@lib/fx/analisys/helpers";
import TypeTemplate from "./TypeTemplate";
import { IdInstruction } from "@lib/fx/analisys/instructions/IdInstruction";
import { EVariableUsageFlags, VariableDeclInstruction } from "@lib/fx/analisys/instructions/VariableDeclInstruction";
import { SystemFunctionInstruction } from "@lib/fx/analisys/instructions/SystemFunctionInstruction";
import { FunctionDefInstruction } from "@lib/fx/analisys/instructions/FunctionDefInstruction";
import { SystemTypeInstruction } from "@lib/fx/analisys/instructions/SystemTypeInstruction";

class AppendStructuredBufferTemplate extends TypeTemplate {
    constructor() {
        super('AppendStructuredBuffer');
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
            const paramList = [];

            {
                const type = new VariableTypeInstruction({ type: args[0], scope });
                const id = new IdInstruction({ scope, name: 'Append' });
                const usageFlags = EVariableUsageFlags.k_Argument | EVariableUsageFlags.k_Local;
                const param0 = new VariableDeclInstruction({ scope, type, id, usageFlags });
                paramList.push(param0);
            }

            const returnType = new VariableTypeInstruction({ type: scope.findType("void"), scope });
            const id = new IdInstruction({ scope, name: 'Append' });
            const definition = new FunctionDefInstruction({ scope, returnType, id, paramList });
            const func = new SystemFunctionInstruction({ scope, definition, pixel: false, vertex: false });
            methods.push(func);
        }

        return new SystemTypeInstruction({ scope, name, elementType, length, fields, size, methods });
    }
}


export default AppendStructuredBufferTemplate;
