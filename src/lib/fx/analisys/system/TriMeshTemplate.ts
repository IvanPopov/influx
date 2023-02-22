import { IScope, ITypeInstruction, IVariableDeclInstruction, IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import { instruction } from "@lib/fx/analisys/helpers";
import { FunctionDefInstruction } from "@lib/fx/analisys/instructions/FunctionDefInstruction";
import { IdInstruction } from "@lib/fx/analisys/instructions/IdInstruction";
import { IntInstruction } from "@lib/fx/analisys/instructions/IntInstruction";
import { SystemFunctionInstruction } from "@lib/fx/analisys/instructions/SystemFunctionInstruction";
import { SystemTypeInstruction } from "@lib/fx/analisys/instructions/SystemTypeInstruction";
import { EVariableUsageFlags, VariableDeclInstruction } from "@lib/fx/analisys/instructions/VariableDeclInstruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";
import { parseUintLiteral } from "@lib/fx/analisys/system/utils";
import TypeTemplate from "./TypeTemplate";

class TriMeshTemplate extends TypeTemplate {
    constructor() {
        super('TriMesh');
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
                let uint = scope.findType("uint");
                const type = new VariableTypeInstruction({ type: uint, scope, usages: ['out'] });
                const id = new IdInstruction({ scope, name: 'vertCount' });
                const usageFlags = EVariableUsageFlags.k_Argument | EVariableUsageFlags.k_Local;
                const param0 = new VariableDeclInstruction({ scope, type, id, usageFlags });
                paramList.push(param0);
            }

            {
                let uint = scope.findType("uint");
                const type = new VariableTypeInstruction({ type: uint, scope, usages: ['out'] });
                const id = new IdInstruction({ scope, name: 'faceCount' });
                const usageFlags = EVariableUsageFlags.k_Argument | EVariableUsageFlags.k_Local;
                const param1 = new VariableDeclInstruction({ scope, type, id, usageFlags });
                paramList.push(param1);
            }

            let returnType = new VariableTypeInstruction({ type: scope.findType("void"), scope });
            let id = new IdInstruction({ scope, name: 'GetDimensions' });
            let definition = new FunctionDefInstruction({ scope, returnType, id, paramList });
            let func = new SystemFunctionInstruction({ scope, definition, pixel: false, vertex: false });
            methods.push(func);
        }

        {
            const paramList = [];

            {
                let uint = scope.findType("uint");
                const type = new VariableTypeInstruction({ type: uint, scope });
                const id = new IdInstruction({ scope, name: 'vert' });
                const usageFlags = EVariableUsageFlags.k_Argument | EVariableUsageFlags.k_Local;
                const param1 = new VariableDeclInstruction({ scope, type, id, usageFlags });
                paramList.push(param1);
            }

            let returnType = new VariableTypeInstruction({ type: elementType, scope });
            let id = new IdInstruction({ scope, name: 'LoadVertex' });
            let definition = new FunctionDefInstruction({ scope, returnType, id, paramList });
            let func = new SystemFunctionInstruction({ scope, definition, pixel: false, vertex: false });
            methods.push(func);
        }

        {
            const paramList = [];

            {
                let uint = scope.findType("uint");
                const type = new VariableTypeInstruction({ type: uint, scope });
                const id = new IdInstruction({ scope, name: 'face' });
                const usageFlags = EVariableUsageFlags.k_Argument | EVariableUsageFlags.k_Local;
                const param1 = new VariableDeclInstruction({ scope, type, id, usageFlags });
                paramList.push(param1);
            }

            let returnType = new VariableTypeInstruction({ type: scope.findType("uint3"), scope });
            let id = new IdInstruction({ scope, name: 'LoadFace' });
            let definition = new FunctionDefInstruction({ scope, returnType, id, paramList });
            let func = new SystemFunctionInstruction({ scope, definition, pixel: false, vertex: false });
            methods.push(func);
        }

        {
            const paramList = [];

            {
                let uint = scope.findType("uint");
                const type = new VariableTypeInstruction({ type: uint, scope });
                const id = new IdInstruction({ scope, name: 'face' });
                const usageFlags = EVariableUsageFlags.k_Argument | EVariableUsageFlags.k_Local;
                const param1 = new VariableDeclInstruction({ scope, type, id, usageFlags });
                paramList.push(param1);
            }

            {
                const { base, signed, heximal, exp } = parseUintLiteral("6u");
                const arrayIndex = new IntInstruction({ scope, base, exp, signed, heximal });

                const uint = scope.findType("uint");
                const type = new VariableTypeInstruction({ type: uint, scope, arrayIndex, usages: ['out'] });
                const id = new IdInstruction({ scope, name: 'adjacency' });
                const usageFlags = EVariableUsageFlags.k_Argument | EVariableUsageFlags.k_Local;
                const param2 = new VariableDeclInstruction({ scope, type, id, usageFlags });
                paramList.push(param2);
            }


            let returnType = new VariableTypeInstruction({ type: scope.findType("void"), scope });
            let id = new IdInstruction({ scope, name: 'LoadGSAdjacency' });
            let definition = new FunctionDefInstruction({ scope, returnType, id, paramList });
            let func = new SystemFunctionInstruction({ scope, definition, pixel: false, vertex: false });
            methods.push(func);
        }


        {
            const paramList = [];

            {
                let uint = scope.findType("uint");
                const type = new VariableTypeInstruction({ type: uint, scope });
                const id = new IdInstruction({ scope, name: 'face' });
                const usageFlags = EVariableUsageFlags.k_Argument | EVariableUsageFlags.k_Local;
                const param1 = new VariableDeclInstruction({ scope, type, id, usageFlags });
                paramList.push(param1);
            }

            {
                const { base, signed, heximal, exp } = parseUintLiteral("3u");
                const arrayIndex = new IntInstruction({ scope, base, exp, signed, heximal });

                const uint = scope.findType("uint");
                const type = new VariableTypeInstruction({ type: uint, scope, arrayIndex, usages: ['out'] });
                const id = new IdInstruction({ scope, name: 'adjacency' });
                const usageFlags = EVariableUsageFlags.k_Argument | EVariableUsageFlags.k_Local;
                const param2 = new VariableDeclInstruction({ scope, type, id, usageFlags });
                paramList.push(param2);
            }


            let returnType = new VariableTypeInstruction({ type: scope.findType("void"), scope });
            let id = new IdInstruction({ scope, name: 'LoadFaceAdjacency' });
            let definition = new FunctionDefInstruction({ scope, returnType, id, paramList });
            let func = new SystemFunctionInstruction({ scope, definition, pixel: false, vertex: false });
            methods.push(func);
        }

        return new SystemTypeInstruction({ scope, name, elementType, length, fields, size, methods });
    }
}


export default TriMeshTemplate;

