import { isString } from "@lib/common";
import { Analyzer, IExprSubstCallback } from "@lib/fx/analisys/Analyzer";
import { createSyncSLASTDocument } from "@lib/fx/SLASTDocument";
import { createSyncTextDocument } from "@lib/fx/TextDocument";
import { IExprInstruction } from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";
import { ISLASTDocument } from "@lib/idl/ISLASTDocument";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { ITextDocument } from "@lib/idl/ITextDocument";
import { LGraphNode, LiteGraph } from "litegraph.js";
import { LIB_SL_DOCUMENT } from "./autogen";
import { IGraphASTNode } from "./IGraph";
import { SpawnRoutineHLSL } from './lib';
import { LibLoader } from "./LibLoader";


function createSyncSLDocument(document: ISLASTDocument | ITextDocument, expressions?: IMap<IExprSubstCallback>, parentSLDocument?: ISLDocument): ISLDocument {
    let textDocument = <ITextDocument>document;
    let slastDocument = <ISLASTDocument>document;

    if (isString(textDocument.source)) {
        slastDocument = createSyncSLASTDocument(textDocument);
    }

    const timeLabel = `createSLDocument(${slastDocument.uri})`;
    console.time(timeLabel);

    const analyzer = new Analyzer;
    const slDocument = analyzer.parseSync(slastDocument, { document: parentSLDocument, expressions });

    console.timeEnd(timeLabel);

    return slDocument;
}

// let windowObjectReference;
// let windowFeatures = "left=100,top=100,width=320,height=320";

// function openRequestedPopup() {
//     windowObjectReference = window.open("/code-view.html", "modal", windowFeatures);
//     if (windowObjectReference) {
//         //
//     }
// }

export class SpawnRoutine extends LGraphNode // implements IGraphASTNode
{
    static desc = "Spawn Routine";

    constructor() {
        super("Spawn");
        this.addInput("count", "float,int,uint"); // TODO: leave only 'uint'
        this.size = [180, 30];
    }


    onExecute(): void {
        // openRequestedPopup();

        let inputNode = this.getInputNode(0);
        if (!inputNode) {
            console.warn('nothing todo');
            return;
        }

        // let info = this.getInputInfo(0);
        // let inputSlot = this.graph.links[info.link].origin_slot;
        // inputNode.getOutputData(inputSlot);

        // console.log('yes?!');
        // console.log('output data from 0 slot:', this.getInputData(0, true));

        let textDocument = createSyncTextDocument("://SpawnRoutine.hlsl", SpawnRoutineHLSL);

        const slastDocument = createSyncSLASTDocument(textDocument);
        const slDocument = createSyncSLDocument(slastDocument, {
            '$input0': (context, program, sourceNode): IExprInstruction => {
                console.log(sourceNode.value);
                const scope = program.currentScope;
                // const { base, signed, heximal, exp } = parseUintLiteral('5');
                // return new IntInstruction({ scope, sourceNode, base, exp, signed, heximal });
                return (inputNode as IGraphASTNode).evaluate(context, program) as IExprInstruction;
            }
        }, LIB_SL_DOCUMENT);

        let ll = new LibLoader();
        ll.parse(textDocument);

        for (let name in ll.expressions) {
            const funcDecl = slDocument.root.scope.functions[name][0];
            // console.log(funcDecl.def.params.map(p => p.toCode()));
            console.log(funcDecl.toCode());

        }

        for (let name in ll.routines) {
            const funcDecl = slDocument.root.scope.functions[name][0];
            // console.log(funcDecl.def.params.map(p => p.toCode()));
            console.log(funcDecl.toCode());
        }
    }
}




LiteGraph.registerNodeType("influx/spawn routine", SpawnRoutine);

