import { ComplexTypeInstruction } from "@lib/fx/analisys/instructions/ComplexTypeInstruction";
import { InstructionCollector } from "@lib/fx/analisys/instructions/InstructionCollector";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { Diagnostics } from "@lib/util/Diagnostics";

import { IWidget } from "litegraph.js";
import { PART_TYPE } from "../common";
import { AST, CodeEmitterNode, GraphContext, ICodeMaterialNode, LGraphNodeFactory } from "../GraphNode";


let ID = 0;

function producer(env: () => ISLDocument): LGraphNodeFactory
{
    const DEFAULT_MATERIAL = 'DefaultShaderInput';
    const type = env().root.scope.types[DEFAULT_MATERIAL] as ComplexTypeInstruction;
    const inputs = type.fields.map((decl: IVariableDeclInstruction) => ({ name: decl.name, type: decl.type.name }));
    const desc = "DefaultMaterial";
    const name = "DefaultMaterial";

    class DefaultMaterial extends CodeEmitterNode implements ICodeMaterialNode {
        static desc = desc;

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
            // float3 pos : POSITION;
            // float4 color : COLOR0;
            // float  size : SIZE;
            inputs.forEach(i => this.addInput(i.name, i.type));
            this.addInput('sort', 'int');
            this.size = [180, 25 * (inputs.length + 1) + 50 * 2];
            this.uid = ID ++;

            this.addProperty("Sorting", true, "bool");
            this.sortingWidget = this.addWidget<IWidget>("toggle", "Sorting", true, "value");
            this.addProperty("Geometry", "Box", "string");
            this.geometryWidget = this.addWidget<IWidget>("text", "Geometry", "Box", "value");
            this.serialize_widgets = true;
        }


        private extend(env: ISLDocument): ISLDocument {
            const uri = env.uri;
            const scope = env.root.scope;
            const program = new ProgramScope(scope);
            const context = new GraphContext(uri)
            const ast = AST(context, program);

            const execInput = (id: string) => 
                this.getInputNode(id).exec(context, program, this.link(id));
            const computeInput = (id: string) => 
            this.getInputNode(id).compute(context, program);
            
            context.beginFunc();
            const fdecl = ast.func(`int PrerenderRoutine${this.uid}(inout Part part, out DefaultShaderInput input)`, 
                () => 
                [ 
                    ...computeInput('pos'),
                    ...computeInput('size'),
                    ...computeInput('color'),
                    ...computeInput('sort'),

                    ast.assigment(ast.postfixpoint('input.pos'), execInput('pos')),
                    ast.assigment(ast.postfixpoint('input.size'), execInput('size')),
                    ast.assigment(ast.postfixpoint('input.color'), execInput('color')),

                    ast.return(execInput('sort'))
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

        getTitle(): string { return 'Default Material'; }
        getDocs(): string { return 'Render particles with default material shader.'; }
    }

    return { [`fx/${desc}`]: DefaultMaterial };
}


export default producer;

