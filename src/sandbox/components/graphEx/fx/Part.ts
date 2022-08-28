import { isNull } from "@lib/common";
import { Context } from "@lib/fx/analisys/Analyzer";
import { AssignmentExprInstruction } from "@lib/fx/analisys/instructions/AssignmentExprInstruction";
import { ComplexTypeInstruction } from "@lib/fx/analisys/instructions/ComplexTypeInstruction";
import { ExprStmtInstruction } from "@lib/fx/analisys/instructions/ExprStmtInstruction";
import { IdExprInstruction } from "@lib/fx/analisys/instructions/IdExprInstruction";
import { IdInstruction } from "@lib/fx/analisys/instructions/IdInstruction";
import { PostfixPointInstruction } from "@lib/fx/analisys/instructions/PostfixPointInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IExprInstruction, IStmtInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { IParseNode } from "@lib/idl/parser/IParser";
import { EAnalyzerErrors as EErrors } from '@lib/idl/EAnalyzerErrors';
import { LiteGraph } from "litegraph.js";


import { PART_LOCAL_NAME, PART_TYPE } from "../common";
import { CodeEmitterNode, GraphContext, LGraphNodeFactory } from "../GraphNode";


function producer(env: () => ISLDocument): LGraphNodeFactory
{
    const nodes = <LGraphNodeFactory>{};

    const type = env().root.scope.types[PART_TYPE] as ComplexTypeInstruction;

    const name = `${PART_LOCAL_NAME}`;
    const desc = `${name} (previous value).`;

    function evaluatePartExpr(context: Context, program: ProgramScope): IExprInstruction {
        const sourceNode = null as IParseNode;
        const callee = null as IExprInstruction;
        const scope = program.currentScope;

        const decl = scope.findVariable(name);

        if (isNull(decl)) {
            //context.error(sourceNode, EErrors.UnknownVarName, { varName: name });
            // TODO: autogen graph error
            return null;
        }

        const id = new IdInstruction({ scope, sourceNode, name });
        return new IdExprInstruction({ scope, sourceNode, id, decl });
    }

    type.fields.forEach(field => {
        // todo: add suppor of complex types
        if (field.type.isComplex()) {
            return;
        }

        const name = `${PART_LOCAL_NAME}.${field.name}`;
        const desc = `${name} (previous value).`;

        const HIDDEN_CONNECTION = { visible: false };

        class Part extends CodeEmitterNode {
            static desc = desc;
            static color = 'transparent';
            static can_be_dropped = true;
            static collapsable = false;

            constructor() {
                super(name);
                this.addInput(name, field.type.name, { pos: [13, -13], label: "" });
                this.addInput("context", LiteGraph.ACTION, HIDDEN_CONNECTION);
                this.size = [100, 0];
            }

            onDrawTitleBox(ctx, titleHeight, size, scale) {
                // skip render of title pin
            }

            override compute(context: GraphContext, program: ProgramScope): IStmtInstruction[] {
                if (!this.isInputConnected(0)) return [];
                const deps = super.compute(context, program);
                
                const scope = program.currentScope;
                const right = this.getInputNode(0).exec(context, program, this.link(0));
                const element = evaluatePartExpr(context, program);
                const postfix = new IdExprInstruction({ 
                    scope,
                    id: new IdInstruction({ scope, name: field.name }), 
                    decl: element.type.getField(field.name) 
                });
                const left = new PostfixPointInstruction({ scope, element, postfix });
                const expr = new AssignmentExprInstruction({ scope, left, right, operator: '=' });

                
                if (!right.type.readable) {
                    context.error(right.sourceNode, EErrors.InvalidTypeForReading);
                }

                if (!left.type.writable) {
                    context.error(left.sourceNode, EErrors.InvalidTypeForWriting);
                }

                return [ ...deps, new ExprStmtInstruction({ scope, expr }) ];   
            }
        }

        nodes[`fx/out ${name}`] = Part;
    });


    class Part extends CodeEmitterNode {
        static desc = desc;

        constructor() {
            super(name);
            this.addInput(PART_LOCAL_NAME, PART_TYPE);
            this.addInput("context", LiteGraph.ACTION);
            this.size = [130, 50];
        }

        override compute(context: GraphContext, program: ProgramScope): IStmtInstruction[] {
            if (!this.isInputConnected(0)) return [];

            const deps = super.compute(context, program);
            const scope = program.currentScope;
            const right = this.getInputNode(0).exec(context, program, this.link(0));
            const left = new IdExprInstruction({ 
                scope, 
                id: new IdInstruction({ scope, name: 'part' }), 
                decl: scope.findVariable('part') 
            });
            const expr = new AssignmentExprInstruction({ scope, left, right, operator: '=' });
            return [ ...deps, new ExprStmtInstruction({ scope, expr }) ];   
        }
    }

    nodes[`fx/out ${name}`] = Part;
    return nodes;
}

export default producer;