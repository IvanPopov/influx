import { assert, isDefAndNotNull, isNull } from "@lib/common";
import { T_INT } from "@lib/fx/analisys/SystemScope";
import { EInstructionTypes, ICompileExprInstruction, IInstruction, IPresetInstruction, ITechniqueInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { IDrawStmtInstruction, IPartFxInstruction, IPartFxPassInstruction, ISpawnStmtInstruction } from "@lib/idl/part/IPartFx";

import { CodeConvolutionContext, CodeConvolutionEmitter } from "./CodeConvolutionEmitter";


export class FxContext extends CodeConvolutionContext {
    protected technique?: ITechniqueInstruction = null;


    tech(): ITechniqueInstruction {
        return this.technique;
    }


    beginTechnique(tech: ITechniqueInstruction) {
        assert(isNull(this.technique));
        this.technique = tech;
    }


    endTechnique() {
        assert(isDefAndNotNull(this.technique));
        this.technique = null;
    }
}

export class FxEmitter<ContextT extends FxContext> extends CodeConvolutionEmitter<ContextT> {
    protected emitRoutineProperty(ctx: ContextT, name: string, routine: ICompileExprInstruction) {
        this.emitKeyword(name);
        this.emitKeyword('=');
        this.emitSpace();
        this.emitCompile(ctx, routine);
        this.emitChar(';');
        this.emitNewline();
    }


    protected emitStringProperty(ctx: ContextT, name: string, id: string) {
        this.emitKeyword(name),
            this.emitKeyword('='),
            this.emitKeyword(id),
            this.emitChar(';'),
            this.emitNewline()
    }


    protected emitSpawnStmt(ctx: ContextT, stmt: ISpawnStmtInstruction) {
        const fx = <IPartFxInstruction>ctx.tech();
        const init = stmt.scope.findFunction(stmt.name, [fx.particle, T_INT, ...stmt.args.map(a => a.type)]);

        this.emitFunction(ctx, init);

        this.emitKeyword(`spawn(${stmt.count})`);
        this.emitKeyword(stmt.name);
        this.emitChar('(');
        this.emitNoSpace();
        stmt.args.forEach((arg, i, list) => {
            this.emitExpression(ctx, arg);
            (i + 1 != list.length) && this.emitChar(',');
        });
        this.emitChar(')');
        this.emitChar(';');
    }


    protected emitDrawStmt(ctx: ContextT, stmt: IDrawStmtInstruction) {

        this.emitKeyword(`draw`);
        this.emitKeyword(stmt.name);
        this.emitChar('(');
        this.emitNoSpace();
        stmt.args.forEach((arg, i, list) => {
            this.emitExpression(ctx, arg);
            (i + 1 != list.length) && this.emitChar(',');
        });
        this.emitChar(')');
        this.emitChar(';');
    }


    emitPartFxDecl(ctx: ContextT, fx: IPartFxInstruction) {
        ctx.beginTechnique(fx);

        this.begin();
        {
            this.emitKeyword('partFx');
            fx.name && this.emitKeyword(fx.name);
            fx.semantic && this.emitSemantic(ctx, fx.semantic);
            fx.annotation && this.emitAnnotation(ctx, fx.annotation);
            this.emitNewline();
            this.emitChar('{');
            this.push();
            {
                fx.capacity && this.emitStringProperty(ctx, 'Capacity', String(fx.capacity));

                fx.spawnRoutine && this.emitRoutineProperty(ctx, 'SpawnRoutine', fx.spawnRoutine);
                fx.initRoutine && this.emitRoutineProperty(ctx, 'InitRoutine', fx.initRoutine);
                fx.updateRoutine && this.emitRoutineProperty(ctx, 'UpdateRoutine', fx.updateRoutine);

                this.emitNewline();
                fx.passList.forEach((pass, i) => (this.emitPartFxPass(ctx, pass),
                    i !== fx.passList.length - 1 && this.emitNewline()));
                this.emitNewline();
                fx.presets.forEach((preset, i) => (this.emitPresetDecl(ctx, preset),
                    i !== fx.presets.length - 1 && this.emitNewline()));
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();

        ctx.endTechnique();
    }


    emitTechniqueDecl(ctx: ContextT, fx: ITechniqueInstruction) {
        ctx.beginTechnique(fx);
        this.begin();
        {
            this.emitKeyword('technique');
            fx.name && this.emitKeyword(fx.name);
            fx.semantic && this.emitSemantic(ctx, fx.semantic);
            fx.annotation && this.emitAnnotation(ctx, fx.annotation);
            this.emitNewline();
            this.emitChar('{');
            this.push();
            {
                this.emitNewline();
                fx.passList.forEach((pass, i) => (this.emitPass(ctx, pass),
                    i !== fx.passList.length - 1 && this.emitNewline()));
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();
        ctx.endTechnique();
    }


    emitPartFxPass(ctx: ContextT, pass: IPartFxPassInstruction) {
        this.emitKeyword('pass');
        pass.name && this.emitKeyword(pass.name);
        this.emitNewline();
        this.emitChar('{');
        this.push();
        {
            pass.prerenderRoutine && this.emitRoutineProperty(ctx, 'PrerenderRoutine', pass.prerenderRoutine);
            pass.sorting && this.emitStringProperty(ctx, 'Sorting', String(pass.sorting));
            this.emitStringProperty(ctx, 'Geometry', `"${pass.geometry}"`);
            pass.instanceCount !== 1 && this.emitStringProperty(ctx, 'InstanceCount', String(pass.instanceCount));

            super.emitPassBody(ctx, pass);
        }
        this.pop();
        this.emitChar('}');
        this.emitNewline();
    }


    emitPresetDecl(ctx: ContextT, preset: IPresetInstruction) {
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
                this.emitExpressionList(ctx, prop.args);
                this.emitKeyword('}');
                this.emitChar(';');
                this.emitNewline();
            });
        }
        this.pop();
        this.emitChar('}');
        this.emitNewline();
    }


    emitStmt(ctx: ContextT, stmt: IInstruction) {
        switch (stmt.instructionType) {
            case EInstructionTypes.k_SpawnStmt:
                this.emitSpawnStmt(ctx, stmt as ISpawnStmtInstruction);
                break;
            case EInstructionTypes.k_DrawStmt:
                this.emitDrawStmt(ctx, stmt as IDrawStmtInstruction);
                break;
            default:
                super.emitStmt(ctx, stmt);
        }
    }


    emit(ctx: ContextT, instr: IInstruction): FxEmitter<ContextT> {
        if (!instr) {
            return this;
        }

        switch (instr.instructionType) {
            case EInstructionTypes.k_PartFxDecl:
                this.emitPartFxDecl(ctx, instr as IPartFxInstruction);
                break;
            case EInstructionTypes.k_TechniqueDecl:
                this.emitTechniqueDecl(ctx, instr as ITechniqueInstruction);
                break;
            default:
                super.emit(ctx, instr)
        }

        return this;
    }


    private static fxEmitter = new FxEmitter({ omitEmptyParams: true });


    static translate(instr: IInstruction, ctx: FxContext = new FxContext): string {
        return FxEmitter.fxEmitter.emit(ctx, instr).toString(ctx);
    }


    static translateDocument(document: ISLDocument, ctx: FxContext = new FxContext): string {
        if (isNull(document)) {
            return '';
        }
        if (isNull(document.root)) {
            return '';
        }
        return FxEmitter.translate(document.root, ctx);
    }


    static translateTechnique(document: ISLDocument, techName: string, ctx: FxContext = new FxContext): string {
        if (isNull(document)) {
            return '';
        }
        if (isNull(document.root)) {
            return '';
        }
        return FxEmitter.translate(document.root.scope.findTechnique(techName), ctx);
    }
}

