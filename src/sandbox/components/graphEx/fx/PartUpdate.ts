import { Context } from "@lib/fx/analisys/Analyzer";
import { BoolInstruction } from "@lib/fx/analisys/instructions/BoolInstruction";
import { FunctionDeclInstruction } from "@lib/fx/analisys/instructions/FunctionDeclInstruction";
import { FunctionDefInstruction } from "@lib/fx/analisys/instructions/FunctionDefInstruction";
import { IdInstruction } from "@lib/fx/analisys/instructions/IdInstruction";
import { InstructionCollector } from "@lib/fx/analisys/instructions/InstructionCollector";
import { ReturnStmtInstruction } from "@lib/fx/analisys/instructions/ReturnStmtInstruction";
import { StmtBlockInstruction } from "@lib/fx/analisys/instructions/StmtBlockInstruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import * as SystemScope from "@lib/fx/analisys/SystemScope";
import { EScopeType, IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { Diagnostics } from "@lib/util/Diagnostics";
import { LiteGraph } from "litegraph.js";
import { PART_LOCAL_NAME, PART_TYPE } from "../common";

import { AST, CodeEmitterNode, GraphContext, LGraphNodeFactory } from "../GraphNode";


function producer(env: () => ISLDocument): LGraphNodeFactory
{
    const desc = "UpdateRoutine";
    const name = "UpdateRoutine";

    class PartUpdate extends CodeEmitterNode {
        static desc = desc;

        constructor() {
            super(name);
            this.addOutput("stmts", LiteGraph.EVENT);
        }
    
        private extend(env: ISLDocument): ISLDocument {
            const uri = env.uri;
            const scope = env.root.scope;
            const program = new ProgramScope(scope);
            const context = new GraphContext(uri)
            const ast = AST(context, program);
    
            context.beginFunc();
            const fdecl = ast.func(`bool UpdateRoutine(inout Part part, int partId)`, 
                () => (this.getOutputNodes(0) || []).map(node => node.compute(context, program)).flat());
            context.endFunc();
    
            const diagnosticReport = Diagnostics.mergeReports([env.diagnosticReport, context.diagnostics.resolve()]);
            const instructions = env.root.instructions.concat([ fdecl ]);
            const root = new InstructionCollector({ scope: program.globalScope, instructions });
            return { root, diagnosticReport, uri };
        }
    
        async run(env: ISLDocument): Promise<ISLDocument>
        {
            this.onBeforeExecution();
            return this.extend(env);
        }

        getTitle(): string { return 'Update routine'; }
        getDocs(): string { return 'Determines state of particle after each update.'; }
    }

    return { [`fx/${desc}`]: PartUpdate };
}


export default producer;

