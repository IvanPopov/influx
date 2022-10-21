import { EInstructionTypes, IFunctionDeclInstruction, IIdExprInstruction, IInstruction, IVariableDeclInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";
import { BaseEmitter } from "./BaseEmitter";

import { CodeEmitter, ICodeEmitterOptions } from "./CodeEmitter";

function asScreamingSnake(name) {
    let s = '';
    for (let c of name) {
        let C = c.toUpperCase();
        let ul = s && (c === C);
        if (ul) s += '_';
        s += C;
    }
    return s;
}

const seqNames = (name, from, to) => Array(to - from).fill(0).map((x, i) => `${name}${from + i}`);

export class S3DEmitter extends CodeEmitter {
    protected cbuffer: IVariableDeclInstruction[] = [];
    protected VSOut: IVariableTypeInstruction = null;
    protected shaderName = 'shader_name';

    static SECTION_REGISTERS = 'registers';
    static SECTION_VSOUT = 'vsout';
    static SECTION_ADAPTER = 'adapter';
    static SECTION_PROLOGUE = 'prologue';

    emitUniform(decl: IVariableDeclInstruction) {
        const { cbuffer } = this;

        if (cbuffer.includes(decl)) {
            return;
        }

        // todo: emit paddings info
        cbuffer.push(decl);
    }

    emitNonUniform(decl: IVariableDeclInstruction) {
        this.begin();
        this.emitStmt(decl);
        this.end();
    }

    // filter all global variables which have to be addressed to global cbuffer
    emitGlobal(decl: IVariableDeclInstruction) {

        const { type } = decl;

        if (!decl.isGlobal()) {
            // const isVSInput = this.mode == 'vertex'
            //     && this.isMain()
            //     && decl.isParameter()
            //     && !type.isUniform();

            // if (isVSInput)

            // it is assumed that local variables have already gone through statement emission
            return;
        }


        if (type.isStatic()) {
            this.emitNonUniform(decl);
            return;
        }

        this.emitUniform(decl);
    }

    emitIdentifier(id: IIdExprInstruction) {
        const { decl, name } = id;

        this.emitGlobal(decl);
        this.emitKeyword(name);
    }


    emitRegisters() {
        this.begin(S3DEmitter.SECTION_REGISTERS);

        // prologue

        this.emitLine(`#include <sys_resource_defines.fx>`);
        this.emitNewline(2);

        // global cb

        // todo: fill correct usages
        this.emitLine(`DECLARE_CBV(CB_${this.shaderName.toUpperCase()}_DATA, 10, PER_DRAW_CB_SET, USAGE_PS|USAGE_VS)`)
        this.emitChar('{');
        this.push();

        for (let decl of this.cbuffer) {
            const { name, type } = decl;
            const { typeName, length, usage } = this.resolveType(type);

            // todo: emit usages like 'precise'
            // usage && this.emitKeyword(usage);

            this.emitKeyword(typeName);
            this.emitKeyword(name);
            length && this.emitChar(`[${length}]`);

            this.emitChar(';');
            this.emitNewline();
        }

        this.pop();
        this.emitChar('}');
        this.emitChar(';');

        // trick: move to the beginning of block list
        this.end(true);
    }


    validateSemantic(semantic: string) {
        const KNOWN_SEMANTICS = [
            'POSITION',
            'NORMAL',
            'COLOR',
            'TEXCOORD',
            'TANGENT',
            ...seqNames('POSITION', 0, 5),
            ...seqNames('NORMAL', 0, 5),
            ...seqNames('COLOR', 0, 5),
            ...seqNames('TEXCOORD', 0, 5),
            ...seqNames('TANGENT', 0, 5)
        ];
        return KNOWN_SEMANTICS.includes(semantic);
    }

    // COLOR => COLOR0
    normalizeSemantic(semantic: string): string {
        const EXCEPTIONS = [ 'POSITION', 'NORMAL', 'BLENDWEIGHT', 'TANGENT' ];
        const base = semantic.match(/[A-Z0-9]+[A-Z]/g)?.[0] || semantic;
        const idx = semantic.substring(base.length);
        const isExcept = EXCEPTIONS.includes(base);
        const isSeq = base != semantic;
        if (!isExcept && !isSeq) {
            return `${semantic}0`;
        }
        if (isExcept && isSeq && idx === '0') {
            return base;
        }
        return semantic;
    }

    semanticToInputName(semantic: string) {
        semantic = this.normalizeSemantic(semantic);

        // synced with sys_input.fx
        const SEMANTIC_TO_VSINPUT_NAME = {
            'POSITION': 'Pos',
            'NORMAL': 'Norm',

            'TANGENT': 'Tang',
            'TANGENT1': 'Tang1',
            'TANGENT2': 'Tang2',
            'TANGENT3': 'Tang3',

            'COLOR0': 'Col0',
            'COLOR1': 'Col1',
            'COLOR2': 'Col2',
            'COLOR3': 'Col3',
            'COLOR4': 'Col4',
            'COLOR5': 'Col5',

            'TEXCOORD0': 'Tex0',
            'TEXCOORD1': 'Tex1',
            'TEXCOORD2': 'Tex2',
            'TEXCOORD3': 'Tex3',
            'TEXCOORD4': 'Tex4',
            'TEXCOORD5': 'Tex5'
        };

        return SEMANTIC_TO_VSINPUT_NAME[semantic] || null;
    }


    emitVSOutput(type: IVariableTypeInstruction) {
        console.assert(type.hasFieldWithSematics('POSITION'));

        const sname = `${this.shaderName.toUpperCase()}_VS_OUTPUT`;

        this.begin(S3DEmitter.SECTION_VSOUT);
        this.emitLine(`struct ${sname}`);
        this.emitChar('{');
        this.push();
        {
            this.emitLine(`#define INTERPOLATION_STRUCT ${sname}`);
            const fields = type.fields.filter(f => this.normalizeSemantic(f.semantic) !== 'POSITION');

            for (let field of fields) {
                this.validateSemantic(field.semantic);
                this.emitLine(`DECLARE_INTERPOLATOR(${field.type.name}, ${field.name}, ${field.semantic});`);
            }
        }
        this.pop();
        this.emitChar('}');
        this.emitChar(';');
        this.end();

        this.begin();
        this.emitLine(`struct VS_OUTPUT`);
        this.emitNewline();
        this.emitChar('{');
        this.push();
        {
            this.emitLine(`DECLARE_INTERPOLATOR(float4, Pos, SV_POSITION);`);
            this.emitLine(`#ifdef INTERPOLATION_STRUCT`);
            this.push();
            {
                this.emitLine(`INTERPOLATION_STRUCT ${this.shaderName.toLowerCase()}_out;`);
            }
            this.pop();
            this.emitLine(`#endif`);
        }
        this.pop();
        this.emitChar('}');
        this.emitChar(';');
        this.end();
    }


    emitPrologue() {
        const vs = this.mode === 'vertex';
        const ps = this.mode === 'pixel';
    
        this.begin(S3DEmitter.SECTION_PROLOGUE);
        this.emitLine(`#include <common.${vs ? 'vsh' : 'fx'}>`);
        this.emitLine(`#include <input_output_defines.fx>`);
        this.end();
    }



    emitVSAdapter(fn: IFunctionDeclInstruction) {
        const { def } = fn;
        const { params } = def;

        this.begin(S3DEmitter.SECTION_ADAPTER);
        {

            this.emitLine(`ENTRY_POINT_VERTEX(VS_OUTPUT, main, VS_INPUT_AUTO_I, _input, Pos, ${this.shaderName.toLowerCase()}_out)`)
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`VS_INPUT_AUTO_O input;`);
                this.emitLine(`VS_OUTPUT       result;`);
                this.emitNewline();
                
                this.emitLine(`prepare_shader_input(_input, input);`);
                this.emitNewline();

                const { type, name } = params[0];

                this.emitLine(`${type.name} ${name};`);
                const fields = type.fields;

                for (let field of fields) {
                    const semantic = this.normalizeSemantic(field.semantic);

                    // corner case: float4 Pos => float3
                    if (semantic === 'POSITION' && field.type.name === 'float3') {
                        this.emitLine(`${name}.${field.name} = input.${this.semanticToInputName(semantic)}.xyz;`);
                        continue;
                    }

                    this.emitLine(`${name}.${field.name} = input.${this.semanticToInputName(semantic)};`);
                }

                this.emitLine(`${fn.def.returnType.name} _result = ${fn.name}(${name});`);
                this.emitLine(`result.Pos = _result.${fields.filter(f => this.normalizeSemantic(f.semantic) == 'POSITION')?.[0].name};`);
                {
                    const fields = fn.def.returnType.fields.filter(f => this.normalizeSemantic(f.semantic) !== 'POSITION');
                    for (let field of fields) {
                        this.emitLine(`result.${this.shaderName.toLowerCase()}_out.${field.name} = _result.${field.name};`);
                    }
                }

                this.emitNewline();
                this.emitLine(`return result;`);
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();
    }


    emitPSAdapter(fn: IFunctionDeclInstruction) {
        const { def } = fn;
        const { params } = def;

        this.begin(S3DEmitter.SECTION_ADAPTER);
        {
            // ENTRY_POINT_PIXEL_NO_OUTPUT(base, input, input_flat, vPos)
            // ENTRY_POINT_PIXEL_SINGLE_OUTPUT(float4, base, input, input_flat, vPos)
            this.emitLine(`ENTRY_POINT_PIXEL_SINGLE_OUTPUT(float4, ${this.shaderName.toLowerCase()}, input, input_flat, vPos)`);
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`float4 result;`);
                this.emitNewline();
                
                this.emitLine(`result = float4(1, 0, 0, 1);`);
                this.emitLine(`return result;`);
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();
    }


    emitFunction(fn: IFunctionDeclInstruction) {
        super.emitFunction(fn);

        if (this.depth() > 0) {
            return;
        }

        const { def } = fn;
        
        console.assert(def.params.length === 1);         // todo: add support of multiple arguments
        console.assert(!def.params[0].type.isUniform()); // todo: add support for param uniforms
        
        this.emitPrologue();
        
        if (this.mode == 'vertex') {
            this.emitVSOutput(def.returnType);
            this.emitVSAdapter(fn);
        }
        if (this.mode == 'pixel') {
            this.emitPSAdapter(fn);
        }
        
        this.emitRegisters();
    }
}

// translate shader VS or PS
export function translate(instr: IInstruction, options?: ICodeEmitterOptions): string {
    console.assert(instr.instructionType === EInstructionTypes.k_FunctionDecl);

    const emitter = new S3DEmitter(options);
    emitter.emit(instr);

    return emitter.toString();
}
