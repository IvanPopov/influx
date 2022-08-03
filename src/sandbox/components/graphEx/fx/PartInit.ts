import { InstructionCollector } from "@lib/fx/analisys/instructions/InstructionCollector";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { Diagnostics } from "@lib/util/Diagnostics";
import { LiteGraph } from "litegraph.js";

import { AST, CodeEmitterNode, GraphContext, LGraphNodeFactory } from "../GraphNode";


function producer(env: () => ISLDocument): LGraphNodeFactory
{
    const desc = "InitRoutine";
    const name = "InitRoutine";

    class PartInit extends CodeEmitterNode {
        static desc = desc;

        constructor() {
            super(name);
            this.addOutput("stmts", LiteGraph.EVENT);
        }
    
        private extend(env: ISLDocument): ISLDocument {
            const uri = env.uri;
            const scope = env.root.scope;
            const program = new ProgramScope(scope);
            const context = new GraphContext(uri);

            this.onBeforeExecution(context, program);

            const ast = AST(context, program);
            context.beginFunc();
            const fdecl = ast.func(`void InitRoutine(out Part part, int partId)`, 
                () => (this.getOutputNodes(0) || []).map(node => node.compute(context, program)).flat());
            context.endFunc();
    
            const diagnosticReport = Diagnostics.mergeReports([env.diagnosticReport, context.diagnostics.resolve()]);
            const instructions = env.root.instructions.concat([ fdecl ]);
            const root = new InstructionCollector({ scope: program.globalScope, instructions });
            return { root, diagnosticReport, uri };
        }
    
        async run(env: ISLDocument): Promise<ISLDocument>
        {
            return this.extend(env);
        }

        getTitle(): string { return 'Init routine'; }
        getDocs(): string { return 'Determines initial state of each particle.'; }
    }

    return { [`fx/${desc}`]: PartInit };
}


export default producer;

