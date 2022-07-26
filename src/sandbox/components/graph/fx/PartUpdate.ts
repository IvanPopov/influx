import { Context } from "@lib/fx/analisys/Analyzer";
import { ComplexTypeInstruction } from "@lib/fx/analisys/instructions/ComplexTypeInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { extendSLDocument } from "@lib/fx/SLDocument";
import { createTextDocument } from "@lib/fx/TextDocument";
import { IExprInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";


import { IGraphASTFinalNode, IGraphASTNode, LGraphNodeEx, LGraphNodeFactory } from "../GraphNode";
import { UpdateRoutineHLSL } from '../lib';
import { PART_TYPE } from "../common";

function producer(env: ISLDocument): LGraphNodeFactory
{
    const NullNode: any = {
        run: (context: Context, program: ProgramScope, slot: number): IExprInstruction => null
    };

    const type = env.root.scope.types[PART_TYPE] as ComplexTypeInstruction;
    const inputs = type.fields.map((decl: IVariableDeclInstruction) => ({ name: decl.name, type: decl.type.name }));
    const desc = "UpdateRoutine";
    const name = "UpdateRoutine";

    class Node extends LGraphNodeEx implements IGraphASTFinalNode {
        static desc = desc;
        constructor() {
            super(name);
            inputs.forEach(i => this.addInput(i.name, i.type));
            this.addInput('is alive', 'bool');
            this.size = [180, 25 * (inputs.length + 1)];
        }


        async run(env: ISLDocument): Promise<ISLDocument> {
            const textDocument = await createTextDocument("://UpdateRoutine.hlsl", UpdateRoutineHLSL);
            return extendSLDocument(textDocument, env, {
                '$input0': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(0) as IGraphASTNode || NullNode).run(context, program, this.link(0)) as IExprInstruction;
                },
                '$input1': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(1) as IGraphASTNode || NullNode).run(context, program, this.link(1)) as IExprInstruction;
                },
                '$input2': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(2) as IGraphASTNode || NullNode).run(context, program, this.link(2)) as IExprInstruction;
                },
                '$input3': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(3) as IGraphASTNode || NullNode).run(context, program, this.link(3)) as IExprInstruction;
                },
                // isAlive
                '$input4': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(4) as IGraphASTNode || NullNode).run(context, program, this.link(4)) as IExprInstruction;
                }
            });
        }
    }

    return { [`fx/${desc}`]: Node };
}


export default producer;

