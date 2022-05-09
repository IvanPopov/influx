import { IMap } from "@lib/idl/IMap";
import { IRange } from "@lib/idl/parser/IParser";
import { CommentExtractor } from "@lib/parser/helpers";

export class LibLoader extends CommentExtractor
{
    expressions: IMap<string> = {};
    routines: IMap<string> = {};

    beginComment(content: string): void {
        
    }

    applyRule(rule: string, parts: string[], loc: IRange): void {
        let value = parts.slice(1).join(' ');
        switch(rule)
        {
            case '@expression':
            {
                let expr = value.match(/\{([^\{\}]*)\}/)[1].trim();
                this.expressions[expr] = expr;
                break;
            }
            case '@procedure':
            {
                let routine = value.match(/\{([^\{\}]*)\}/)[1].trim();
                this.routines[routine] = routine;
                break;
            }
        }
    }

    endComment(): void {
        
    }
}
