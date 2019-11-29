import { isNull } from '@lib/common';
import { EffectParser } from '@lib/fx/EffectParser';
import * as FxAnalyzer from '@lib/fx/FxAnalyzer';
import { EInstructionTypes, ETechniqueType, IInstructionCollector, IScope } from '@lib/idl/IInstruction';
import { EParseMode, EParserType, IParseNode, IParserParams, IRange } from '@lib/idl/parser/IParser';
import { IPartFxInstruction } from '@lib/idl/part/IPartFx';
import { Parser } from '@lib/parser/Parser';
import { Diagnostics } from '@lib/util/Diagnostics';
import { CodeLens, Command, Position, Range } from 'vscode-languageserver-types';

/* tslint:disable:typedef */
/* tslint:disable:no-empty */
/* tslint:disable:forin */
/* tslint:disable:no-for-in */

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


const documents: { [uri: string]: { root: IInstructionCollector, scope: IScope } } = {};

async function validate(text: string, uri: string): Promise<void> {
    const parsingResults = await Parser.parse(text, uri);
    const semanticResults = FxAnalyzer.analyze(parsingResults.ast, uri);

    const diag = Diagnostics.mergeReports([parsingResults.diag, semanticResults.diag]);

    // set document cache
    documents[uri] = { root: semanticResults.root, scope: semanticResults.scope };

    ctx.postMessage({ type: 'validation', payload: diag.messages });
}


async function provideCodeLenses(uri: string): Promise<void> {
    const lenses: CodeLens[] = [];

    if (!documents[uri]) {
        ctx.postMessage({ type: 'provide-code-lenses', payload: lenses });
        return;
    }

    const root = documents[uri].root;
    const scope = documents[uri].scope;

    if (!root) {
        ctx.postMessage({ type: 'provide-code-lenses', payload: lenses });
        return;
    }


    /**
     * Just a draft code :)
     */

    const createCodeLens = (name: string, loc: IRange): CodeLens  => {
        const pos = Position.create(loc.start.line, loc.start.column);
        const range = Range.create(pos, pos);
        const lens = CodeLens.create(range);
        lens.command = Command.create(`[spawn routine]`, null);
        return lens;
    };

    if (!isNull(scope)) {
        for (const techniqueName in scope.techniqueMap) {
            const technique = scope.techniqueMap[techniqueName];
            if (technique.type === ETechniqueType.k_PartFx) {
                const partFx = <IPartFxInstruction>technique;

                if (partFx.spawnRoutine) {
                    const sourceNode = partFx.spawnRoutine.function.def.sourceNode;
                    lenses.push(createCodeLens(`[spawn routine]`, sourceNode.loc));
                }

                if (partFx.initRoutine) {
                    const sourceNode = partFx.initRoutine.function.def.sourceNode;
                    lenses.push(createCodeLens(`[init routine]`, sourceNode.loc));
                }

                if (partFx.updateRoutine) {
                    const sourceNode = partFx.updateRoutine.function.def.sourceNode;
                    lenses.push(createCodeLens(`[update routine]`, sourceNode.loc));
                }

                if (partFx.particle &&
                    partFx.particle.instructionType !== EInstructionTypes.k_SystemType) {
                    const sourceNode = partFx.particle.sourceNode;
                    lenses.push(createCodeLens(`[particle]`, sourceNode.loc));
                }

                for (const pass of partFx.passList) {
                    if (pass.prerenderRoutine) {
                        {
                            const sourceNode = pass.prerenderRoutine.function.def.sourceNode;
                            lenses.push(createCodeLens(`[prerender routine]`, sourceNode.loc));
                        }
                        {
                            const sourceNode = pass.particleInstance.sourceNode;
                            lenses.push(createCodeLens(`[material]`, sourceNode.loc));
                        }
                    }
                }
            }
        }

    }

    ctx.postMessage({ type: 'provide-code-lenses', payload: lenses });
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
        case 'provide-code-lenses':
            provideCodeLenses(payload.uri);
            break;
        default:
    }
};


