import { isNull } from "@lib/common";
import { EInstructionTypes, ETechniqueType } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { IRange } from "@lib/idl/parser/IParser";
import { IPartFxInstruction } from "@lib/idl/part/IPartFx";
import { CodeLens, Command, Position, Range, TextDocument } from "vscode-languageserver-types";

export class FXCodeLenses {
    doProvide(textDocument: TextDocument, slDocument: ISLDocument): CodeLens[] {
        if (!slDocument) {
            return [];
        }

        const lenses: CodeLens[] = [];
        const scope = slDocument.root.scope;

        /**
         * Just a draft code :)
         */

        const createCodeLens = (name: string, loc: IRange): CodeLens => {
            const pos = Position.create(loc.start.line, loc.start.column);
            const range = Range.create(pos, pos);
            const lens = CodeLens.create(range);
            lens.command = Command.create(name, null);
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

        return lenses;
    }
}
