import { Context } from "@lib/fx/analisys/Analyzer";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IExprInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";

import { AST, CodeEmitterNode, LGraphNodeFactory } from "./GraphNode";

function producer(env: () => ISLDocument): LGraphNodeFactory {
    const nodes = <LGraphNodeFactory>{};

    const vars = env().root.scope.variables;
    for (let name in vars) {
        let v = vars[name];
        if (v.type.isUniform()) {
            class Node extends CodeEmitterNode {
                static desc = `Uniform '${name}'`;
                static collapsable = false;
                static color = 'transparent';

                constructor() {
                    super(`${name}`);
                    this.addOutput('out', v.type.name, { label: '' });
                    this.size = this.computeSize();
                    this.size[1] = 0;
                    this.size[0] = Math.max(180, this.size[0]);
                    this.outputs[0].pos = [ this.size[0] - 13, -13 ];
                }

                onDrawTitleBox(ctx, titleHeight, size, scale) {
                    // skip render of title pin
                }

                exec(context: Context, program: ProgramScope): IExprInstruction {
                    return AST(context, program).idexpr(name);
                }
            }

            nodes[`constants/${name} (uniform)`] = Node;
        }
    }

    return nodes;
}

export default producer;
