import { assert, isEmpty, isNull } from "@lib/common";
import * as VM from '@lib/fx/bytecode/VM';
import { ITextDocument } from "@lib/idl/ITextDocument";
import { exractComments, parseComment } from "@lib/parser/helpers";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { IRange } from "@lib/idl/parser/IParser";
import { createSyncFXSLDocument } from "@lib/fx/FXSLDocument";

function nativeFromString(str) {
    switch(str.toLowerCase()) {
        case 'true': return true;
        case 'false': return false;
        default:
            return Number(str) || 0;
    }
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
    let test: ITest;

    let rules = {
        '@autotests': (parts: string[], name: string, loc: IRange) => {
            assert(isNull(description));
            description = parts.slice(1).join(' ');
        },
        '@test': (parts: string[], name: string, loc: IRange) => {
            assert(isNull(test));
            if (test) {
                return;
            }
            test = { 
                name: parts.slice(1).join(' '),
                cases: [],
                loc
            };
        },
        '@expected': (parts: string[], name: string, loc: IRange) => {
            assert(!isNull(test));
            if (!test) {
                return;
            }
            let [expr, expectedString] = parts.slice(1).join(' ').trim().slice(1, -1).split('==').map(str => str.trim());
            assert(expr && expectedString);
            
            let expected = nativeFromString(expectedString);

            test.cases.push({ expr, expected, loc });
        }
    };

    let epilogue = () => {
        test = null;
    };
    let prologue = () => {
        if (test) {
            tests.push(test);
        }
    };

    exractComments(textDocument).forEach(parseComment(rules, epilogue, prologue));

    const document = createSyncFXSLDocument(textDocument);
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
