import { Context } from "@lib/fx/analisys/Analyzer";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IExprInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { INodeConstant } from "@sandbox/store/IStoreState";

import { AST, CodeEmitterNode, LGraphNodeFactory } from "../GraphNode";



function producer(env: () => ISLDocument, constants: INodeConstant[]): LGraphNodeFactory {
    const nodes = <LGraphNodeFactory>{};

    for (let desc of constants) {
        const { name, type: typeName, value } = desc;

        class UserConst extends CodeEmitterNode {
            static desc = `${name} (user const)`;
            static collapsable = false;
            static color = 'transparent';

            constructor() {
                super(`${name} (user const)`);
                this.addOutput('out', typeName, { label: '' });
                this.size = this.computeSize();
                this.size[1] = 0;
                this.size[0] = Math.max(180, this.size[0]);
                this.outputs[0].pos = [ this.size[0] - 13, -13 ];
            }

            // override onBeforeExecution(context: GraphContext, program: ProgramScope): void {
            //     super.onBeforeExecution(context, program);
            // }

            onDrawTitleBox(ctx, titleHeight, size, scale) {
                // skip render of title pin
            }

            exec(context: Context, program: ProgramScope): IExprInstruction {
                return AST(context, program).idexpr(name);
            }
        }

        nodes[`user constants/${name}`] = UserConst;
    }

    return nodes;
}

export default producer;
