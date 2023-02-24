import { isNull, isString } from "@lib/common";
import { Context } from "@lib/fx/analisys/Analyzer";
import { FxContext } from "@lib/fx/analisys/FxAnalyzer";
import { AssignmentExprInstruction } from "@lib/fx/analisys/instructions/AssignmentExprInstruction";
import { BoolInstruction } from "@lib/fx/analisys/instructions/BoolInstruction";
import { ConstructorCallInstruction } from "@lib/fx/analisys/instructions/ConstructorCallInstruction";
import { DeclStmtInstruction } from "@lib/fx/analisys/instructions/DeclStmtInstruction";
import { ExprStmtInstruction } from "@lib/fx/analisys/instructions/ExprStmtInstruction";
import { FloatInstruction } from "@lib/fx/analisys/instructions/FloatInstruction";
import { FunctionDeclInstruction } from "@lib/fx/analisys/instructions/FunctionDeclInstruction";
import { FunctionDefInstruction } from "@lib/fx/analisys/instructions/FunctionDefInstruction";
import { IdExprInstruction } from "@lib/fx/analisys/instructions/IdExprInstruction";
import { IdInstruction } from "@lib/fx/analisys/instructions/IdInstruction";
import { IntInstruction } from "@lib/fx/analisys/instructions/IntInstruction";
import { PostfixPointInstruction } from "@lib/fx/analisys/instructions/PostfixPointInstruction";
import { ReturnStmtInstruction } from "@lib/fx/analisys/instructions/ReturnStmtInstruction";
import { StmtBlockInstruction } from "@lib/fx/analisys/instructions/StmtBlockInstruction";
import { VariableDeclInstruction } from "@lib/fx/analisys/instructions/VariableDeclInstruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import * as SystemScope from "@lib/fx/analisys/SystemScope";
import { parseUintLiteral } from "@lib/fx/analisys/system/utils";
import { EAnalyzerErrors as EErrors } from '@lib/idl/EAnalyzerErrors';
import { EInstructionTypes, EScopeType, IDeclInstruction, IExprInstruction, IFunctionDeclInstruction, IIdInstruction, IStmtInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { nodesForceRecompile, nodesProvideDocs } from "@sandbox/actions";
import { INodeInputSlot, INodeOutputSlot, LGraphCanvas, LGraphNode, LiteGraph, LLink } from "litegraph.js";

export type LGraphNodeFactory = IMap<new () => LGraphNode>;


export class GraphContext extends FxContext {
    varNum = 0;

    addLocal() { return `t${this.varNum++}`; }
}

export interface INodeDocs {
    name: string;
    desc?: string;
    title?: string;
    params?: any;
}

export const AST = <T extends Context>(context: T, program: ProgramScope) => ({

    variable(name: string, typeName: string, usages = []): IVariableDeclInstruction {
        const scope = program.currentScope;
        const id = new IdInstruction({ scope, name });
        const type = new VariableTypeInstruction({ scope, type: scope.findType(typeName), usages });
        const varDecl = new VariableDeclInstruction({ scope, type, id });
        scope.addVariable(varDecl);
        return varDecl;
    },

    stmt(declList: IDeclInstruction[]): IStmtInstruction {
        const scope = program.currentScope;
        return new DeclStmtInstruction({ scope, declList });
    },

    assigment(left: IExprInstruction, right: IExprInstruction): IStmtInstruction {
        const scope = program.currentScope;

        if (!right.type.readable) {
            context.error(right.sourceNode, EErrors.InvalidTypeForReading);
        }
        const expr = new AssignmentExprInstruction({ scope, left, right, operator: '=' });
        return new ExprStmtInstruction({ scope, expr });
    },

    bool(value: boolean): IExprInstruction {
        const scope = program.currentScope;
        return new BoolInstruction({ scope, value });
    },

    int(value: number): IExprInstruction {
        const scope = program.currentScope;
        const { base, signed, heximal, exp } = parseUintLiteral(value.toFixed(0));
        return new IntInstruction({ scope, base, exp, signed, heximal });
    },

    float(x: number): IExprInstruction {
        const scope = program.currentScope;
        return new FloatInstruction({ scope, value: x });
    },

    float2(x: number, y: number): IExprInstruction {
        const scope = program.currentScope;
        const args = [...arguments].map(x => this.float(x));
        const ctor = new VariableTypeInstruction({ type: SystemScope[`T_FLOAT${args.length}`], scope: null });
        return new ConstructorCallInstruction({ scope, args, ctor });
    },

    float3(x: number, y: number, z: number): IExprInstruction {
        const scope = program.currentScope;
        const args = [...arguments].map(x => this.float(x));
        const ctor = new VariableTypeInstruction({ type: SystemScope[`T_FLOAT${args.length}`], scope: null });
        return new ConstructorCallInstruction({ scope, args, ctor });
    },

    float4(x: number, y: number, z: number, w: number): IExprInstruction {
        const scope = program.currentScope;
        const args = [...arguments].map(x => this.float(x));
        const ctor = new VariableTypeInstruction({ type: SystemScope[`T_FLOAT${args.length}`], scope: null });
        return new ConstructorCallInstruction({ scope, args, ctor });
    },

    id(name: string): IIdInstruction {
        const scope = program.currentScope;
        return new IdInstruction({ scope, name });
    },

    idexpr(name: string): IExprInstruction {
        const scope = program.currentScope;
        const decl = scope.findVariable(name);
        if (isNull(decl)) {
            //context.error(sourceNode, EErrors.UnknownVarName, { varName: name });
            return null;
        }
        const id = new IdInstruction({ scope, name });
        return new IdExprInstruction({ scope, id, decl });
    },

    postfixpoint(ppname: string) {
        const [elementName, fieldName] = ppname.split('.');
        const scope = program.currentScope;
        const element = this.idexpr(elementName);
        const postfix = new IdExprInstruction({
            scope,
            id: new IdInstruction({ scope, name: fieldName }),
            decl: element.type.getField(fieldName)
        });
        return new PostfixPointInstruction({ scope, element, postfix });
    },

    return(expr: IExprInstruction): IStmtInstruction {
        const scope = program.currentScope;
        return new ReturnStmtInstruction({
            scope,
            expr
        });
    },

    // bool foo(int x)
    func(signature: string,
        content: () => IStmtInstruction[]): IFunctionDeclInstruction {

        const regex = /(?<typeName>\w+)\s(?<funcName>\w+)\(\s*(?<paramStr>.*)\)/mg;
        const match = regex.exec(signature);
        if (!match) {
            return null;
        }

        const ast = AST(context, program);
        const { funcName, typeName, paramStr } = match.groups;
        const paramList = paramStr
            .split(',')
            .map(x => x.trim())
            .map(p => p.split(/\s+/).reverse())
            .map(([name, type, usage]) => ast.variable(name, type, usage ? [usage] : []))

        const scope = program.currentScope;
        const globalScope = program.globalScope;

        program.push(EScopeType.k_Default);

        const returnType = VariableTypeInstruction.wrap(scope.findType(typeName), SystemScope.SCOPE);
        const id = ast.id(funcName)
        const def = new FunctionDefInstruction({ scope, returnType, id, paramList });
        context.funcDef = def;

        const stmtList = [...content()];

        if (!stmtList.length || stmtList[stmtList.length - 1].instructionType != EInstructionTypes.k_ReturnStmt) {
            let returnExpr = null;
            switch (typeName) {
                case 'bool':
                    returnExpr = ast.bool(true);
                    break;
                case 'uint':
                case 'int':
                    returnExpr = ast.int(0);
                    break;
                case 'void':
                    break;
                default:
                    console.error('unsupported type of return expression');
            }

            stmtList.push(ast.return(returnExpr));
        }

        const impl = new StmtBlockInstruction({ scope, stmtList });

        program.pop();

        let func = new FunctionDeclInstruction({ scope, def, impl });
        globalScope.addFunction(func);

        return func;
    }
});

export class CodeEmitterNode extends LGraphNode {
    // docs provided outside from autogenDocumentation() method;
    static nodesDocs: IMap<INodeDocs> = {};

    // names of local variables
    protected locals: string[];
    protected localsCache: IExprInstruction[];

    // constructor(name) {
    //     super(name);
    // }

    //
    // Helpers 
    //

    protected resolveInput(id: number | string): number {
        let slot: number = -1;
        if (isString(id)) {
            slot = this.inputs.findIndex(i => i.name == id)
        } else {
            slot = id as number;
        }
        return slot;
    }

    protected resolveOutput(id: number | string): number {
        let slot: number = -1;
        if (isString(id)) {
            slot = this.outputs.findIndex(i => i.name == id)
        } else {
            slot = id as number;
        }
        return slot;
    }

    getInputLink(id: number | string): LLink {
        const ii = this.getInputInfo(id);
        if (!ii) return null;
        const link = ii.link;
        if (!link) return null;
        return this.graph.links[link];
    }

    getOutputLinks(id: number | string): LLink[] {
        const ii = this.getOutputInfo(id);
        if (!ii) return null;
        const links = ii.links;
        if (!links) return null;
        return links.map(link => this.graph.links[link]);
    }

    getOriginalSlot(id: number | string): number {
        let link = this.getInputLink(id);
        if (!link) return -1;
        return link.origin_slot;
    }


    getInputNode(id: number | string): CodeEmitterNode {
        let slot = this.resolveInput(id);
        return super.getInputNode(slot) as CodeEmitterNode;
    }


    getInputInfo(id: number | string) {
        let slot = this.resolveInput(id);
        return super.getInputInfo(slot);
    }

    getOutputInfo(id: number | string) {
        let slot = this.resolveOutput(id);
        return super.getOutputInfo(slot);
    }

    getOutputNodes(id: number | string): CodeEmitterNode[] {
        let slot = this.resolveOutput(id);
        return super.getOutputNodes(slot) as CodeEmitterNode[];
    }


    // todo: move to litegraph.js
    getInputNodes(): CodeEmitterNode[] {
        return this.inputs
            .filter(i => i && i.link !== null)  // filter valid inputs
            .map(i => this.graph.links[i.link]) // conver inputs to link infos
            .filter(li => !!li)                 // filter valid links
            .map(li => this.graph.getNodeById(li.origin_id) as CodeEmitterNode);
    }

    //
    // Execution api
    //

    async run(env: ISLDocument): Promise<ISLDocument> {
        return null
    }


    protected local(slot: number) {
        return this.locals[0];
    }

    protected localCache(slot: number) {
        return this.localsCache?.[0] || null;
    }

    protected addLocal(context: GraphContext, program: ProgramScope, type: string, expr: IExprInstruction): IStmtInstruction[] {
        const t = context.addLocal();
        this.locals = [t];
        this.localsCache = [expr];

        const ast = AST(context, program);
        return [
            ast.stmt([ast.variable(t, type)]),
            ast.assigment(ast.idexpr(t), expr)
        ];
    }

    // be careful, this function cane be called more than once per node because of multiple connections
    // it has to be fixed
    onBeforeExecution(context: GraphContext, program: ProgramScope): void {
        this.locals = null; // clean up precached names
        this.localsCache = null;
        this.inputs.forEach((n, i) =>
            n.type != LiteGraph.ACTION && this.getInputNode(i)?.onBeforeExecution(context, program));
        this.outputs.forEach((n, i) =>
            n.type == LiteGraph.EVENT && this.getOutputNodes(i)?.forEach(node => node.onBeforeExecution(context, program)));
    }


    compute(context: GraphContext, program: ProgramScope): IStmtInstruction[] {
        return this.inputs.map((n, i) => n.type == LiteGraph.ACTION
            ? []
            : this.getInputNode(i)?.compute(context, program) || []).flat();
    }


    exec(context: Context, program: ProgramScope, slot: number): IExprInstruction {
        const scope = program.currentScope;
        return new BoolInstruction({ scope, value: false });
    }

    //
    // Docs api
    //

    getDocs(): string {
        return CodeEmitterNode.nodesDocs[this.title]?.desc || null;
    }


    getTitle(): string {
        const titleEx = CodeEmitterNode.nodesDocs[this.title];
        return titleEx?.title || this.title;
    }


    onSelected(): void {
        const docs = this.getDocs();
        if (docs) {
            nodesProvideDocs(docs);
        }
    }


    onDeselected(): void {
        const docs = this.getDocs();
        if (docs) {
            nodesProvideDocs(null);
        }
    }


    onPropertyChanged(name: string, value: number, prevValue: number): boolean {
        nodesForceRecompile();
        return true;
    }


    emitError(desc?: string) {
        if (desc) console.error(desc);
        this.color = 'red';
    }


    emitNoError() {
        this.color = null;
    }


    onConnectionsChange(type: number, slotIndex: number, isConnected: boolean, link: LLink, ioSlot: INodeInputSlot | INodeOutputSlot): void {
        this.emitNoError(); // clean up errors on every change
    }

    onDrawBackground(
        ctx: CanvasRenderingContext2D,
        graphcanvas: LGraphCanvas,
        canvas: HTMLCanvasElement,
        mouse: [number, number]
    ) {

        if (this.flags.collapsed)
            return;

        if (this.mouseOver) {
            const docs = this.getDocs();
            if (docs) {
                ctx.save();
                ctx.font = "12px sans-serif";
                ctx.fillStyle = "#AAA";
                ctx.fillText(this.getDocs(), 0, this.size[1] + 18);
                ctx.restore();
            }
        }
    }

    // IP: uncomment to render selection around hint
    // onBounding(rect) {
    //     if (!this.flags.collapsed && this.mouseOver) {
    //         const docs = this.getDocs();
    //         if (docs) {
    //             rect[3] = this.size[1] + 45;
    //         }
    //     }
    // }

    ////

    setOutputSlotType(type: string, slot: number): void {}
    setInputSlotType(type: string, slot: number): void {}
}

export class CodeEmitterParam extends CodeEmitterNode {
    getName(): string { return null; }
    getType(): string { return null; }
}

export class CodeEmitterStmt extends CodeEmitterNode {

    protected readyToAccept = false;

    protected dependentNodes() {
        return this.getOutputNodes(0); // 'stmts' ?
    }

    protected update() {
        const dx = 7;
        const dy = 5;
        const dh_title = 35;
        const dh_notitle = 5;
        const dh_post = 10;

        let [w, h] = this.computeSize();
        let [x, y] = [dx, h - (this.inputs.find(i => i.pos?.[1] < 0) || this.outputs?.[0]?.visible === false ? 26 : 0)]; // fixme!!!

        const nodes = this.dependentNodes();
        if (nodes) {
            for (let node of nodes) {
                const noTitle = (node.constructor as typeof LGraphNode).title_mode == LiteGraph.NO_TITLE;

                const px = this.pos[0] + x;
                const py = this.pos[1] + y + (noTitle ? dh_notitle : dh_title);

                if (node.pos[0] != px || node.pos[1] != py) {
                    node.pos = [px, py];
                    (node as CodeEmitterStmt).onReposition?.();
                }

                w = Math.max(w, node.size[0] + dx * 2);
                y = y +
                    node.size[1] +
                    (!noTitle ? LiteGraph.NODE_TITLE_HEIGHT : 0) +
                    dy;
            }
        }

        w = Math.max(100, w);
        h = Math.max(30, y + dh_post);

        if (this.size[0] != w || this.size[1] != h) {
            this.size = [w, h];
            this.onResize();
        }

        return nodes;
    }

    onResize() {
        (this.getInputNode("context") as CodeEmitterStmt)?.update?.();
    }

    onReposition() {
        (this.getInputNode("context") as CodeEmitterStmt)?.update?.();
    }

    protected highlight(value) {
        this.readyToAccept = value;
    }


    onDropEnter(node) {
        this.highlight(true);
        this.update();
    }


    onDropLeave(node) {
        this.highlight(false);

        const graph = this.graph;
        const links = this.outputs[0].links || [];

        // trying to find incoming node within our connections
        // and disconnect if possible
        links.forEach(link_id => {
            let link = graph.links[link_id];
            let targetNode = graph.getNodeById(link.target_id);
            if (node == targetNode) {
                this.disconnectOutput(0, targetNode);
            }
        });

        this.update();
    }


    onDrag(graphcanvas) {
        const nodes = this.update();
        if (nodes) {
            nodes.forEach(node => {
                graphcanvas.bringToFront(node)
                if (node.onDrag) node.onDrag(graphcanvas);
            });
        }
    }


    onConnectionsChange() {
        this.update();
        // force update parent twice in order to validate that all nodes in positions
        this.onResize();
    }


    onBringToFront(canvas) {
        const nodes = this.dependentNodes();
        if (nodes) {
            nodes.forEach(node => {
                canvas.bringToFront(node);
                if (node.onBringToFront)
                    node.onBringToFront(canvas);
            });
        }
    }
}

export interface ISpawner extends CodeEmitterNode {
    // indicates that spawner/initializer doesn't 
    // have dependencies and can be call inside per frame routine
    get pure(): boolean;        

    findParamsDependencies(): CodeEmitterParam[];
} 

export interface ICodeMaterialNode extends CodeEmitterNode {
    get sorting(): boolean;     // pass options
    get geometry(): string;     // pass options
}


export class PartRoutine extends CodeEmitterStmt {
        
    // render as fully transparent by default (only with custom design)
    // static title_mode = LiteGraph.TRANSPARENT_TITLE;
    // static color = 'transparent';
    // static bgcolor = 'transparent';

    static can_accept_drop = true;
    static collapsable = false;
    // static title_offset_x = 5;

    onDrawBackground(
        ctx         /* CanvasRenderingContext2D */,
        gcanvas     /* LGraphCanvas */,
        canvas      /* HTMLCanvasElement */,
        mouse
    ) {
        super.onDrawBackground(ctx, gcanvas, canvas, mouse);

        if (this.flags.collapsed)
            return;

        let [w, h] = this.size;

        if (this.readyToAccept) {
            ctx.save();
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'orange';
            ctx.roundRect(0, 0, w + 1, h, [0, 0, 0, 0], 0);
            ctx.stroke();
            ctx.closePath();
            ctx.restore();
        }
    }


    // onDrawTitleBar(
    //     ctx: CanvasRenderingContext2D, 
    //     titleHeight: number,
    //     size: number[],
    //     scale: number,
    //     fgColor: string
    // ) {
    //     ctx.beginPath();
    //     ctx.shadowBlur = 0;
    //     ctx.lineWidth = 2;
    //     ctx.rect(-1, -titleHeight-1, size[0] + 1 + 2, titleHeight);
    //     ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    //     ctx.fill();
    //     ctx.closePath();
    // }

    // onDrawTitleBox(
    //     ctx, 
    //     titleHeight, 
    //     size, 
    //     scale
    // ) {
    //     // do not render title pin
    // }

    // onDrawTitleText(
    //     ctx, 
    //     titleHeight, 
    //     size, 
    //     scale,
    //     font,
    //     selected
    // ) {
    //     console.log(`onDrawTitleText`, arguments);
    // }
}
