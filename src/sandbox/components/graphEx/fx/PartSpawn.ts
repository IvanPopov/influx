import { isNumber } from "@lib/common";
import { Context } from "@lib/fx/analisys/Analyzer";
import { extendSLDocument } from "@lib/fx/SLDocument";
import { createTextDocument } from "@lib/fx/TextDocument";
import { IExprInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { INodeInputSlot, INodeOutputSlot, LLink } from "litegraph.js";
import { CodeEmitterNode, GraphContext, LGraphNodeFactory } from "../GraphNode";

interface Plugs
{
    count?: number;
}

function spawnCode(env: ISLDocument, plugs: Plugs = {})
{
    return(`int SpawnRoutine() { return ${ isNumber(plugs.count) ? String(plugs.count) : '$count' }; }`);
}

/** @deprecated */
function asGraphContext(ctx: Context): GraphContext
{
    // temp hack for compartibility
    let varNum = 0;
    (<any>ctx).addLocal = () => `t${varNum++}`;
    return ctx as GraphContext;
}


function producer(env: () => ISLDocument): LGraphNodeFactory
{
    const desc = "SpawnRoutine";
    const name = "SpawnRoutine";
    const propName = 'count';

    class Node extends CodeEmitterNode {
        static desc = desc;

        constructor() {
            super(name);
            this.addInput(propName, "int");
            this.addProperty(propName, 1, "number");
            this.size = [180, 30];

            this.updateInputNames();
        }

        async run(env: ISLDocument): Promise<ISLDocument> {
            // hack to be compartible, this function must be rewritten same way as PartUpdate.
            this.onBeforeExecution(null, null);
            
            const inputNode = this.getInputNode(0);
            const plugs: Plugs = {};

            if (!inputNode) {
                plugs.count = +this.properties[propName].toFixed(0);
            }

            const textDocument = await createTextDocument("://SpawnRoutine.hlsl", spawnCode(env, plugs));
            return extendSLDocument(textDocument, env, {
                '$count': (context, program, sourceNode): IExprInstruction => {
                    inputNode.compute(asGraphContext(context), program);
                    return inputNode.exec(context, program, this.link(0)) as IExprInstruction;
                }
            });
        }

        getTitle(): string { return 'Spawn routine'; }
        getDocs(): string { return 'Determines number of particles spawnd per second.'; }

        updateInputNames()
        {
            const input = this.inputs[0];
            input.name = !input.link ? `${propName} = ${ this.properties[propName] }` : propName;
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