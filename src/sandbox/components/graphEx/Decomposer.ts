import { Context } from "@lib/fx/analisys/Analyzer";
import { IdExprInstruction } from "@lib/fx/analisys/instructions/IdExprInstruction";
import { IdInstruction } from "@lib/fx/analisys/instructions/IdInstruction";
import { PostfixPointInstruction } from "@lib/fx/analisys/instructions/PostfixPointInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { extendSLDocument } from "@lib/fx/SLDocument";
import { createTextDocument } from "@lib/fx/TextDocument";
import { EInstructionTypes, IExprInstruction, ITypeInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { Diagnostics } from "@lib/util/Diagnostics";
import { INodeInputSlot, INodeOutputSlot, LiteGraph, LLink } from "litegraph.js";


import { PART_LOCAL_NAME, PART_TYPE } from "./common";
import { CodeEmitterNode, GraphContext, LGraphNodeFactory } from "./GraphNode";

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
    class Node extends CodeEmitterNode {
        static desc = 'Decomposer';

        constructor() 
        {
            super('Decomposer');
            this.addInput('in', null);
            this.size = [ 180, 25 ];
        }

        override exec(context: GraphContext, program: ProgramScope, slot: number): IExprInstruction
        {
            const name = this.getOutputInfo(slot).name;
            const element = this.getInputNode(0).exec(context, program, this.getOriginalSlot(0));  
            const scope = program.currentScope;
            const decl = element.type.getField(name);
            const id = new IdInstruction({ scope, name });
            const postfix = new IdExprInstruction({ scope, id, decl });
            return new PostfixPointInstruction({ scope, element, postfix });
        }

        onConnectInput(inputIndex: number, outputType: string | -1, outputSlot: INodeOutputSlot, outputNode: CodeEmitterNode, outputIndex: number): boolean 
        {
            const self = this;
            async function wrapper () {
                // part argument has been added in order to handle corner case related to 'fx' pipeline
                const source = `auto anonymous(${PART_TYPE} ${PART_LOCAL_NAME}, int partId) { return ($complexExpr); }`;
                const textDocument = await createTextDocument(`://decompose-node`, source);

                let type: ITypeInstruction = null;
                
                // quick analisys inside of virtual enviroment in order to compute on fly expression type
                let documentEx = await extendSLDocument(textDocument, env(), {
                    $complexExpr: (context, program, sourceNode): IExprInstruction => {
                        const gctx = asGraphContext(context);
                        outputNode.onBeforeExecution(gctx, program);
                        outputNode.compute(gctx, program);
                        const expr = outputNode.exec(context, program, outputIndex);
                        type = expr.type;
                        return expr;
                    }
                });

                if (documentEx.diagnosticReport.errors) {
                    console.error(Diagnostics.stringify(documentEx.diagnosticReport));
                    
                }
                if (type.isComplex()) {
                    type.fields.forEach(field => self.addOutput(field.name, field.type.name));
                    return true;
                }

                // IP: probably not really valid hack to handle variable decl type
                if (!type.isNotBaseArray() && 
                type.baseType.instructionType === EInstructionTypes.k_SystemType) {

                    type = type.baseType;
                }

                // corner case for system types    
                if (type.instructionType === EInstructionTypes.k_SystemType)
                {
                    const match = type.name.match(/(float|half|bool|uint|int)(2|3|4)/);
                    if (match)
                    {
                        [...'xyzw'].slice(0, Number(match[2])).forEach(name => self.addOutput(name, match[1]));
                        return true;
                    }            
                }

                console.error(`unsupported type for decomposition '${type.name}'`);
                self.dropInput();
                return false;
            }

            wrapper();
            return true;
        }

        dropInput()
        {
            this.disconnectInput(0);
        }

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
                this.dropOutputs();
            }
        }

        onBeforeConnectInput(inputIndex: number): number
        {
            this.dropOutputs();
            return inputIndex;
        }

        getTitle(): string {
            let outs = this.outputs.filter(out => out.links?.length);
            if (this.inputs.length && outs.length === 1)
            {
                return `*.${outs[0].name}`;
            }
            return super.getTitle();
        }

        getDocs(): string {
            return 'Auxiliary node to decompose complex ty to components.';
        }
    }

    return { [`helpers/decomposer`]: Node };
}

export default producer;
