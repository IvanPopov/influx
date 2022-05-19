import { isNull } from "@lib/common";
import { Context } from "@lib/fx/analisys/Analyzer";
import { ComplexTypeInstruction } from "@lib/fx/analisys/instructions/ComplexTypeInstruction";
import { IdExprInstruction } from "@lib/fx/analisys/instructions/IdExprInstruction";
import { IdInstruction } from "@lib/fx/analisys/instructions/IdInstruction";
import { PostfixPointInstruction } from "@lib/fx/analisys/instructions/PostfixPointInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IExprInstruction } from "@lib/idl/IInstruction";
import { IParseNode } from "@lib/idl/parser/IParser";
import { LiteGraph } from "litegraph.js";
import { PART_LOCAL_NAME, PART_STRUCTURE_SL_DOCUMENT, PART_TYPE } from "../common";
import { LGraphNodeAST } from "../IGraph";


const type = PART_STRUCTURE_SL_DOCUMENT.root.scope.types[PART_TYPE] as ComplexTypeInstruction;

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

    class Node extends LGraphNodeAST {
        static desc = desc;
        constructor() {
            super(name);
            this.addOutput(name, field.type.name);
            this.size = [130, 25];
        }

        evaluate(context: Context, program: ProgramScope, slot: number): IExprInstruction {
            const sourceNode = null as IParseNode;
            const scope = program.currentScope;
            const element = evaluatePartExpr(context, program);

            const name = field.name;
            const decl = element.type.getField(field.name);
            const id = new IdInstruction({ scope, sourceNode, name });
            const postfix = new IdExprInstruction({ scope, sourceNode, id, decl });

            return new PostfixPointInstruction({ sourceNode, scope, element, postfix });
        }
    }

    LiteGraph.registerNodeType(`fx/${name}`, Node);
});


class Node extends LGraphNodeAST {
    static desc = desc;

    constructor() {
        super(name);
        this.addOutput(PART_LOCAL_NAME, PART_TYPE);
        this.size = [100, 25];
    }

    evaluate(context: Context, program: ProgramScope, slot: number): IExprInstruction {
        return evaluatePartExpr(context, program);
    }

}

LiteGraph.registerNodeType(`fx/${name}`, Node);