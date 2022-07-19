import { parseUintLiteral } from "@lib/fx/analisys/Analyzer";
import { IntInstruction } from "@lib/fx/analisys/instructions/IntInstruction";
import { extendSLDocument } from "@lib/fx/SLDocument";
import { createTextDocument } from "@lib/fx/TextDocument";
import { IExprInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { INodeInputSlot, INodeOutputSlot, LiteGraph, LLink } from "litegraph.js";
import { LIB_SL_DOCUMENT } from "../common";
import { IGraphASTFinalNode, IGraphASTNode, LGraphNodeEx } from "../IGraph";
import { SpawnRoutineHLSL } from '../lib';

const desc = "SpawnRoutine";
const name = "SpawnRoutine";
const propName = 'count';

class Node extends LGraphNodeEx implements IGraphASTFinalNode {
    static desc = desc;

    constructor() {
        super(name);
        this.addInput(propName, "int");
        this.addProperty(propName, 1, "number");
        this.size = [180, 30];

        this.updateInputNames();
    }

    async run(document = LIB_SL_DOCUMENT): Promise<ISLDocument> {
        const inputNode = this.getInputNode(0);
        const inputInfo = this.getInputInfo(0);
        const link = this.graph.links[inputInfo.link];

        // analyse inside of virtual enviroment for subsequent mixing with the full context
        let textDocument = await createTextDocument("://SpawnRoutine.hlsl", SpawnRoutineHLSL);
        return extendSLDocument(textDocument, document, {
            '$input0': (context, program, sourceNode): IExprInstruction => {
                const scope = program.currentScope;
                if (!inputNode)
                {
                    const { base, signed, heximal, exp } = parseUintLiteral(this.properties[propName].toFixed(0));
                    return new IntInstruction({ scope, sourceNode, base, exp, signed, heximal });
                }
                return (inputNode as IGraphASTNode).run(context, program, link.origin_slot) as IExprInstruction;
            }
        });
    }

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

LiteGraph.registerNodeType(`fx/${desc}`, Node);
