/* tslint:disable:no-for-in */
/* tslint:disable:forin */
/* tslint:disable:typedef */

import { isNull } from '@lib/common';
import { EInstructionTypes, ETechniqueType, IScope } from '@lib/idl/IInstruction';
import { IParseNode, IRange } from '@lib/idl/parser/IParser';
import { IPartFxInstruction } from '@lib/idl/part/IPartFx';
import * as monaco from 'monaco-editor';

const timer = (delay) => new Promise(done => { setTimeout(done, delay); });


export class MyCodeLensProvider implements monaco.languages.CodeLensProvider {

    constructor(protected getScope: () => IScope) {

    }

    async provideCodeLenses(model: monaco.editor.ITextModel, token: monaco.CancellationToken)
        // : Promise<any>
        : Promise<monaco.languages.CodeLensList>
    // : monaco.languages.ProviderResult<monaco.languages.CodeLensList> 
    {
        // fixme: hack for sync between editor and analisys results
        await timer(500); // << waiting for parsing completing

        let lenses = [];
        let scope = this.getScope();
        let range: monaco.Range;
        let loc: IRange;
        let sourceNode: IParseNode;

        if (!isNull(scope)) {
            for (const techniqueName in scope.techniqueMap) {
                const technique = scope.techniqueMap[techniqueName];
                if (technique.type === ETechniqueType.k_PartFx) {
                    const partFx = <IPartFxInstruction>technique;

                    if (partFx.spawnRoutine) {
                        sourceNode = partFx.spawnRoutine.function.def.sourceNode;
                        loc = sourceNode.loc;

                        range = monaco.Range.fromPositions({ lineNumber: loc.start.line + 1, column: loc.start.column + 1 });
                        lenses.push({ range, command: { id: null, title: `[spawn routine]` } });
                    }

                    if (partFx.initRoutine) {
                        sourceNode = partFx.initRoutine.function.def.sourceNode;
                        loc = sourceNode.loc;

                        range = monaco.Range.fromPositions({ lineNumber: loc.start.line + 1, column: loc.start.column + 1 });
                        lenses.push({ range, command: { id: null, title: `[init routine]` } });
                    }

                    if (partFx.updateRoutine) {
                        sourceNode = partFx.updateRoutine.function.def.sourceNode;
                        loc = sourceNode.loc;

                        range = monaco.Range.fromPositions({ lineNumber: loc.start.line + 1, column: loc.start.column + 1 });
                        lenses.push({ range, command: { id: null, title: `[update routine]` } });
                    }

                    if (partFx.particle &&
                        partFx.particle.instructionType !== EInstructionTypes.k_SystemType) {
                        sourceNode = partFx.particle.sourceNode;
                        loc = sourceNode.loc;

                        range = monaco.Range.fromPositions({ lineNumber: loc.start.line + 1, column: loc.start.column + 1 });
                        lenses.push({ range, command: { id: null, title: `[particle]` } });
                    }

                    for (let pass of partFx.passList) {
                        if (pass.prerenderRoutine) {
                            sourceNode = pass.prerenderRoutine.function.def.sourceNode;
                            loc = sourceNode.loc;

                            range = monaco.Range.fromPositions({ lineNumber: loc.start.line + 1, column: loc.start.column + 1 });
                            lenses.push({ range, command: { id: null, title: `[prerender routine]` } });

                            sourceNode = pass.particleInstance.sourceNode;
                            loc = sourceNode.loc;
                            range = monaco.Range.fromPositions({ lineNumber: loc.start.line + 1, column: loc.start.column + 1 });
                            lenses.push({ range, command: { id: null, title: `[material]` } });
                        }
                    }
                }
            }

        }
        // let lenses = this.getBreakpoints().map(brk => {
        //     let range = new monaco.Range(brk + 1, 5, brk + 1, 5);
        //     return {
        //         range,
        //         ...c
        //     }
        // });

        return {
            lenses,
            dispose() {
                // console.log('disposed!');
            }
        };
    }

    onDidChange() {
        // console.log('on did change');
        return {
            dispose() {
                // console.log('onDidChange() => dispose()');
            }
        }
    }
}