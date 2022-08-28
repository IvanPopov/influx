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
            static title_color = `#ffaa00`;

            constructor() {
                super(`${name}`);
                this.addOutput('out', t.name);
                this.size = this.computeSize();
                this.title = `${this.getType()} ${this.getName()}`;
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
