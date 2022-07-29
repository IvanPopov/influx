import { Context } from "@lib/fx/analisys/Analyzer";
import { ComplexTypeInstruction } from "@lib/fx/analisys/instructions/ComplexTypeInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { extendSLDocument } from "@lib/fx/SLDocument";
import { createTextDocument } from "@lib/fx/TextDocument";
import { IExprInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";


import { IGraphASTFinalNode, IGraphASTMaterial, IGraphASTNode, LGraphNodeEx, LGraphNodeFactory } from "../GraphNode";
import { PART_TYPE } from "../common";
import { INodeInputSlot, INodeOutputSlot, IWidget, LLink } from "litegraph.js";

interface Plugs {
    id: number;
    templateIndex?: boolean;
}

function updateCode(env: ISLDocument, plugs: Plugs) {
    const type = env.root.scope.findType(PART_TYPE);
    return (
        `
int PrerenderRoutine${plugs.id}(inout Part part, inout LwiInstance input)
{
    // IP: todo: add support of direct matrix assigment
    // input.worldMatrPrev = input.worldMatr;
    input.worldMatrPrev[0] = input.worldMatr[0];
    input.worldMatrPrev[1] = input.worldMatr[1];
    input.worldMatrPrev[2] = input.worldMatr[2];

    float3x4 transform = $transform;
    input.worldMatr[0] = transform[0];
    input.worldMatr[1] = transform[1];
    input.worldMatr[2] = transform[2];
    return ${plugs.templateIndex ? '0' : `asint($template)`};
}
`);
}
// fixme: do not cross with ID from DefaultMaterial.ts
let ID = 20000;

function producer(env: () => ISLDocument): LGraphNodeFactory {
    const layout = env().root.scope.types[PART_TYPE] as ComplexTypeInstruction;
    const desc = "LwiMaterial";
    const name = "LwiMaterial";

    class Node extends LGraphNodeEx implements IGraphASTMaterial {
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


        doesInputExistAndDisconnected(name: string) {
            const i = this.map[name];
            return i != -1 && !this.getInputNode(i);
        }

        checkPlugs(): Plugs {
            const plugs: Plugs = { id: this.uid };
            plugs.templateIndex = this.doesInputExistAndDisconnected('template');
            return plugs;
        }

        async run(env: ISLDocument): Promise<ISLDocument> {
            const plugs = this.checkPlugs();
            const textDocument = await createTextDocument("://LwiMaterial.hlsl", updateCode(env, plugs));
            const node = this;
            const exprHandler = new Proxy({}, {
                get: (target, propertyName) => {
                    // IP: a bit ugly way to skip all execept $name properties.
                    if (propertyName[0] !== '$') return null;
                    return (context, program, sourceNode): IExprInstruction => {
                        // $name => name
                        const fieldName = String(propertyName).substring(1);
                        const i = this.map[fieldName];
                        const input = node.getInputNode(i) as IGraphASTNode;

                        if (input)
                            return input.run(context, program, node.link(i)) as IExprInstruction;

                        return null;
                    }
                }
            });
            return extendSLDocument(textDocument, env, exprHandler);
        }

        getTitle(): string { return 'Lwi Material'; }
        getDocs(): string { return 'Render particles as lwi templates.'; }

    }

    return { [`fx/${desc}`]: Node };
}


export default producer;

