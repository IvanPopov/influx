import { instruction } from "@lib/fx/analisys/helpers";
import { FunctionDefInstruction } from "@lib/fx/analisys/instructions/FunctionDefInstruction";
import { IdInstruction } from "@lib/fx/analisys/instructions/IdInstruction";
import { SystemFunctionInstruction } from "@lib/fx/analisys/instructions/SystemFunctionInstruction";
import { SystemTypeInstruction } from "@lib/fx/analisys/instructions/SystemTypeInstruction";
import { EVariableUsageFlags, VariableDeclInstruction } from "@lib/fx/analisys/instructions/VariableDeclInstruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";
import { IFunctionDeclInstruction, IScope, ITypeInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import TypeTemplate from "./TypeTemplate";
import { isBase } from "./utils";

class Texture2DArrayTemplate extends TypeTemplate {
    constructor() {
        super(Texture2DArrayTemplate.TYPE_NAME);
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

        {
            const paramList = [];

            {
                let samplerState = scope.findType("SamplerState");
                const type = new VariableTypeInstruction({ type: samplerState, scope });
                const id = new IdInstruction({ scope, name: 'samplerState' });
                const usageFlags = EVariableUsageFlags.k_Argument | EVariableUsageFlags.k_Local;
                const param0 = new VariableDeclInstruction({ scope, type, id, usageFlags });
                paramList.push(param0);
            }

            {
                let f3 = scope.findType("float3");
                const type = new VariableTypeInstruction({ type: f3, scope });
                const id = new IdInstruction({ scope, name: 'uv' });
                const usageFlags = EVariableUsageFlags.k_Argument | EVariableUsageFlags.k_Local;
                const param0 = new VariableDeclInstruction({ scope, type, id, usageFlags });
                paramList.push(param0);
            }

            {
                let f2 = scope.findType("float2");
                const type = new VariableTypeInstruction({ type: f2, scope });
                const id = new IdInstruction({ scope, name: 'dx' });
                const usageFlags = EVariableUsageFlags.k_Argument | EVariableUsageFlags.k_Local;
                const param0 = new VariableDeclInstruction({ scope, type, id, usageFlags });
                paramList.push(param0);
            }

            {
                let f2 = scope.findType("float2");
                const type = new VariableTypeInstruction({ type: f2, scope });
                const id = new IdInstruction({ scope, name: 'dy' });
                const usageFlags = EVariableUsageFlags.k_Argument | EVariableUsageFlags.k_Local;
                const param0 = new VariableDeclInstruction({ scope, type, id, usageFlags });
                paramList.push(param0);
            }

            let returnType = new VariableTypeInstruction({ type, scope });
            let id = new IdInstruction({ scope, name: 'SampleGrad' });
            let def = new FunctionDefInstruction({ scope, returnType, id, paramList });
            let func = new SystemFunctionInstruction({ scope, def, pixel: true, vertex: true });
            methods.push(func);
        }

        return new SystemTypeInstruction({ scope, name, elementType, length, fields, size, methods });
    }

    static TYPE_NAME = 'Texture2DArray';
}

export default Texture2DArrayTemplate;

