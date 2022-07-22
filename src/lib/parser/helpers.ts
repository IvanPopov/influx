import { ITextDocument } from "@lib/idl/ITextDocument";
import { ETokenType, IncludeResolver, IRange, IToken } from "@lib/idl/parser/IParser";
import { Lexer } from "@lib/parser/Lexer";
import { createPPDocument } from "@lib/parser/Preprocessor";
import { END_SYMBOL } from "@lib/parser/symbols";
import { cloneRange } from "@lib/parser/util";

/** @deprecated Use CommentExtractor instead. */
export async function exractComments(document: ITextDocument, includeResolver?: IncludeResolver): Promise<IToken[]> {
    const lexer = new Lexer({ skipComments: false });
    const ppdoc = await createPPDocument(document, { skipComments: false, includeResolver });
    lexer.setTextDocument(ppdoc);

    let comments = [];
    let token: IToken;
    while((token = lexer.getNextToken()).value !== END_SYMBOL) {
        if (token.type === ETokenType.k_MultilineCommentLiteral) {
            comments.push(token);
        }
    }
    return comments;
}


/** @deprecated Use CommentExtractor instead. */
export function parseComment(handlers: { [name: string]: (parts: string[], name: string, loc: IRange) => void; }, epilogue?: () => void, prologue?: () => void)
{    
    return (commentToken: IToken) => {
        let comment = commentToken.value.slice(2, -2);
        let list = comment
            .split('\n')
            .map(str => str.replace(/^\s*\*{1,2}\s*|\s*$/g, ''));

        let accum: string[] = [];
        let lastRule: { line: number, content: string } = null;
        let content: string;
        let rules: { line: number, content: string }[] = [];
        let line = -1;
        while (list.length) {
            line++;

            [content, list] = [list[0], list.slice(1)];

            if (content.match(/^\s*$/g)) {
                continue;
            }

            if (!content.match(/^@[\w]+/g)) {
                accum.push(content);
                continue;
            }

            if (lastRule) {
                rules.push({ content: [lastRule.content, ...accum.splice(0)].join(' '), line: lastRule.line});
            }

            lastRule = { content, line };
        };

        if (lastRule && lastRule.content) {
            rules.push({ content: [lastRule.content, ...accum.splice(0)].join(' '), line: lastRule.line});
        }

        epilogue && epilogue();
        for (let rule of rules) {
            const { line, content } = rule;
            const parts = content.split(' ');
            const ruleName = parts[0].trim().toLowerCase();
            const loc = cloneRange(commentToken.loc);

            // FIXME: dirty hack in order to make the range correct
            loc.start.line += line;
            // loc.start.offset = -1;
            loc.start.column = 3; // hack in order to simulate offset of beginning of the comment line => ' * '
            loc.end.line = loc.start.line;
            // loc.end.offset = loc.start.offset;
            loc.end.column = loc.start.column + parts.join(' ').length;
            handlers[ruleName](parts, ruleName, loc);
        };
        prologue && prologue();
    };
}


// TODO: temp helper
export class CommentExtractor
{
    async parse(document: ITextDocument, includeResolver?: IncludeResolver)
    {
        const tokens = await exractComments(document, includeResolver);
        tokens.forEach((commentToken: IToken) => {
            let comment = commentToken.value.slice(2, -2);
            let list = comment
                .split('\n')
                .map(str => str.replace(/^\s*\*{1,2}\s*|\s*$/g, ''));
    
            let accum: string[] = [];
            let lastRule: { line: number, content: string } = null;
            let content: string;
            let rules: { line: number, content: string }[] = [];
            let line = -1;
            while (list.length) {
                line++;
    
                [content, list] = [list[0], list.slice(1)];
    
                if (content.match(/^\s*$/g)) {
                    continue;
                }
    
                if (!content.match(/^@[\w]+/g)) {
                    accum.push(content);
                    continue;
                }
    
                if (lastRule) {
                    rules.push({ content: [lastRule.content, ...accum.splice(0)].join(' '), line: lastRule.line});
                }
    
                lastRule = { content, line };
            };
    
            if (lastRule && lastRule.content) {
                rules.push({ content: [lastRule.content, ...accum.splice(0)].join(' '), line: lastRule.line});
            }
    
            this.beginComment(content);
            for (let rule of rules) {
                const { line, content } = rule;
                const parts = content.split(' ');
                const ruleName = parts[0].trim().toLowerCase();
                const loc = cloneRange(commentToken.loc);
    
                // FIXME: dirty hack in order to make the range correct
                loc.start.line += line;
                // loc.start.offset = -1;
                loc.start.column = 3; // hack in order to simulate offset of beginning of the comment line => ' * '
                loc.end.line = loc.start.line;
                // loc.end.offset = loc.start.offset;
                loc.end.column = loc.start.column + parts.join(' ').length;
                this.applyRule(ruleName, parts, loc);
            };
            this.endComment();
        });
    }

    beginComment(content: string)
    {

    }

    applyRule(rule: string, parts: string[], loc: IRange)
    {

    }

    endComment()
    {

    }
}

