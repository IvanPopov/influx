import { Context } from "@lib/fx/analisys/Analyzer";
import { IdExprInstruction } from "@lib/fx/analisys/instructions/IdExprInstruction";
import { IdInstruction } from "@lib/fx/analisys/instructions/IdInstruction";
import { PostfixPointInstruction } from "@lib/fx/analisys/instructions/PostfixPointInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { extendSLDocument } from "@lib/fx/SLDocument";
import { createTextDocument } from "@lib/fx/TextDocument";
import { EInstructionTypes, IExprInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";
import { IParseNode } from "@lib/idl/parser/IParser";
import { Diagnostics } from "@lib/util/Diagnostics";
import { INodeInputSlot, INodeOutputSlot, LiteGraph, LLink } from "litegraph.js";
import { PART_LOCAL_NAME, PART_STRUCTURE_SL_DOCUMENT, PART_TYPE } from "./common";
import { IGraphASTNode, LGraphNodeAST } from "./IGraph";


class Node extends LGraphNodeAST {
    static desc = 'Decomposer';

    // expr: string = null;

    constructor() 
    {
        super('Decomposer');
        this.addInput('in', null);
        this.size = [ 180, 25 ];
    }

    evaluate(context: Context, program: ProgramScope, slot: number): IExprInstruction
    {
        const name = this.getOutputInfo(slot).name;
        const element = (this.getInputNode(0) as IGraphASTNode).run(context, program, this.link(0)) as IExprInstruction;

        const sourceNode = null as IParseNode;    
        const scope = program.currentScope;
        
        const decl = element.type.getField(name);
        const id = new IdInstruction({ scope, sourceNode, name });
        const postfix = new IdExprInstruction({ scope, sourceNode, id, decl });

        return new PostfixPointInstruction({ sourceNode, scope, element, postfix });
    }

    onConnectInput(inputIndex: number, outputType: string | -1, outputSlot: INodeOutputSlot, outputNode: IGraphASTNode, outputIndex: number): boolean 
    {
        const self = this;
        async function wrapper () {
            // part argument has been added in order to handle corner case related to 'fx' pipeline
            const source = `auto anonymous(${PART_TYPE} ${PART_LOCAL_NAME}) { return ($complexExpr); }`;
            const textDocument = await createTextDocument(`://decompose-node`, source);

            let type: IVariableTypeInstruction = null;
            
            // quick analisys inside of virtual enviroment in order to compute on fly expression type
            let documentEx = await extendSLDocument(textDocument, PART_STRUCTURE_SL_DOCUMENT, {
                $complexExpr: (context, program, sourceNode): IExprInstruction => {
                    const expr = (outputNode as LGraphNodeAST).evaluate(context, program, outputIndex) as IExprInstruction;
                    console.log(`(${expr.toCode()})`);
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

LiteGraph.registerNodeType(`helpers/decomposer`, Node);