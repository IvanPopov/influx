import { IntInstruction } from "@lib/fx/analisys/instructions/IntInstruction";
import { SpawnInstruction } from "@lib/fx/analisys/instructions/part/SpawnInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { parseUintLiteral } from "@lib/fx/analisys/system/utils";
import { IExprInstruction, IStmtInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { LiteGraph } from "litegraph.js";
import { AST, CodeEmitterStmt, GraphContext, ISpawner, LGraphNodeFactory } from "../GraphNode";

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

function producer(env: () => ISLDocument, spawner: ISpawner): LGraphNodeFactory
{
    const desc = `Spawn '${spawner.title} (${spawner.id})'`;
    const HIDDEN_CONNECTION = { visible: false };

    class SpawnOp extends CodeEmitterStmt {
        static desc = desc;

        static color = 'transparent';
        static can_be_dropped = true;
        static collapsable = false;

        constructor() {
            super(`Spawn '${spawner.title}'`);

            const params = spawner.findParamsDependencies();
            this.addInput('count', 'int');
            params.forEach(param => this.addInput(param.getName(), param.getType()));
            this.addInput("context", LiteGraph.ACTION, HIDDEN_CONNECTION);
            this.update();
        }

        override onBeforeExecution(context: GraphContext, program: ProgramScope): void {
            const inputs = this.inputs.slice(1, -1).map((f, i) => i).filter(i => this.isInputConnected(i));
            
            if (!inputs.length) {
                return;
            }

            super.onBeforeExecution(context, program);
        }

        override compute(context: GraphContext, program: ProgramScope): IStmtInstruction[] {
            const fields = spawner.findParamsDependencies();
            const inputs = fields.map((f, i) => i + 1).filter(i => this.isInputConnected(i));

            fields.forEach((field, i) => this.inputs[i + 1].name = fields[i].title);
            
            // if (!inputs.length) {
            //     return [];
            // }

            const deps = super.compute(context, program);
            const scope = program.currentScope;
            const ast = AST(context, program);

            let count = this.getInputNode('count')?.exec(context, program, this.getOriginalSlot('count'));
            if (!count) {
                const { base, signed, heximal, exp } = parseUintLiteral('1');
                count = new IntInstruction({ scope, base, exp, signed, heximal });
            }


            const name = `InitRoutine${spawner.id}`;
            const args = inputs.map(i => this.getInputNode(i)?.exec(context, program, this.getOriginalSlot(i)));
    
            const spawnStmt = new SpawnInstruction({ scope, name, args, count });
            const params = inputs.map(i => scope.findType(fields[i - 1].getType()));
            // spawnStmt.$resolve(null, scope.findFunction(name, [ /Part/, /int/, ...params ]));
            context.spawnStmts.push(spawnStmt);
            return [ ...deps, spawnStmt ];
        }

        onDrawTitleBox(
            ctx, 
            titleHeight, 
            size, 
            scale
        ) {
            // skip render of title pin
        }
    }

    return { [`fx/actions/${desc}`]: SpawnOp };
}

export default producer;