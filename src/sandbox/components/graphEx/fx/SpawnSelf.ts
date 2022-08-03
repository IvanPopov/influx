import { ComplexTypeInstruction } from "@lib/fx/analisys/instructions/ComplexTypeInstruction";
import { SpawnInstruction } from "@lib/fx/analisys/instructions/part/SpawnInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IExprInstruction, IStmtInstruction, ITypeInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { LiteGraph } from "litegraph.js";
import { PART_TYPE } from "../common";
import { AST, CodeEmitterNode, GraphContext, LGraphNodeFactory } from "../GraphNode";

function def(type: IVariableTypeInstruction, ast: ReturnType<typeof AST>): IExprInstruction
{
    switch(type.name) {
        case 'float': return ast.float(0);
        case 'float2': return ast.float2(0, 0);
        case 'float3': return ast.float3(0, 0, 0);
        case 'float4': return ast.float4(0, 0, 0, 0);
    }
    return null;
}

function producer(env: () => ISLDocument): LGraphNodeFactory
{
    const desc = "SpawnSelf";
    const name = "SpawnSelf";

    const layout = env().root.scope.types[PART_TYPE] as ComplexTypeInstruction;
    const fields = layout.fields;

    class SpawnSelf extends CodeEmitterNode {
        static desc = desc;

        private static ID = 0;
        private uid = SpawnSelf.ID ++;

        constructor() {
            super(name);

            fields.forEach(({ name, type }) => this.addInput(name, type.name));
            this.size = [180, 25 * fields.length + 10];
            this.addInput("", LiteGraph.ACTION);
        }

        override onBeforeExecution(context: GraphContext, program: ProgramScope): void {
            const inputs = fields.map((f, i) => i).filter(i => this.isInputConnected(i));
            
            if (!inputs.length) {
                return;
            }

            super.onBeforeExecution(context, program);

            const ast = AST(context, program);
            context.beginFunc();
            const params = inputs.map(i => `${fields[i].type.name} ${fields[i].name}`).join(', ');
            const fdecl = ast.func(`void SpawnSelf${this.uid}(out Part part, int partId, ${params})`, () => [                
                ...inputs.map(i => ast.assigment(ast.postfixpoint(`part.${fields[i].name}`), ast.idexpr(fields[i].name)))
            ]);
            context.endFunc();
        }

        override compute(context: GraphContext, program: ProgramScope): IStmtInstruction[] {
            const inputs = fields.map((f, i) => i).filter(i => this.isInputConnected(i));
            
            if (!inputs.length) {
                return [];
            }

            const deps = super.compute(context, program);
            const scope = program.currentScope;
            const ast = AST(context, program);

            const count = 1;
            const name = `SpawnSelf${this.uid}`;
            const args = inputs.map(i => this.getInputNode(i)?.exec(context, program, this.link(i)));
    
            const spawnStmt = new SpawnInstruction({ scope, name, args, count });
            const params = inputs.map(i => layout.fields[i].type);
            spawnStmt.$resolve(null, scope.findFunction(name, [ /Part/, /int/, ...params ]));
            context.spawnStmts.push(spawnStmt);
            return [ ...deps, spawnStmt ];
        }

        getTitle(): string { return 'Spawn self'; }
        getDocs(): string { return 'Spawn this emitter.'; }
    }

    return { [`fx/actions/${desc}`]: SpawnSelf };
}

export default producer;