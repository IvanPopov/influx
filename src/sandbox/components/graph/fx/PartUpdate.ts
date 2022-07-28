import { Context } from "@lib/fx/analisys/Analyzer";
import { ComplexTypeInstruction } from "@lib/fx/analisys/instructions/ComplexTypeInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { extendSLDocument } from "@lib/fx/SLDocument";
import { createTextDocument } from "@lib/fx/TextDocument";
import { IExprInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";


import { IGraphASTFinalNode, IGraphASTNode, LGraphNodeEx, LGraphNodeFactory } from "../GraphNode";
import { PART_TYPE } from "../common";
import { INodeInputSlot, INodeOutputSlot, LLink } from "litegraph.js";

interface Plugs {
    timelife?: boolean;
    pos?: boolean;
    alive?: boolean;
    size?: boolean;
}

function updateCode(env: ISLDocument, plugs: Plugs = {})
{
    const type = env.root.scope.findType(PART_TYPE);
    return (
`
bool UpdateRoutine(inout Part part)
{
    ${ plugs.timelife ? `part.timelife = part.timelife + elapsedTime;`: `` }
    ${ plugs.pos ? `part.pos = part.pos + float3(0.f, 1.f, 0.f) * elapsedTime;`: `` }
    ${ plugs.size ? `part.size = 0.1;`: `` }
    ${type.fields.map((field, i) => `part.${field.name} = $${field.name};`).join("\n")}
    return ${ !plugs.alive ? `$alive` : plugs.timelife ? 'part.timelife < 1.f' : 'true' };
}
`);
}

function producer(env: () => ISLDocument): LGraphNodeFactory
{
    const NullNode: any = {
        run: (context: Context, program: ProgramScope, slot: number): IExprInstruction => null
    };

    const type = env().root.scope.types[PART_TYPE] as ComplexTypeInstruction;
    const inputs = type.fields.map((decl: IVariableDeclInstruction) => ({ name: decl.name, type: decl.type.name }));
    const desc = "UpdateRoutine";
    const name = "UpdateRoutine";


    class Node extends LGraphNodeEx implements IGraphASTFinalNode {
        static desc = desc;
        constructor() {
            super(name);
            inputs.forEach(i => this.addInput(i.name, i.type));
            this.addInput('alive', 'bool');
            this.size = [180, 25 * (inputs.length + 1)];
            this.updateInputNames();
        }


        doesInputExistAndDisconnected(name: string) {
            const i = type.fieldNames.indexOf(name);
            return i != -1 && !this.getInputNode(i);
        }

        checkPlugs(): Plugs
        {
            const plugs: Plugs = {};
            plugs.timelife = this.doesInputExistAndDisconnected('timelife');
            plugs.pos = this.doesInputExistAndDisconnected('pos');
            plugs.size = this.doesInputExistAndDisconnected('size');
            plugs.alive = !this.getInputNode(type.fieldNames.length);
            return plugs;
        }

        async run(env: ISLDocument): Promise<ISLDocument> {
            const plugs = this.checkPlugs();
            const textDocument = await createTextDocument("://UpdateRoutine.hlsl", updateCode(env, plugs));
            const node = this;
            const exprHandler = new Proxy({}, {
                get: (target, propertyName) => {
                    // IP: a bit ugly way to skip all execept $name properties.
                    if (propertyName[0] !== '$') return null;
                    return (context, program, sourceNode): IExprInstruction => {
                        if (propertyName == '$alive') {
                            const i = type.fieldNames.length;
                            const input = node.getInputNode(i) as IGraphASTNode;
                            return input.run(context, program, node.link(i)) as IExprInstruction;
                        }

                        // $name => name
                        const fieldName = String(propertyName).substring(1);
                        const i = type.fieldNames.indexOf(fieldName);
                        const input = node.getInputNode(i) as IGraphASTNode;
                        
                        if (input)
                            return input.run(context, program, node.link(i)) as IExprInstruction;

                        return null;
                    }
                }
            });
            return extendSLDocument(textDocument, env, exprHandler);
        }

        getTitle(): string { return 'Update routine'; }
        getDocs(): string { return 'Determines state of particle after each update.'; }

        // must be aligned with updateCode() logic.
        renameInput(name: string, auto: boolean)
        {
            let i = name == 'alive' ? type.fieldNames.length : type.fieldNames.indexOf(name);
            if (i != -1)
                switch (name)
                {
                    case 'timelife':
                        this.inputs[i].name = auto ? `${name} += dt` : name;
                        return;
                    case 'alive':
                        this.inputs[i].name = auto ? `${name} = timelife < 1` : name;
                        return;
                    case 'pos':
                        this.inputs[i].name = auto ? `${name} += dt * up` : name;
                        return;
                    case 'size':
                        this.inputs[i].name = auto ? `${name} = 0.1` : name;
                        return;
                    default:
                        this.inputs[i].name = auto ? `${name} (unset)` : name;
                }
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

