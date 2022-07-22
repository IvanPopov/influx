import { ComplexTypeInstruction } from "@lib/fx/analisys/instructions/ComplexTypeInstruction";
import { extendSLDocument } from "@lib/fx/SLDocument";
import { createTextDocument } from "@lib/fx/TextDocument";
import { IExprInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { LiteGraph } from "litegraph.js";
import { LIB_SL_DOCUMENT, PART_STRUCTURE_SL_DOCUMENT, PART_TYPE } from "../common";
import { IGraphASTFinalNode, IGraphASTNode, LGraphNodeEx } from "../GraphNode";
import { InitRoutineHLSL } from '../lib';

const type = PART_STRUCTURE_SL_DOCUMENT.root.scope.types[PART_TYPE] as ComplexTypeInstruction;
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

    async run(document = LIB_SL_DOCUMENT): Promise<ISLDocument> {
        const textDocument = await createTextDocument("://InitRoutine.hlsl", InitRoutineHLSL);

        // are all inputs connceted?
        if (this.inputs.filter(i => i.link).length !== this.inputs.length)
        {
            this.emitError(`all initials must be presented`);
            return null;
        }

        return extendSLDocument(textDocument, document, {
            '$input0': (context, program, sourceNode): IExprInstruction => {
                return (this.getInputNode(0) as IGraphASTNode).run(context, program, this.link(0)) as IExprInstruction;
            },
            '$input1': (context, program, sourceNode): IExprInstruction => {
                return (this.getInputNode(1) as IGraphASTNode).run(context, program, this.link(1)) as IExprInstruction;
            },
            '$input2': (context, program, sourceNode): IExprInstruction => {
                return (this.getInputNode(2) as IGraphASTNode).run(context, program, this.link(2)) as IExprInstruction;
            },
            '$input3': (context, program, sourceNode): IExprInstruction => {
                return (this.getInputNode(3) as IGraphASTNode).run(context, program, this.link(3)) as IExprInstruction;
            }
        });
    }
}

LiteGraph.registerNodeType(`fx/${desc}`, Node);

