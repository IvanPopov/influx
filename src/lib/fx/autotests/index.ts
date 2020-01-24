import { assert, isEmpty, isNull } from "@lib/common";
import * as Bytecode from '@lib/fx/bytecode';
import * as VM from '@lib/fx/bytecode/VM';
import { createFXSLDocument } from "@lib/fx/FXSLDocument";
import { IScope } from "@lib/idl/IInstruction";
import { ITextDocument } from "@lib/idl/ITextDocument";
import { ETokenType, IRange, IToken } from "@lib/idl/parser/IParser";
import { Lexer } from "@lib/parser/Lexer";
import { END_SYMBOL } from "@lib/parser/symbols";
import { cloneRange } from "@lib/parser/util";

import { u8ArrayAsI32 } from "../bytecode/common";
import { ISLDocument } from "@lib/idl/ISLDocument";

function nativeFromString(str) {
    switch(str.toLowerCase()) {
        case 'true': return true;
        case 'false': return false;
        default:
            return Number(str) || 0;
    }
}

function exractComments(document: ITextDocument): IToken[] {
    const lexer = new Lexer({ skipComments: false });
    lexer.setTextDocument(document);

    let comments = [];
    let token: IToken;
    while((token = lexer.getNextToken()).value !== END_SYMBOL) {
        if (token.type === ETokenType.k_MultilineCommentLiteral) {
            comments.push(token);
        }
    }
    return comments;
}

export interface ITestCase {
    expr: string;
    expected: number | boolean;
    loc: IRange;
    passed?: boolean;
    note?: string;
}

export interface ITest {
    name: string;
    cases: ITestCase[];
    loc: IRange;
    passed?: boolean;
}

export interface IAutotests {
    description: string;
    document: ISLDocument;
    tests: ITest[];
    passed?: boolean;
}

/**
 * 
 * @param source SL text document with test markup inside.
 */
export async function parse(textDocument: ITextDocument): Promise<IAutotests> {
    let description = null;
    let tests = [];

    // NOTE: temp solution (until the parser gets comment support)
    exractComments(textDocument).forEach((commentToken: IToken) => {
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

        let test: ITest = null;

        error:
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

            switch (ruleName) {
                case '@autotests':
                    assert(isNull(description));
                    description = parts.slice(1).join(' ');
                    break;
                case '@test':
                    assert(isNull(test));
                    if (test) {
                        break error;
                    }
                    test = { 
                        name: parts.slice(1).join(' '),
                        cases: [],
                        loc
                    };
                    break;
                case '@expected':
                    assert(!isNull(test));
                    if (!test) {
                        break error;
                    }
                    let [expr, expectedString] = parts.slice(1).join(' ').trim().slice(1, -1).split('==').map(str => str.trim());
                    assert(expr && expectedString);
                    
                    let expected = nativeFromString(expectedString);

                    test.cases.push({ expr, expected, loc });
                    break;
            }
        };

        if (test) {
            tests.push(test);
        }
    });

    const document = await createFXSLDocument(textDocument);
    return { description, document, tests };
}


async function runTest(test: ITest, document: ISLDocument) {
    const { cases } = test;
    for (let exam of cases) {
        const { expr, expected } = exam;
        const result = await VM.evaluate(expr, document);
        exam.passed = result === expected;
        if (!exam.passed) {
            exam.note = `Test failed. Expected is '${expected}', but given is '${result}'`;
        }
    }

    test.passed = cases.reduce((acc, exam) => (acc && exam.passed), true);
}


export async function run(autotests: IAutotests) {
    autotests.passed = true;
    for (const test of autotests.tests) {
        await runTest(test, autotests.document);
        autotests.passed = autotests.passed && test.passed;
    }
}
