import { Context } from "@lib/fx/analisys/Analyzer";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IExprInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";

import { AST, CodeEmitterNode, LGraphNodeFactory } from "../GraphNode";

function producer(env: () => ISLDocument): LGraphNodeFactory {
    class PartId extends CodeEmitterNode {
        static desc = 'Autogenerated particle ID.';
        constructor() {
            super('Part ID');
            this.addOutput('id', 'int');
            this.size = [180, 25];
        }

        override exec(context: Context, program: ProgramScope, slot: number): IExprInstruction {
            const scope = program.currentScope;
            const name = 'partId';
            const decl = scope.findVariable(name);
            const ast = AST(context, program);

            if (!decl) {
                this.emitError(`Part ID has not been found.`);
                return null;
            }

            return ast.idexpr(name);
        }
    }

    return { [`fx/partId`]: PartId };
}

export default producer;