import * as FxAnalyzer from '@lib/fx/Analyzer';
import { EffectParser } from '@lib/fx/EffectParser';
import { EParseMode, EParserType, IParserParams } from '@lib/idl/parser/IParser';
import { Parser } from '@lib/parser/Parser';
import { Diagnostics } from '@lib/util/Diagnostics';

/* tslint:disable:typedef */
/* tslint:disable:no-empty */

// supress all console messages for debugging/development purposes
// (self as any).console = {
//     log() { },
//     warn() { },
//     error() { },
//     time() { },
//     timeEnd() { },
//     assert() { }
// };

const ctx: Worker = self as any;


async function validate(text: string, uri: string): Promise<void> {
    const parsingResults = await Parser.parse(text, uri);
    const semanticResults = FxAnalyzer.analyze(parsingResults.ast, uri);

    const diag = Diagnostics.mergeReports([parsingResults.diag, semanticResults.diag]);

    ctx.postMessage({ type: 'validation', payload: diag.messages });
}

ctx.onmessage = (event) => {
    const data = event.data;
    const { type, payload } = data;
    switch (type) {
        case 'install':
            Parser.init(<IParserParams>payload, EffectParser);
            break;
        case 'validation':
            validate(payload.text, payload.uri);
            break;
        default:
    }
};


