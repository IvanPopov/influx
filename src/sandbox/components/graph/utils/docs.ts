import { createTextDocument } from "@lib/fx/TextDocument";
import { ITextDocument } from "@lib/idl/ITextDocument";
import { CodeEmitterNode } from "@sandbox/components/graphEx/GraphNode";
import { LGraphNodeEx } from "../GraphNode";
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
    const docs = [
        lib, 
        // ...
    ];

    let ll = new LibLoader();

    for (let doc of docs) {
        await ll.parse(doc, XHRResolveFile)
    }

    for (let node in ll.nodes) {
        LGraphNodeEx.nodesDocs[node] = ll.nodes[node];
        CodeEmitterNode.nodesDocs[node] = ll.nodes[node];
    }
}

export default loader;
