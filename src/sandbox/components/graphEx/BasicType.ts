import { Context } from "@lib/fx/analisys/Analyzer";
import { BoolInstruction } from "@lib/fx/analisys/instructions/BoolInstruction";
import { ConstructorCallInstruction } from "@lib/fx/analisys/instructions/ConstructorCallInstruction";
import { FloatInstruction } from "@lib/fx/analisys/instructions/FloatInstruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IExprInstruction, IStmtInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { IParseNode } from "@lib/idl/parser/IParser";
import { INodeInputSlot, INodeOutputSlot, LLink } from "litegraph.js";
import * as SystemScope from "@lib/fx/analisys/SystemScope";
import { types } from "@lib/fx/analisys/helpers";


import { CodeEmitterNode, LGraphNodeFactory, GraphContext } from "./GraphNode";
import { CastExprInstruction } from "@lib/fx/analisys/instructions/CastExprInstruction";

function producer(env: () => ISLDocument): LGraphNodeFactory {
    const nodes = <LGraphNodeFactory>{};

    [
        'float', 'float2', 'float3', 'float4',
        'half', 'half2', 'half3', 'half4',
        'int', 'int2', 'int3', 'int4',
        'uint', 'uint2', 'uint3', 'uint4',
        'bool', 'bool2', 'bool3', 'bool4'
    ].forEach(typeName => {
        const match = typeName.match(/(float|half|bool|uint|int)(2|3|4)?/);
        const desc = [typeName[0].toUpperCase(), ...typeName.slice(1)].join('');
        const count = Number(match[2] || 1);
        const type = match[1];

        let prettify = (raw: number | boolean): any => {
            const value = Number(raw);
            switch (type) {
                case 'bool': return !!value;
                case 'uint': return value >>> 0;
                case 'int': return value << 0;
                default: return value;
            }
        };

        class Node extends CodeEmitterNode {
            static desc = desc;

            private inputNames: string[] = [];

            constructor() {
                super(desc);
                this.addOutput("out", typeName);


                [...'xyzw'].slice(0, count).forEach(name => {
                    if (count == 1) {
                        this.addInput(name, 'float,bool,int,uint,half');
                    } else {
                        this.addInput(name, type);
                    }
                    this.inputNames.push(name);

                    if (type == 'bool')
                        this.addProperty<Boolean>(name, false, 'boolean');
                    else // int/uint/float/half
                        this.addProperty<Number>(name, 0.0, 'number');
                });
                this.size = [180, 25 * count];
            }

            override compute(context: GraphContext, program: ProgramScope): IStmtInstruction[] {
                return [...Array(count).keys()].map(i => 
                    this.getInputNode(i)?.compute(context, program) || []).flat();
            }

            override exec(context: Context, program: ProgramScope, slot: number): IExprInstruction {
                const sourceNode = null as IParseNode;
                const scope = program.currentScope;
                const type = scope.findType(typeName);

                const ctor = new VariableTypeInstruction({ type, scope: null });
                const args = [...Array(count).keys()].map(i => {
                    const input = this.getInputNode(i);
                    const name = this.inputNames[i];
                    if (!input) {
                        switch (match[1]) {
                            case 'bool':
                                return new BoolInstruction({ scope, sourceNode, value: !!this.properties[name] });
                            default:
                                return new FloatInstruction({ scope, sourceNode, value: prettify(this.properties[name]) })
                        }
                    }
                    return input.exec(context, program, this.getOriginalSlot(i));
                });
                // avoid float(float(t)) expressions
                if (count == 1) {
                    if (types.equals(type, args[0].type)) {
                        return args[0];
                    }
                }
                return new ConstructorCallInstruction({ scope, sourceNode, ctor, args });
            }

            updateInputNames() {
                for (let i in this.inputs) {
                    let input = this.inputs[i];
                    input.name = !input.link ? `${this.inputNames[i]} = ${prettify(this.properties[this.inputNames[i]])}` : this.inputNames[i];
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

            getDocs(): string {
                return `Constructor of ${typeName}() type.`
            }

            getTitle(): string {
                if (this.flags.collapsed && this.inputs.filter(i => i.link).length === 0) {
                    return `(${this.inputNames.map(name => prettify(this.properties[name])).join(' ,')})`;
                }
                return super.getTitle();
            }
        }

        nodes[`constructors/${typeName}`] = Node;

        class Cast extends CodeEmitterNode {
            static desc = `${desc} (cast)`;

            private inputNames: string[] = [];

            constructor() {
                super(desc);
                this.addOutput("out", typeName);
                this.addInput('x', 'float,bool,int,uint,half'.split(',').map(x => `${x}${count}`).join(','));
                this.size = this.computeSize();
            }

            override compute(context: GraphContext, program: ProgramScope): IStmtInstruction[] {
                return this.getInputNode(0)?.compute(context, program);
            }

            override exec(context: Context, program: ProgramScope, slot: number): IExprInstruction {
                const scope = program.currentScope;
                const type = scope.findType(typeName);
                const sourceExpr = this.getInputNode(0).exec(context, program, this.getOriginalSlot(0));
                if (types.equals(sourceExpr.type, type)) {
                    return sourceExpr;
                }
                return new CastExprInstruction({ scope, sourceExpr, type });
            }

            getDocs(): string {
                return `Cast to ${typeName}() type.`
            }

            // getTitle(): string {
            //     if (this.flags.collapsed && this.inputs.filter(i => i.link).length === 0) {
            //         return `(${this.inputNames.map(name => prettify(this.properties[name])).join(' ,')})`;
            //     }
            //     return super.getTitle();
            // }
        }

        nodes[`constructors/${typeName} (cast)`] = Cast;
    });

    return nodes;
}

export default producer;