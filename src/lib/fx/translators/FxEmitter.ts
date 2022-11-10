import { isNull } from "@lib/common";
import { T_INT } from "@lib/fx/analisys/SystemScope";
import { EInstructionTypes, ICompileExprInstruction, IInstruction, IPresetInstruction, ITechniqueInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { IDrawStmtInstruction, IPartFxInstruction, IPartFxPassInstruction, ISpawnStmtInstruction } from "@lib/idl/part/IPartFx";

import { CodeConvolutionEmitter, CodeEmitter, ICodeEmitterOptions } from "./CodeEmitter";


export class FxEmitter extends CodeConvolutionEmitter {
    // aux
    protected tech: ITechniqueInstruction;

    protected emitRoutineProperty(name: string, routine: ICompileExprInstruction) {
        this.emitKeyword(name);
        this.emitKeyword('=');
        this.emitSpace();
        this.emitCompile(routine);
        this.emitChar(';');
        this.emitNewline();
    }


    protected emitStringProperty(name: string, id: string) {
        this.emitKeyword(name),
        this.emitKeyword('='),
        this.emitKeyword(id),
        this.emitChar(';'),
        this.emitNewline()
    }


    protected emitSpawnStmt(stmt: ISpawnStmtInstruction) {
        const fx = <IPartFxInstruction>this.tech;
        const init = stmt.scope.findFunction(stmt.name, [fx.particle, T_INT, ...stmt.args.map(a => a.type)]);
        
        if (this.addFunction(init.instructionID))
            this.emitFunction(init);

        this.emitKeyword(`spawn(${stmt.count})`);
        this.emitKeyword(stmt.name);
        this.emitChar('(');
        this.emitNoSpace();
        stmt.args.forEach((arg, i, list) => {
            this.emitExpression(arg);
            (i + 1 != list.length) && this.emitChar(',');
        });
        this.emitChar(')');
        this.emitChar(';');
    }


    protected emitDrawStmt(stmt: IDrawStmtInstruction) {
        
        this.emitKeyword(`draw`);
        this.emitKeyword(stmt.name);
        this.emitChar('(');
        this.emitNoSpace();
        stmt.args.forEach((arg, i, list) => {
            this.emitExpression(arg);
            (i + 1 != list.length) && this.emitChar(',');
        });
        this.emitChar(')');
        this.emitChar(';');
    }


    emitPartFxDecl(fx: IPartFxInstruction) {
        this.tech = fx;

        this.begin();
        {
            this.emitKeyword('partFx');
            fx.name && this.emitKeyword(fx.name);
            fx.semantic && this.emitSemantic(fx.semantic);
            fx.annotation && this.emitAnnotation(fx.annotation);
            this.emitNewline();
            this.emitChar('{');
            this.push();
            {
                fx.capacity && this.emitStringProperty('Capacity', String(fx.capacity));

                fx.spawnRoutine && this.emitRoutineProperty('SpawnRoutine', fx.spawnRoutine);
                fx.initRoutine && this.emitRoutineProperty('InitRoutine', fx.initRoutine);
                fx.updateRoutine && this.emitRoutineProperty('UpdateRoutine', fx.updateRoutine);

                this.emitNewline();
                fx.passList.forEach((pass, i) => (this.emitPartFxPass(pass),
                    i !== fx.passList.length - 1 && this.emitNewline()));
                this.emitNewline();
                fx.presets.forEach((preset, i) => (this.emitPresetDecl(preset),
                    i !== fx.presets.length - 1 && this.emitNewline()));
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();
    }


    emitTechniqueDecl(fx: ITechniqueInstruction) {
        this.tech = fx;
        this.begin();
        {
            this.emitKeyword('partFx');
            fx.name && this.emitKeyword(fx.name);
            fx.semantic && this.emitSemantic(fx.semantic);
            fx.annotation && this.emitAnnotation(fx.annotation);
            this.emitNewline();
            this.emitChar('{');
            this.push();
            {
                this.emitNewline();
                fx.passList.forEach((pass, i) => (this.emitPass(pass),
                    i !== fx.passList.length - 1 && this.emitNewline()));
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();
    }


    emitPartFxPass(pass: IPartFxPassInstruction) {
        this.emitKeyword('pass');
        pass.name && this.emitKeyword(pass.name);
        this.emitNewline();
        this.emitChar('{');
        this.push();
        {
            pass.prerenderRoutine && this.emitRoutineProperty('PrerenderRoutine', pass.prerenderRoutine);
            pass.sorting && this.emitStringProperty('Sorting', String(pass.sorting));
            this.emitStringProperty('Geometry', `"${pass.geometry}"`);
            pass.instanceCount !== 1 && this.emitStringProperty('InstanceCount', String(pass.instanceCount));

            super.emitPassBody(pass);
        }
        this.pop();
        this.emitChar('}');
        this.emitNewline();
    }


    emitPresetDecl(preset: IPresetInstruction) {
        this.emitKeyword('preset');
        preset.name && this.emitKeyword(preset.name);
        this.emitNewline();
        this.emitChar('{');
        this.push();
        {
            preset.props.forEach(prop => {
                this.emitKeyword(prop.id.name);
                this.emitKeyword('=');
                this.emitKeyword('{');
                this.emitExpressionList(prop.args);
                this.emitKeyword('}');
                this.emitChar(';');
                this.emitNewline();
            });
        }
        this.pop();
        this.emitChar('}');
        this.emitNewline();
    }


    emitStmt(stmt: IInstruction) {
        switch (stmt.instructionType) {
            case EInstructionTypes.k_SpawnStmt:
                this.emitSpawnStmt(stmt as ISpawnStmtInstruction);
                break;
            case EInstructionTypes.k_DrawStmt:
                this.emitDrawStmt(stmt as IDrawStmtInstruction);
                break;
            default:
                super.emitStmt(stmt);
        }
    }


    emit(instr: IInstruction): CodeEmitter {
        if (!instr) {
            return this;
        }

        switch (instr.instructionType) {
            case EInstructionTypes.k_PartFxDecl:
                this.emitPartFxDecl(instr as IPartFxInstruction);
                break;
            case EInstructionTypes.k_TechniqueDecl:
                this.emitTechniqueDecl(instr as ITechniqueInstruction);
                break;
            default:
                super.emit(instr)
        }

        return this;
    }
}

export function translate(instr: IInstruction, opts?: ICodeEmitterOptions): string {
    const emitter = new FxEmitter(null, null, opts);
    emitter.emit(instr);
    return emitter.toString();
}

export function translateDocument(document: ISLDocument): string {
    if (isNull(document)) {
        return '';
    }

    if (isNull(document.root)) {
        return '';
    }

    return translate(document.root);
}

export function translateTechnique(document: ISLDocument, techName: string): string {
    if (isNull(document)) {
        return '';
    }

    if (isNull(document.root)) {
        return '';
    }

    return translate(document.root.scope.findTechnique(techName));
}


