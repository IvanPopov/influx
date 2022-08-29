import { Context } from "@lib/fx/analisys/Analyzer";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IExprInstruction, ITypeInstruction } from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";
import { ISLDocument } from "@lib/idl/ISLDocument";

import { AST, CodeEmitterParam, LGraphNodeFactory } from "../GraphNode";



function producer(env: () => ISLDocument): LGraphNodeFactory {
    const nodes = <LGraphNodeFactory>{};
    
    let types: IMap<ITypeInstruction> = {};
    let scope = env().root.scope;
    while (scope) {
        types = { ...types, ...scope.types };
        scope = scope.parent;
    }

    for (let name in types) {
        let t = types[name];

        class Param extends CodeEmitterParam {
            static desc = `${name} param`;
            static title_color = `rgba(255, 170, 0, 0.7)`;
            static collapsable = false;
            static color = 'transparent';

            constructor() {
                super(`${name}`);
                this.addOutput('out', t.name);
                this.title = `${this.getType()} ${this.getName()}`;
                this.size = this.computeSize();
                this.size[1] = 0;
                this.outputs[0].pos = [ this.size[0] - 13, -13 ];
                this.outputs[0].label = '';
            }

            onDrawTitleBox(ctx, titleHeight, size, scale) {
                // skip render of title pin
            }

            override getName(): string {
                return `p${this.id}`;
            }

            override getType(): string {
                return t.name;
            }

            exec(context: Context, program: ProgramScope): IExprInstruction {
                return AST(context, program).idexpr(this.getName());
            }
        }

        nodes[`params/${name}`] = Param;
    }

    return nodes;
}

export default producer;
