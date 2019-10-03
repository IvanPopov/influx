
import { EffectParser } from '@lib/fx/EffectParser';
import { Diagnostics } from '@lib/util/Diagnostics';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import IStoreState, { IParserParams } from '@sandbox/store/IStoreState';
import { createLogic } from 'redux-logic';

function deepEqual(a: Object, b: Object): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

let parser: EffectParser = null;
let parserParamsLast: IParserParams = null;

async function createParser(parserParams: IParserParams) {
    const { grammar, mode, type } = parserParams;

    if (!grammar) {
        return;
    }

    const parserChanged = !deepEqual(parserParams, parserParamsLast);

    if (!parserChanged) {
        return;
    }

    console.log('%c Creating parser....', 'background: #222; color: #bada55');
    parserParamsLast = parserParams;
    parser = new EffectParser();
    
    if (!parser.init(grammar, mode, type)) {
        console.error('Could not initialize parser!');
        parser = null;
    } else {
        console.log('%c [ DONE ]', 'background: #222; color: #bada55');
    }
}


function cleanupSyntaxErrors(state, dispatch) {
    for (let name in state.sourceFile.markers) {
        if (name.startsWith('syntax-error-')) {
            dispatch({ type: evt.SOURCE_CODE_REMOVE_MARKER, payload: { name } });
        }
    }
}


function emitSyntaxErrors(errors, dispatch) {
    errors.forEach(err => {
        let { loc, message } = err;
        let marker = {
            name: `syntax-error-${message}`,
            range: loc,
            type: 'error',
            tooltip: message
        };
        dispatch({ type: evt.SOURCE_CODE_ADD_MARKER, payload: marker });
    })
}


async function parse(state: IStoreState, dispatch): Promise<void> {
    const { content, filename } = state.sourceFile;

    cleanupSyntaxErrors(state, dispatch);

    if (!content || !parser) {
        return;
    }

    parser.setParseFileName(filename);

    // All diagnostic exceptions should be already handled inside parser.
    let res = await parser.parse(content);

    let report = parser.getDiagnostics();
    let errors = report.messages.map(mesg => ({ loc: Diagnostics.asRange(mesg), message: mesg.content }));

    emitSyntaxErrors(errors, dispatch);

    console.log(Diagnostics.stringify(parser.getDiagnostics()));

    // if (res == EParserCode.k_Ok) {}
    dispatch({ type: evt.SOURCE_CODE_PARSE_TREE_CHANGED, payload: { parseTree: parser.getSyntaxTree() } });
}


const updateParserLogic = createLogic<IStoreState>({
    type: [evt.GRAMMAR_CONTENT_SPECIFIED, evt.GRAMMAR_FILE_SPECIFIED, evt.PARSER_PARAMS_CHANGED],

    async process({ getState, action }, dispatch, done) {
        let parserParams = getState().parserParams;

        await createParser(parserParams);
        done();
    }
});


const updateSourceContentLogic = createLogic<IStoreState>({
    type: [evt.SOURCE_CODE_MODIFED, evt.SOURCE_FILE_LOADED],
    latest: true,
    debounce: 500,

    async process({ getState }, dispatch, done) {
        await parse(getState(), dispatch);
        done();
    }
});


// const markerLogic = createLogic<IStoreState>({
//     type: [evt.SOURCE_CODE_ADD_MARKER, evt.SOURCE_CODE_REMOVE_MARKER],
//     debounce: 500
// });


export default [
    updateParserLogic, 
    updateSourceContentLogic, 
    // markerLogic
];