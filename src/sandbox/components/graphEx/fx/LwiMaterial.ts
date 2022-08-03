import { ComplexTypeInstruction } from "@lib/fx/analisys/instructions/ComplexTypeInstruction";
import { InstructionCollector } from "@lib/fx/analisys/instructions/InstructionCollector";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { Diagnostics } from "@lib/util/Diagnostics";


import { IWidget } from "litegraph.js";
import { PART_TYPE } from "../common";
import { AST, CodeEmitterNode, GraphContext, ICodeMaterialNode, LGraphNodeFactory } from "../GraphNode";


// fixme: do not cross with ID from DefaultMaterial.ts
let ID = 20000;

function producer(env: () => ISLDocument): LGraphNodeFactory {
    const layout = env().root.scope.types[PART_TYPE] as ComplexTypeInstruction;
    const desc = "LwiMaterial";
    const name = "LwiMaterial";

    class LwiMaterial extends CodeEmitterNode implements ICodeMaterialNode {
        static desc = desc;

        private map = { transform: 0, template: 1 };
        private sortingWidget: IWidget<boolean>;
        private geometryWidget: IWidget<string>;
        
        uid: number;
        get sorting(): boolean {
            return this.sortingWidget.value;
        }

        get geometry(): string {
            return this.geometryWidget.value;
        }

        constructor() {
            super(name);
            this.addInput('transform', 'float3x4');
            this.addInput('template', 'int');
            this.size = [180, 25 * (2) + 50 * 2];
            this.uid = ID++;

            this.addProperty("Sorting", true, "bool");
            this.sortingWidget = this.addWidget<IWidget>("toggle", "Sorting", true, "value");
            this.addProperty("Geometry", "Box", "string");
            this.geometryWidget = this.addWidget<IWidget>("text", "Geometry", "Box", "value");
            this.serialize_widgets = true;
            // this.widgets_up = true;
        }


        private extend(env: ISLDocument): ISLDocument {
            const uri = env.uri;
            const scope = env.root.scope;
            const program = new ProgramScope(scope);
            const context = new GraphContext(uri)
            const ast = AST(context, program);

            const execInput = (id: string) => 
                this.getInputNode(id).exec(context, program, this.link(id));
    
            context.beginFunc();
            const fdecl = ast.func(`int PrerenderRoutine${this.uid}(inout Part part, inout LwiInstance input)`, 
                () => 
                [ 
                    ...this.getInputNode('transform').compute(context, program),
                    ...this.getInputNode('template').compute(context, program),
                    
                    // input.worldMatrPrev[0] = input.worldMatr[0];
                    // input.worldMatrPrev[1] = input.worldMatr[1];
                    // input.worldMatrPrev[2] = input.worldMatr[2];
                    ast.assigment(ast.postfixpoint('input.worldMatrPrev'), ast.postfixpoint('input.worldMatr')),
                
                    // input.worldMatr[0] = transform[0];
                    // input.worldMatr[1] = transform[1];
                    // input.worldMatr[2] = transform[2];
                    ast.assigment(ast.postfixpoint('input.worldMatr'), execInput('transform')),
                    ast.return(execInput('template'))
                ]
            );
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

        getTitle(): string { return 'Lwi Material'; }
        getDocs(): string { return 'Render particles as lwi templates.'; }

    }

    return { [`fx/${desc}`]: LwiMaterial };
}


export default producer;

