import { Context } from "@lib/fx/analisys/Analyzer";
import { IdExprInstruction } from "@lib/fx/analisys/instructions/IdExprInstruction";
import { IdInstruction } from "@lib/fx/analisys/instructions/IdInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IExprInstruction } from "@lib/idl/IInstruction";
import { IParseNode } from "@lib/idl/parser/IParser";
import { LiteGraph } from "litegraph.js";
import { LGraphNodeAST } from "../IGraph";

class Node extends LGraphNodeAST {
    static desc = 'Autogenerated particle ID.';
    constructor() 
    {
        super('Part ID');
        this.addOutput('id', 'int');
        this.size = [ 180, 25 ];
    }

    run(context: Context, program: ProgramScope, slot: number): IExprInstruction
    {
        const scope = program.currentScope;
        let sourceNode = null as IParseNode;
        let name = 'partId';
        let decl = scope.findVariable(name);

        const id = new IdInstruction({ scope, sourceNode, name });
        return new IdExprInstruction({ scope, sourceNode, id, decl });
    }
}

LiteGraph.registerNodeType(`fx/partId`, Node);
