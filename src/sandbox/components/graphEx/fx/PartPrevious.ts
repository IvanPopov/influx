import { isNull } from "@lib/common";
import { Analyzer, Context } from "@lib/fx/analisys/Analyzer";
import { ComplexTypeInstruction } from "@lib/fx/analisys/instructions/ComplexTypeInstruction";
import { IdExprInstruction } from "@lib/fx/analisys/instructions/IdExprInstruction";
import { IdInstruction } from "@lib/fx/analisys/instructions/IdInstruction";
import { PostfixPointInstruction } from "@lib/fx/analisys/instructions/PostfixPointInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IExprInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { IParseNode } from "@lib/idl/parser/IParser";


import { PART_LOCAL_NAME, PART_TYPE } from "../common";
import { CodeEmitterNode, LGraphNodeFactory } from "../GraphNode";


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

        class PartPrevous extends CodeEmitterNode {
            static desc = desc;
            constructor() {
                super(name);
                this.addOutput(name, field.type.name);
                this.size = [130, 25];
            }

            override exec(context: Context, program: ProgramScope, slot: number): IExprInstruction {
                const sourceNode = null as IParseNode;
                const scope = program.currentScope;
                const element = evaluatePartExpr(context, program);

                const name = field.name;
                const decl = Analyzer.createFieldDecl(element.type, name);
                const id = new IdInstruction({ scope, sourceNode, name });
                const postfix = new IdExprInstruction({ scope, sourceNode, id, decl });

                return new PostfixPointInstruction({ sourceNode, scope, element, postfix });
            }
        }

        nodes[`fx/${name}`] = PartPrevous;
    });


    class PartPrevous extends CodeEmitterNode {
        static desc = desc;

        constructor() {
            super(name);
            this.addOutput(PART_LOCAL_NAME, PART_TYPE);
            this.size = [100, 25];
        }

        override exec(context: Context, program: ProgramScope, slot: number): IExprInstruction {
            return evaluatePartExpr(context, program);
        }

    }

    nodes[`fx/${name}`] = PartPrevous;
    return nodes;
}

export default producer;