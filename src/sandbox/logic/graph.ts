import { extendFXSLDocument } from '@lib/fx/FXSLDocument';
import { extendSLDocument } from '@lib/fx/SLDocument';
import { createTextDocument } from '@lib/fx/TextDocument';
import * as FxEmitter from '@lib/fx/translators/FxEmitter';
import { Diagnostics } from '@lib/util/Diagnostics';
import { sourceCode } from '@sandbox/actions';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IGraphCompile } from '@sandbox/actions/ActionTypes';
import { PART_STRUCTURE_SL_DOCUMENT } from '@sandbox/components/graph/autogen';
import { IGraphASTFinalNode } from '@sandbox/components/graph/IGraph';
import { EffectTemplateHLSL } from '../components/graph/lib';
import IStoreState from '@sandbox/store/IStoreState';
import { createLogic } from 'redux-logic';

const compileLogic = createLogic<IStoreState, IGraphCompile['payload']>({
    type: [evt.GRAPH_COMPILE],
    latest: true,
    debounce: 500,

    async process({ getState, action }, dispatch, done) {
        console.log(action);
        console.log('graph compile!');

        const { graph } = action.payload;

        const spawn = graph.findNodeByTitle("Spawn Routine") as IGraphASTFinalNode;
        const init = graph.findNodeByTitle("Init Routine") as IGraphASTFinalNode;
        const update = graph.findNodeByTitle("Update Routine") as IGraphASTFinalNode;

        let doc = await extendSLDocument(null, PART_STRUCTURE_SL_DOCUMENT);
        doc = await spawn.evaluate(doc);
        doc = await init.evaluate(doc);
        doc = await update.evaluate(doc);

        doc = await extendFXSLDocument(createTextDocument("://fx-template", EffectTemplateHLSL), doc);

        let content = Diagnostics.stringify(doc.diagnosticReport);
        console.log(content);

        dispatch(sourceCode.setContent(FxEmitter.translateDocument(doc)));
        // (props as any).$dispatch({ type: 'source-code-analysis-complete', payload: { result: doc } }); // to run preprocessed document
        // (props as any).$dispatch({ type: evt.SOURCE_FILE_LOADED, payload: { content: FxEmitter.translateDocument(doc) } }); // to update effect content

        done();
    }
});

const resetLogic = createLogic<IStoreState>({
    type: [evt.GRAPH_RESET],

    async process({ getState, action }, dispatch, done) {
        // const parserParams = getState().parserParams;
        console.log('graph reset!');
        done();
    }
});

export default [
    resetLogic,
    compileLogic
];
