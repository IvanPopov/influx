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
    pos?: boolean;
    size?: boolean;
    color?: boolean;
    sort: 'zero' | 'pos' | 'expr';
}

function updateCode(env: ISLDocument, { id, pos, size, color, sort }: Plugs)
{
    const type = env.root.scope.findType(PART_TYPE);
    return (
`
int PrerenderRoutine${id}(inout Part part, out DefaultShaderInput input)
{
    input.pos.xyz = ${pos ? 'part.pos.xyz' : `$pos`};
    input.size = ${size ? '0.1f' : `$size`};
    input.color = ${color ? 'float4(1.f, 0.f, 1.f, 1.f)' : `$color`};
    return ${sort ? `asint(distance(${sort == 'pos' ? `part.pos.xyz` : `float3(0.f)`}, cameraPosition))` : `$sort`};
}
`);
}

let ID = 0;

function producer(env: () => ISLDocument): LGraphNodeFactory
{
    const DEFAULT_MATERIAL = 'DefaultShaderInput';
    const type = env().root.scope.types[DEFAULT_MATERIAL] as ComplexTypeInstruction;
    const layout = env().root.scope.types[PART_TYPE] as ComplexTypeInstruction;
    const inputs = type.fields.map((decl: IVariableDeclInstruction) => ({ name: decl.name, type: decl.type.name }));
    const desc = "DefaultMaterial";
    const name = "DefaultMaterial";

    class Node extends LGraphNodeEx implements IGraphASTMaterial {
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
            inputs.forEach(i => this.addInput(i.name, i.type));
            this.addInput('sort', 'int');
            this.size = [180, 25 * (inputs.length + 1) + 50 * 2];
            this.updateInputNames();
            this.uid = ID ++;

            this.addProperty("Sorting", true, "bool");
            this.sortingWidget = this.addWidget<IWidget>("toggle", "Sorting", true, "value");
            this.addProperty("Geometry", "Box", "string");
            this.geometryWidget = this.addWidget<IWidget>("text", "Geometry", "Box", "value");
            this.serialize_widgets = true;
        }


        doesInputExistAndDisconnected(name: string) {
            const i = type.fieldNames.indexOf(name);
            return i != -1 && !this.getInputNode(i);
        }

        checkPlugs(): Plugs
        {
            const plugs: Plugs = { id: this.uid, sort: 'zero' };
            // if particle has position propertie and input diconnected - connect implicitly
            plugs.pos = this.doesInputExistAndDisconnected('pos') && layout.hasField('pos');
            plugs.size = this.doesInputExistAndDisconnected('size');
            plugs.color = this.doesInputExistAndDisconnected('color');
            plugs.sort = !this.getInputNode(type.fieldNames.length) 
                ? layout.hasField('pos')  // sort relative to part.pos if possible 
                    ? 'pos' 
                    : 'zero' 
                : 'expr'; // read $sort if connected
            return plugs;
        }

        async run(env: ISLDocument): Promise<ISLDocument> {
            const plugs = this.checkPlugs();
            const textDocument = await createTextDocument("://DefaultMaterial.hlsl", updateCode(env, plugs));
            const node = this;
            const exprHandler = new Proxy({}, {
                get: (target, propertyName) => {
                    // IP: a bit ugly way to skip all execept $name properties.
                    if (propertyName[0] !== '$') return null;
                    return (context, program, sourceNode): IExprInstruction => {
                        if (propertyName == '$sort') {
                            const i = type.fieldNames.length;
                            const input = node.getInputNode(i) as IGraphASTNode;
                            return input.run(context, program, node.link(i)) as IExprInstruction;
                        }

                        // $name => name
                        const fieldName = String(propertyName).substring(1);
                        const i = type.fieldNames.indexOf(fieldName);
                        const input = node.getInputNode(i) as IGraphASTNode;
                        
                        if (input)
                            return input.run(context, program, node.link(i)) as IExprInstruction;

                        return null;
                    }
                }
            });
            return extendSLDocument(textDocument, env, exprHandler);
        }

        getTitle(): string { return 'Default Material'; }
        getDocs(): string { return 'Render particles with default material shader.'; }

        // must be aligned with updateCode() logic.
        renameInput(name: string, auto: boolean)
        {
            let i = name == 'sort' ? type.fieldNames.length : type.fieldNames.indexOf(name);
            if (i != -1)
                switch (name)
                {
                    case 'pos':
                        this.inputs[i].name = auto ? `${name} = part.pos` : name;
                        return;
                    case 'size':
                        this.inputs[i].name = auto ? `${name} = 0.1` : name;
                        return;
                    case 'color':
                        this.inputs[i].name = auto ? `${name} = (1, 0, 1, 1)` : name;
                        return;
                    case 'sort':
                        this.inputs[i].name = auto ? `${name} = [camera]` : name;
                        return;
                }
        }

        updateInputNames()
        {
            const plugs = this.checkPlugs();
            for (let name in plugs)
            {
                this.renameInput(name, plugs[name]);
            }
        }

        onConnectionsChange(type: number, slotIndex: number, isConnected: boolean, link: LLink, ioSlot: INodeInputSlot | INodeOutputSlot): void {
            super.onConnectionsChange(type, slotIndex, isConnected, link, ioSlot);
            this.updateInputNames();
        }

        onPropertyChanged(name: string, value: number, prevValue: number): boolean {
            super.onPropertyChanged(name, value, prevValue);
            this.updateInputNames();
            return true;
        }
    }

    return { [`fx/${desc}`]: Node };
}


export default producer;

