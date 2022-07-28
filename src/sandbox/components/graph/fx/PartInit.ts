import { ComplexTypeInstruction } from "@lib/fx/analisys/instructions/ComplexTypeInstruction";
import { extendSLDocument } from "@lib/fx/SLDocument";
import { createTextDocument } from "@lib/fx/TextDocument";
import { IExprInstruction, IVariableDeclInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { LLink, INodeInputSlot, INodeOutputSlot } from "litegraph.js";


import { PART_TYPE } from "../common";
import { IGraphASTFinalNode, IGraphASTNode, LGraphNodeEx, LGraphNodeFactory } from "../GraphNode";

interface Plugs
{
    [i :string]: boolean;
}

function plugByType(type: IVariableTypeInstruction): string {
    switch (type.name)
    {
        case 'float': return '0.f';
        case 'float2': return 'float2(0.f, 0.f)';
        case 'float3': return 'float3(0.f, 0.f, 0.f)';
        case 'float4': return 'float4(0.f, 0.f, 0.f, 0.f)';
        case 'bool': return 'false';
        case 'int': return '0';
        case 'uint': return '0u';
    }
    return '0';
}

function initCode(env: ISLDocument, plugs: Plugs = {}) {
    const type = env.root.scope.findType(PART_TYPE);
    return (
        `
void InitRoutine(out Part part, int partId)
{
    ${type.fields.map(({ name, type }, i) => `part.${name} = ${ plugs[name] ? plugByType(type): `$${name}` };`).join("\n")}
}
`);
}

function producer(env: () => ISLDocument): LGraphNodeFactory {
    const type = env().root.scope.types[PART_TYPE] as ComplexTypeInstruction;
    const inputs = type.fields.map((decl: IVariableDeclInstruction) => ({ name: decl.name, type: decl.type.name }));

    const desc = "InitRoutine";
    const name = "InitRoutine";

    class Node extends LGraphNodeEx implements IGraphASTFinalNode {
        static desc = desc;
        constructor() {
            super(name);
            inputs.forEach(i => this.addInput(i.name, i.type));
            this.size = [180, 25 * inputs.length];
        }

        doesInputExistAndDisconnected(name: string) {
            const i = type.fieldNames.indexOf(name);
            return i != -1 && !this.getInputNode(i);
        }

        checkPlugs(): Plugs
        {
            const plugs: Plugs = {};
            inputs.forEach(i => plugs[i.name] = this.doesInputExistAndDisconnected(i.name));
            return plugs;
        }

        async run(document): Promise<ISLDocument> {
            const plugs = this.checkPlugs();
            const textDocument = await createTextDocument("://InitRoutine.hlsl", initCode(env(), plugs));
            const node = this;
            const exprHandler = new Proxy({}, {
                get: (target, propertyName) => {
                    // IP: a bit ugly way to skip all execept $name properties.
                    if (propertyName[0] !== '$') return null;
                    return (context, program, sourceNode): IExprInstruction => {
                        // $name => name
                        const fieldName = String(propertyName).substring(1);
                        const field = type.getField(fieldName);

                        const i = type.fieldNames.indexOf(fieldName);
                        const input = node.getInputNode(i) as IGraphASTNode;
                        
                        if (input)
                            return input.run(context, program, node.link(i)) as IExprInstruction;
                        return null;
                    }
                }
            });

            return extendSLDocument(textDocument, document, exprHandler);
        }

        getTitle(): string { return 'Init routine'; }
        getDocs(): string { return 'Determines initial state of each particle.'; }

        renameInput(name: string, auto: boolean)
        {
            let i = type.fieldNames.indexOf(name);
            this.inputs[i].name = auto ? `${name} = ${0}` : name; // plugByType(type.fields[i].type)
        }

        updateInputNames()
        {
            const plugs = this.checkPlugs();
            for (let name in plugs)
            {
                this.renameInput(name, plugs[name]);
            }
        }

        onConnectionsChange(type: number, slotIndex: number, isConnected: boolean, link: LLink, ioSlot: INodeInputSlot | INodeOutputSlot): void {
            super.onConnectionsChange(type, slotIndex, isConnected, link, ioSlot);
            this.updateInputNames();
        }

        onPropertyChanged(name: string, value: number, prevValue: number): boolean {
            super.onPropertyChanged(name, value, prevValue);
            this.updateInputNames();
            return true;
        }
    }

    return { [`fx/${desc}`]: Node };
}

export default producer;
