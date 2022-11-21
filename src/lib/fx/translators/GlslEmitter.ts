import { assert, isDef } from "@lib/common";
import { IdExprInstruction } from "@lib/fx/analisys/instructions/IdExprInstruction";
import { EInstructionTypes, ICastExprInstruction, ICbufferInstruction, IExprInstruction, IFunctionCallInstruction, IFunctionDeclInstruction, IFunctionDefInstruction, IIdExprInstruction, IInitExprInstruction, IInstruction, ILiteralInstruction, IPostfixIndexInstruction, IPostfixPointInstruction, ITypeInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { type } from "os";

import { CodeEmitter, ICodeEmitterOptions } from "./CodeEmitter";

const GlslTypeNames = {
    'void': 'void',
    'uint': 'uint',
    'uint2': 'uvec2',
    'uint3': 'uvec3',
    'uint4': 'uvec4',
    'bool': 'bool',
    'bool2': 'bvec2',
    'bool3': 'bvec3',
    'bool4': 'bvec4',
    'int': 'int',
    'int2': 'ivec2',
    'int3': 'ivec3',
    'int4': 'ivec4',
    'float': 'float',
    'float2': 'vec2',
    'float3': 'vec3',
    'float4': 'vec4',
    'float4x4': 'mat4',
    'float3x4': 'mat3x4'
}

const HlslTypeNames = Object.fromEntries(Object.entries(GlslTypeNames).map(([k, v]) => [v, k]));
 

const sname = {
    attr: (decl: IVariableDeclInstruction) => decl.semantic ?
        `a_${decl.semantic.toLowerCase()}` :
        `a_${decl.name}_${decl.instructionID}`,
    varying: (decl: IVariableDeclInstruction) => decl.semantic ?
        `v_${decl.semantic.toLowerCase()}` :
        `v_${decl.name}_${decl.instructionID}`,
    // uniform: (decl: IVariableDeclInstruction) => `u_${decl.name}`
};

const IS_POSITION = (semantic: string) => ['POSITION', 'SV_Position'].indexOf(semantic) !== -1;
const IS_INSTANCEID = (semantic: string) => ['INSTANCE_ID', 'SV_InstanceID'].indexOf(semantic) !== -1;

export class GlslEmitter extends CodeEmitter {
    
    protected resolveTypeName(type: ITypeInstruction): string {
        const typeName = GlslTypeNames[type.name];
        if (!isDef(typeName)) {
            assert(false, `unknown built in type found '${type.name}'`);
            return type.name;
        }

        return typeName;
    }


    protected isVaryingOrAttributeAlias(pfxp: IPostfixPointInstruction) {
        if (this.isMain() && this.mode !== 'raw') {
            if (pfxp.element.instructionType === EInstructionTypes.k_IdExpr) {
                const id = pfxp.element as IdExprInstruction;
                if (id.decl.isParameter() && !id.decl.type.isUniform()) {
                    return true;
                }
            }
        }
        return false;
    }

    protected addFunction(fn: IFunctionDeclInstruction): boolean {
        // // nothing todo - built in GLSL function
        const SYSTEM_FUNCS = [ 'unpackHalf2x16' ];
        if (SYSTEM_FUNCS.includes(fn.name)) {
            return false;
        }
        return super.addFunction(fn);
    }


    emitSemantic(semantic: string) {
        // disabling of semantics emission.
    }


    emitPostfixIndex(pfidx: IPostfixIndexInstruction)
    {
        if (/^Buffer(<[a-zA-Z0-9_]+>)?$/.test(pfidx.element.type.name)) {
            // TODO: fixme
            this.emitKeyword(`${this.resolveType(pfidx.type).typeName}(0.0, 0.0, 0.0, 0.0)`);
            return;
            // this.emitLine(`texelFetch(`, texelCoord, 0).x`);
            this.emitKeyword('texelFetch');
            this.emitChar('(');
                this.emitNoSpace();
                this.emitExpression(pfidx.element);
                this.emitChar(',');
                this.emitKeyword(`ivec2`);
                this.emitChar('(');
                    this.emitNoSpace();
                    this.emitExpression(pfidx.index);
                    this.emitChar(',');
                    this.emitKeyword('0');
                this.emitChar(')');
                this.emitChar(',');
                this.emitKeyword('0');
            this.emitChar(')');
            return;
        }
        super.emitPostfixIndex(pfidx);
    }

    emitVariableNoInit(src: IVariableDeclInstruction, rename?: (decl: IVariableDeclInstruction) => string): void {
        const { type } = src;
        if (src.isGlobal()) {
            // IP: hack for fake compartibility with GLSL 3.00 ES
            // convert buffers to samplers
            if (/^Buffer(<[a-zA-Z0-9_]+>)?$/.test(type.name)) {
                const { typeName } = this.resolveType(type.arrayElementType);

                this.emitKeyword('uniform highp');
                if (['ivec4'].includes(typeName)) {
                    this.emitKeyword('isampler2D');
                } else if (['uvec4'].includes(typeName)) {
                    this.emitKeyword('usampler2D');
                } else {
                    this.emitKeyword('sampler2D');
                }
                this.emitKeyword(src.name);
                return;
            }
        }
        super.emitVariableNoInit(src, rename);
    }

    protected emitPrologue(def: IFunctionDefInstruction): void {
        this.begin();
        {
            this.emitLine(`#version 300 es`);

            this.emitLine(`precision highp float;`);
            // this.emitLine(`precision highp int;`);
            // this.emitLine(`precision highp unsigned int;`);
        }
        this.end();
        this.begin();
        {
            for (const param of def.params) {
                if (param.type.isUniform()) {
                    continue;
                }

                const type = param.type;

                this.emitComment(param.toCode());
                this.emitNewline();

                if (!type.isComplex()) {
                    this.emitVaryingOrAttribute(param);
                    continue;
                }

                type.fields.forEach(field => {
                    assert(!field.type.isNotBaseArray() && !field.type.isComplex());
                    this.emitVaryingOrAttribute(field);
                });
            }
        }
        this.end();

        this.begin();
        {
            for (const param of def.params) {
                if (!param.type.isUniform()) {
                    continue;
                }

                this.emitVariable(param);
            }
        }
        this.end();


        if (this.mode === 'vertex') {
            this.begin();
            {
                const retType = def.returnType;
                assert(retType.isComplex(), 'basic types unsupported yet');

                retType.fields.forEach(field => this.emitVarying(field));
            }
            this.end();
        }

        if (this.mode === 'pixel') {
            this.begin();
            this.emitLine(`out vec4 outColor;`);
            this.end();
        }
    }

    emitKeyword(kw: string) {
        // IP: temp fix for reserved GLSL keyword
        if (kw === 'input') kw = 'input1';
        super.emitKeyword(kw);
    }

    private loc = 0;
    protected emitAttribute(decl: IVariableDeclInstruction) {
        // skip specific semantics like SV_InstanceID in favor of gl_InstanceID 
        if (IS_INSTANCEID(decl.semantic)) return;

        (this.emitKeyword(`layout(location = ${this.loc++}) in`), this.emitVariable(decl, sname.attr), this.emitChar(';'), this.emitNewline());
    }


    protected emitVarying(decl: IVariableDeclInstruction) {
        const { type } = decl;
        if (type.isComplex()) {
            type.fields.forEach(field => this.emitVarying(field));
            return;
        }

        const usage = {
            vertex: 'out',
            pixel: 'in'
        };

        (this.emitKeyword(usage[this.mode]), this.emitVariable(decl, sname.varying), this.emitChar(';'), this.emitNewline());
    }


    protected emitVaryingOrAttribute(decl: IVariableDeclInstruction) {
        switch(this.mode) {
            case 'vertex':
                return this.emitAttribute(decl);
            case 'pixel':
                return this.emitVarying(decl);
        }
    }


    emitCbuffer(cbuf: ICbufferInstruction) {
        this.begin();
        this.emitComment(`size: ${cbuf.type.size}`);
        this.emitKeyword('uniform');
        if (cbuf.id) {
            this.emitKeyword(cbuf.name);
        }
        this.emitNewline();
        this.emitChar('{');
        this.push();
        {
            cbuf.type.fields.forEach(field => {
                this.emitVariable(field);
                this.emitChar(';');
                this.emitChar('\t')
                this.emitComment(`padding ${field.type.padding}, size ${field.type.size}`);
            });
        }
        this.pop();
        this.emitChar('}');
        this.emitChar(';');
        this.end();
    }


    emitFloat(lit: ILiteralInstruction<number>) {
        const sval = String(lit.value);
        this.emitKeyword(sval);
        (sval.indexOf('.') === -1) && this.emitChar('.0');
    }


    attr(decl: IVariableDeclInstruction) {
        return this.isVertex() ? sname.attr(decl) : sname.varying(decl);
    }


    emitPostfixPoint(pfxp: IPostfixPointInstruction) {
        // if (IS_INSTANCEID(pfxp.postfix.decl.semantic)) {
        //     this.emitKeyword(`gl_InstanceID`);
        //     return;
        // }

        super.emitPostfixPoint(pfxp);
    }


    emitIdentifier(id: IIdExprInstruction) {
        super.emitIdentifier(id);
    }


    emitFCall(call: IFunctionCallInstruction) {
        const decl = call.decl;
        const args = call.args;

        switch (decl.name) {
            case 'mul':
                assert(args.length == 2);
                this.emitMulIntrinsic(args[0], args[1]);
                return;
            case 'frac':
                super.emitFCall(call, (decl) => 'fract');
                return;
            case 'asuint':
                // call.decl.def.params[0].type.name === 'float' ? 'floatBitsToUint' : 'floatBitsToUint'
                super.emitFCall(call, (decl) => 'floatBitsToUint');
                return;
            case 'asfloat':
                super.emitFCall(call, (decl) => 'uintBitsToFloat');
                return;

        }
        
        super.emitFCall(call);
    }


    emitCast(cast: ICastExprInstruction): void {
        if (cast.isUseless()) {
            return;
        }

        // replace '(vec3)value' to 'vec3(value)'
        if (GlslTypeNames[cast.type.name]) {
            const { typeName } = this.resolveType(cast.type);
            this.emitKeyword(typeName);
            this.emitChar('(');
            this.emitNoSpace();
            this.emitExpression(cast.expr);
            this.emitChar(')');
            return;
        }

        super.emitCast(cast);
    }


    emitInitExpr(init: IInitExprInstruction) {
        // replaced '{1, 2, 3}' to 'ivec3(1, 2, 3)'
        if (GlslTypeNames[init.type.name]) {
            const { typeName } = this.resolveType(init.type);
            this.emitKeyword(typeName);
            this.emitChar('(');
            this.emitNoSpace();
            this.emitExpressionList(init.args);
            this.emitChar(')');
            return;
        }

        super.emitInitExpr(init);
    }


    // todo: use emitEntryFunction instead
    emitFunction(fn: IFunctionDeclInstruction) {
        const def = fn.def;
        const retType = def.returnType;

        const isSupported = this.isVertex() || this.isPixel();
        if (this.depth() === 0 && isSupported) {
            this.emitPrologue(fn.def);
            const { typeName } = this.resolveType(def.returnType);

            super.emitRegularFunction(fn);

            // emit main()
            this.begin();
            {
                this.emitChar('void main(void)');
                this.emitNewline();
                this.emitChar('{');
                this.push();
                const params = fn.def.params.filter(p => p.type.size !== 0);
                {
                    for (let p of params)
                    {
                        const pname = p.name;
                        const { typeName } = this.resolveType(p.type);

                        this.emitKeyword(typeName);
                        this.emitKeyword(pname);
                        this.emitChar(';');
                        this.emitNewline();

                        const fline = (decl: IVariableDeclInstruction, ids: string[]) => {
                            if (decl.type.isComplex() && !decl.type.isBase()) {
                                decl.type.fields.forEach(field => fline(field, [ ...ids, decl.name ]));
                                return;
                            }
                            for (let id of ids) {
                                this.emitKeyword(id);
                                this.emitChar('.');
                                this.emitNoSpace();
                            }
                            this.emitKeyword(decl.name);
                            this.emitSpace();
                            this.emitChar('=');
                            this.emitKeyword(IS_INSTANCEID(decl.semantic) ? 'uint(gl_InstanceID)' : this.attr(decl));
                            this.emitChar(';');
                            this.emitNewline();
                        }

                        fline(p, [ ]);
                    }

                    const tempName = 'temp';

                    this.emitKeyword(typeName);
                    this.emitKeyword(tempName);
                    this.emitKeyword('=');
                    this.emitKeyword(fn.name);
                    this.emitChar('(');
                    this.emitNoSpace();
                    params.forEach((param, i, list) => {
                        this.emitKeyword(param.name);
                        (i + 1 != list.length) && this.emitChar(',');
                    });
                    this.emitChar(')');
                    this.emitChar(';');
                    this.emitNewline();

                    if (this.isVertex()) {

                        // emit prologue like:
                        // v_name = temp.name;
                        {
                            let fline; // emit field line
                            let cdown; // breakdown and emit complex decl

                            fline = (decl: IVariableDeclInstruction, ids: string[]) => {
                                if (decl.type.isComplex() && !decl.type.isBase()) {
                                    cdown(decl.type, [ ...ids, decl.name ]);
                                    return;
                                }
                                this.emitKeyword(sname.varying(decl));
                                this.emitSpace();
                                this.emitChar('=');
                                for (let id of ids) {
                                    this.emitKeyword(id);
                                    this.emitChar('.');
                                    this.emitNoSpace();
                                }
                                this.emitKeyword(decl.name);
                                this.emitChar(';');
                                this.emitNewline();
                            }

                            cdown = (type: ITypeInstruction, ids: string[]) => type.fields.forEach(field => fline(field, ids)); 
                            cdown(retType, [ tempName ]);

                        }

                        const fieldPos = retType.fields.filter(field => (IS_POSITION(field.semantic)))[0];
                        this.emitKeyword('gl_Position');
                        this.emitKeyword('=');
                        this.emitKeyword(tempName);
                        this.emitChar('.');
                        this.emitChar(fieldPos?.name);
                        this.emitChar(';');
                        this.emitNewline();
                    } else { // pixel
                        this.emitKeyword('outColor');
                        this.emitKeyword('=');
                        this.emitKeyword(tempName);
                        this.emitChar(';');
                        this.emitNewline();
                    }
                }
                this.pop();
                this.emitChar('}');
            }
            this.end();
            return;
        }

        super.emitFunction(fn);
    }

    
    //
    // intrinsics
    //

    emitMulIntrinsic(left: IExprInstruction, right: IExprInstruction) {
        this.emitChar('(');
        this.emitExpression(left);
        this.emitKeyword('*');
        this.emitExpression(right);
        this.emitChar(')');
    }


    // is used in Bundle.ts
    static $declToAttributeName(decl: IVariableDeclInstruction) {
        return sname.attr(decl);
    }
}


export function translate(instr: IInstruction, options?: ICodeEmitterOptions): string {
    return (new GlslEmitter({ ...options, omitInUsage: true, omitEmptyParams: true })).emit(instr).toString();
}
