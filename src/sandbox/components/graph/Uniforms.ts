import { Context } from "@lib/fx/analisys/Analyzer";
import { IdExprInstruction } from "@lib/fx/analisys/instructions/IdExprInstruction";
import { IdInstruction } from "@lib/fx/analisys/instructions/IdInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IExprInstruction } from "@lib/idl/IInstruction";
import { IParseNode } from "@lib/idl/parser/IParser";
import { LiteGraph } from "litegraph.js";
import { LIB_SL_DOCUMENT } from "./common";
import { LGraphNodeAST } from "./IGraph";

const vars = LIB_SL_DOCUMENT.root.scope.variables;
for (let name in vars)
{
    let v = vars[name];
    if (v.type.isUniform())
    {
        class Node extends LGraphNodeAST {
            static desc = `Uniform '${name}'`;
            constructor() 
            {
                super(`${name}`);
                this.addOutput('out', v.type.name);
                this.size = [ 180, 25 ];
            }
    
            evaluate(context: Context, program: ProgramScope, slot: number): IExprInstruction
            {
                const scope = program.currentScope;
                let sourceNode = null as IParseNode;
                let decl = scope.findVariable(name);
    
                const id = new IdInstruction({ scope, sourceNode, name });
                return new IdExprInstruction({ scope, sourceNode, id, decl });
            }
        }
    
        LiteGraph.registerNodeType(`constants/${name} (uniform)`, Node);
    }
}
