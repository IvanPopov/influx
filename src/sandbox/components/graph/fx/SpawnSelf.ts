import { Context } from "@lib/fx/analisys/Analyzer";
import { ComplexTypeInstruction } from "@lib/fx/analisys/instructions/ComplexTypeInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IExprInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { INodeInputSlot, INodeOutputSlot, LiteGraph, LLink } from "litegraph.js";
import { PART_TYPE } from "../common";
import { IGraphASTNode, LGraphNodeAST, LGraphNodeFactory } from "../GraphNode";


function producer(env: () => ISLDocument): LGraphNodeFactory
{
    const desc = "SpawnSelf";
    const name = "SpawnSelf";

    const type = env().root.scope.types[PART_TYPE] as ComplexTypeInstruction;
    const inputs = type.fields.map(({ name, type }) => ({ name, type: type.name }));

    class Node extends LGraphNodeAST {
        static desc = desc;

        constructor() {
            super(name);
            inputs.forEach(i => this.addInput(i.name, i.type));
            this.size = [180, 25 * inputs.length + 10];
            this.addOutput("", LiteGraph.EVENT, { shape: LiteGraph.SQUARE_SHAPE });

            // this.updateInputNames();
        }

        evaluate(context: Context, program: ProgramScope, slot: number): IExprInstruction {
            // const inputNode = this.getInputNode(0);
            // const inputInfo = this.getInputInfo(0);
            // const link = this.graph.links[inputInfo.link];


            return null;
        }

        onConnectInput(inputIndex: number, outputType: string | -1, outputSlot: INodeOutputSlot, outputNode: IGraphASTNode, outputIndex: number): boolean 
        {
            return true;
        }

        // dropInput()
        // {
        //     this.disconnectInput(0);
        // }

        dropOutputs()
        {
            while (this.outputs.length)
            {
                this.disconnectOutput(0);
                this.removeOutput(0);
            } 
        }

        onConnectionsChange( 
            type: number,
            slotIndex: number,
            isConnected: boolean,
            link: LLink,
            ioSlot: (INodeOutputSlot | INodeInputSlot))
        {
            if (type == LiteGraph.INPUT && !isConnected)
            {
                // this.dropOutputs();
            }
        }

        onBeforeConnectInput(inputIndex: number): number
        {
            // this.dropOutputs();
            return inputIndex;
        }

        getTitle(): string { return 'Spawn self'; }
        getDocs(): string { return 'Spawn this emitter.'; }
    }

    return { [`fx/actions/${desc}`]: Node };
}

export default producer;