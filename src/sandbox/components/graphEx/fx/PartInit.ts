import { InstructionCollector } from "@lib/fx/analisys/instructions/InstructionCollector";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { Diagnostics } from "@lib/util/Diagnostics";
import { LGraph, LGraphNode, LGraphNodeConstructor, LiteGraph } from "litegraph.js";
import SpawnOp from '@sandbox/components/graphEx/fx/SpawnOp';

import { AST, CodeEmitterParam, CodeEmitterStmt, GraphContext, ISpawner, LGraphNodeFactory, PartRoutine } from "../GraphNode";

function producer(env: () => ISLDocument): LGraphNodeFactory {
    const desc = "InitRoutine";
    const name = "Init Routine";

    const HIDDEN_CONNECTION = { visible: false };

    class PartInit extends PartRoutine implements ISpawner {
        static desc = desc;

        pure: boolean = false;

        private operators: LGraphNodeFactory = null;

        constructor() {
            super(name);
            this.addOutput("stmts", LiteGraph.EVENT, HIDDEN_CONNECTION);
            this.update();
        }


        onDrop(node) {
            // todo: validate node
            if (this.connect('stmts', node, 'context')) {
                this.update();
                this.highlight(false);
            }
        }

    
        findParamsDependencies(): CodeEmitterParam[] {
            function filterParams(node: LGraphNode, params: CodeEmitterParam[] = []): CodeEmitterParam[] {
                let checkLink = (id, output) => {
                    let link = node.graph.links[id];
                    if (!link) return;
                    let targetNode = node.graph.getNodeById(output ? link.target_id : link.origin_id);
                    filterParams(targetNode, params);
                    if (targetNode instanceof CodeEmitterParam) {
                        params.push(targetNode);
                    } 
                };

                node.inputs?.filter(slot => slot.type !== LiteGraph.ACTION && slot.link !== null).forEach(({ link }) => 
                    checkLink(link, false));
                node.outputs?.filter(slot => slot.type == LiteGraph.EVENT).forEach(({ links }) => 
                    links?.forEach(id => checkLink(id, true)));

                return params;
            }

            return [...new Set(filterParams(this))];
        }


        private extend(env: ISLDocument): ISLDocument {
            const uri = env.uri;
            const scope = env.root.scope;
            const program = new ProgramScope(scope);
            const context = new GraphContext(uri);

            this.onBeforeExecution(context, program);

            
            let params = this.findParamsDependencies().map(node => `${node.getType()} ${node.getName()}`).join(', ');
            params = params && `, ${params}`;

            // cache info whether we have dependencies (can be used as regular per frame routine)
            this.pure = !params;

            const ast = AST(context, program);
            context.beginFunc();
            const fdecl = ast.func(`void InitRoutine${this.id}(out Part part, int partId ${params})`,
                () => (this.getOutputNodes(0) || []).map(node => node.compute(context, program)).flat());
            context.endFunc();

            const diagnosticReport = Diagnostics.mergeReports([env.diagnosticReport, context.diagnostics.resolve()]);
            const instructions = env.root.instructions.concat([fdecl]);
            const root = new InstructionCollector({ scope: program.globalScope, instructions });
            return { root, diagnosticReport, uri };
        }


        async run(env: ISLDocument): Promise<ISLDocument> {
            return this.extend(env);
        }

        onAdded(graph: LGraph): void {
            this.operators = SpawnOp(env, this);

            // register all available nodes
            Object.keys(this.operators).forEach(link =>
                LiteGraph.registerNodeType(link, this.operators[link]));
        }

        onRemoved(): void {
            Object.keys(this.operators)
                .map(link => this.graph.findNodesByType(link))
                .flat()
                .forEach(node => this.graph.remove(node));

            Object.keys(this.operators).forEach(link =>
                LiteGraph.unregisterNodeType(link));
        }
        
        getDocs(): string { return 'Determines initial state of each particle.'; }
    }

    return { [`fx/${desc}`]: PartInit };
}


export default producer;

