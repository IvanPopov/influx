import { createTextDocument } from "@lib/fx/TextDocument";
import { ITextDocument } from "@lib/idl/ITextDocument";
import { LGraphNodeEx } from "../GraphNode";
import { InitRoutineHLSL, SpawnRoutineHLSL, UpdateRoutineHLSL } from '../lib';
import { LibLoader } from "./LibLoader";

async function XHRResolveFile(uri: string): Promise<string> {
    try {
        const request = new XMLHttpRequest();
        request.open('GET', uri, false);
        request.send(null);

        if (request.status !== 200) {
            console.error(`unable to request file ''${uri}`);
            return null;
        }

        return request.responseText;
    } catch (e) {
        console.error(e);
    }

    return null;
}

async function loader(lib: ITextDocument) {
    // todo: download templates of routines once
    const SPAWN_TEXT_DOCUMENT = await createTextDocument("://SpawnRoutine.hlsl", SpawnRoutineHLSL);
    const INIT_TEXT_DOCUMENT = await createTextDocument("://InitRoutine.hlsl", InitRoutineHLSL);
    const UPDATE_TEXT_DOCUMENT = await createTextDocument("://UpdateRoutine.hlsl", UpdateRoutineHLSL);
    
    const docs = [
        lib, 

        SPAWN_TEXT_DOCUMENT, 
        INIT_TEXT_DOCUMENT, 
        UPDATE_TEXT_DOCUMENT
    ];

    let ll = new LibLoader();

    for (let doc of docs) {
        await ll.parse(doc, XHRResolveFile)
    }

    for (let node in ll.nodes) {
        LGraphNodeEx.nodesDocs[node] = ll.nodes[node];
    }
}

export default loader;
