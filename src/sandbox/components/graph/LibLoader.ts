import { IMap } from "@lib/idl/IMap";
import { IRange } from "@lib/idl/parser/IParser";
import { CommentExtractor } from "@lib/parser/helpers";
import { INodeDocs } from "./GraphNode";

export class LibLoader extends CommentExtractor
{
    nodes: IMap<INodeDocs> = {};
    node: INodeDocs = null;

    beginComment(content: string): void {
        this.node = { name: null };
    }

    applyRule(rule: string, parts: string[], loc: IRange): void {
        let value = parts.slice(1).join(' ');
        switch(rule)
        {
            case '@node':
            {
                this.node.name = value.match(/\{([^\{\}]*)\}/)[1].trim();
                break;
            }
            case '@desc':
            {
                this.node.desc = value.trim();
                break;
            }
            case '@title':
            {
                this.node.title = value.trim();
                break;
            }
        }
    }

    endComment(): void {
        if (this.node.name) {
            this.nodes[this.node.name] = this.node;
        }
    }
}
