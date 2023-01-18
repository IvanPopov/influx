import { assert, isDef } from "@lib/common";
import { IdExprInstruction } from "@lib/fx/analisys/instructions/IdExprInstruction";
import { EInstructionTypes, ICastExprInstruction, ICbufferInstruction, IExprInstruction, IFunctionCallInstruction, IFunctionDeclInstruction, IFunctionDefInstruction, IIdExprInstruction, IInitExprInstruction, IInstruction, ILiteralInstruction, IPostfixIndexInstruction, IPostfixPointInstruction, ITypeInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";

import { CodeEmitter, CodeContext, ICodeEmitterOptions } from "./CodeEmitter";

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
const IS_VERTEXID = (semantic: string) => ['VERTEX_ID', 'SV_VertexID'].indexOf(semantic) !== -1;


export class GLSLContext extends CodeContext {
    location: number = 0;

    has(signature: string): boolean {
        // nothing todo - built in GLSL function
        const SYSTEM_FUNCS = [ 'unpackHalf2x16(uint)' ];
        if (SYSTEM_FUNCS.includes(signature)) {
            return true;
        }
        return super.has(signature);
    }
}


export class GLSLEmitter<ContextT extends GLSLContext> extends CodeEmitter<ContextT> {
    
    protected resolveTypeName(type: ITypeInstruction): string {
        const typeName = GlslTypeNames[type.name];
        if (!isDef(typeName)) {
            assert(false, `unknown built in type found '${type.name}'`);
            return type.name;
        }

        return typeName;
    }


    protected isVaryingOrAttributeAlias(ctx: ContextT, pfxp: IPostfixPointInstruction) {
        if (this.isMain() && !ctx.isRaw()) {
            if (pfxp.element.instructionType === EInstructionTypes.k_IdExpr) {
                const id = pfxp.element as IdExprInstruction;
                if (id.decl.isParameter() && !id.decl.type.isUniform()) {
                    return true;
                }
            }
        }
        return false;
    }




    emitSemantic(ctx: ContextT, semantic: string) {
        // disabling of semantics emission.
    }


    emitPostfixIndex(ctx: ContextT, pfidx: IPostfixIndexInstruction)
    {
        if (/^Buffer(<[a-zA-Z0-9_]+>)?$/.test(pfidx.element.type.name)) {
            // TODO: fixme
            this.emitKeyword(`${this.resolveType(ctx, pfidx.type).typeName}(0.0, 0.0, 0.0, 0.0)`);
            return;
            // this.emitLine(`texelFetch(`, texelCoord, 0).x`);
            this.emitKeyword('texelFetch');
            this.emitChar('(');
                this.emitNoSpace();
                this.emitExpression(ctx, pfidx.element);
                this.emitChar(',');
                this.emitKeyword(`ivec2`);
                this.emitChar('(');
                    this.emitNoSpace();
                    this.emitExpression(ctx, pfidx.index);
                    this.emitChar(',');
                    this.emitKeyword('0');
                this.emitChar(')');
                this.emitChar(',');
                this.emitKeyword('0');
            this.emitChar(')');
            return;
        }
        super.emitPostfixIndex(ctx, pfidx);
    }


    emitVariableNoInit(ctx: ContextT, src: IVariableDeclInstruction, rename?: (decl: IVariableDeclInstruction) => string): void {
        const { type } = src;
        if (src.isGlobal()) {
            // IP: hack for fake compartibility with GLSL 3.00 ES
            // convert buffers to samplers
            if (/^Buffer(<[a-zA-Z0-9_]+>)?$/.test(type.name)) {
                const { typeName } = this.resolveType(ctx, type.arrayElementType);

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

        if (/^Texture2D(<[a-zA-Z0-9_]+>)?$/.test(type.name)) {
            this.emitKeyword('sampler2D');
            this.emitKeyword(src.name);
            return;
        }

        super.emitVariableNoInit(ctx, src, rename);
    }


    protected emitPrologue(ctx: ContextT, def: IFunctionDefInstruction): void {
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
                    this.emitVaryingOrAttribute(ctx, param);
                    continue;
                }

                type.fields.forEach(field => {
                    assert(!field.type.isNotBaseArray() && !field.type.isComplex());
                    this.emitVaryingOrAttribute(ctx, field);
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

                this.emitVariable(ctx, param);
            }
        }
        this.end();


        if (ctx.mode === 'vertex') {
            this.begin();
            {
                const retType = def.returnType;
                assert(retType.isComplex(), 'basic types unsupported yet');

                retType.fields.forEach(field => this.emitVarying(ctx, field));
            }
            this.end();
        }

        if (ctx.mode === 'pixel') {
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


    emitTextureRaw(ctx: ContextT, type: string, name: string, comment?: string): void {
        if (!ctx.has(name)) {
            const tex = ctx.addTexture(type, name);
            this.begin();
            {
                comment && this.emitComment(comment);
                this.emitKeyword(`uniform sampler2D ${name};`);
            }
            this.end();
        }
        ctx.linkTexture(name);
    }


    protected emitAttribute(ctx: ContextT, decl: IVariableDeclInstruction) {
        // skip specific semantics like SV_InstanceID in favor of gl_InstanceID 
        if (IS_INSTANCEID(decl.semantic)) return;
        if (IS_VERTEXID(decl.semantic)) return;

        (this.emitKeyword(`layout(location = ${ctx.location++}) in`), this.emitVariable(ctx, decl, sname.attr), this.emitChar(';'), this.emitNewline());
    }


    protected emitVarying(ctx: ContextT, decl: IVariableDeclInstruction) {
        const { type } = decl;
        if (type.isComplex()) {
            type.fields.forEach(field => this.emitVarying(ctx, field));
            return;
        }

        const usage: { [key in typeof ctx.mode]?: string } = {
            vertex: 'out',
            pixel: 'in'
        };

        (this.emitKeyword(usage[ctx.mode]), this.emitVariable(ctx, decl, sname.varying), this.emitChar(';'), this.emitNewline());
    }


    protected emitVaryingOrAttribute(ctx: ContextT, decl: IVariableDeclInstruction) {
        switch(ctx.mode) {
            case 'vertex':
                return this.emitAttribute(ctx, decl);
            case 'pixel':
                return this.emitVarying(ctx, decl);
        }
    }


    emitCbuffer(ctx: ContextT, cbuf: ICbufferInstruction) {
        if (!ctx.has(cbuf.name)) {
            ctx.addCbuffer(cbuf);
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
                    this.emitVariable(ctx, field);
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
        ctx.linkCbuffer(cbuf.name);
    }


    emitFloat(ctx: ContextT, lit: ILiteralInstruction<number>) {
        const sval = String(lit.value);
        this.emitKeyword(sval);
        (sval.indexOf('.') === -1) && this.emitChar('.0');
    }


    attr(ctx: ContextT, decl: IVariableDeclInstruction) {
        return ctx.isVertex() ? sname.attr(decl) : sname.varying(decl);
    }


    emitPostfixPoint(ctx: ContextT, pfxp: IPostfixPointInstruction) {
        // if (IS_INSTANCEID(pfxp.postfix.decl.semantic)) {
        //     this.emitKeyword(`gl_InstanceID`);
        //     return;
        // }

        super.emitPostfixPoint(ctx, pfxp);
    }


    emitFCall(ctx: ContextT, call: IFunctionCallInstruction) {
        const { decl, args, callee } = call;

        switch (decl.name) {
            case 'mul':
                assert(args.length == 2);
                this.emitMulIntrinsic(ctx, args[0], args[1]);
                return;
            case 'lerp':
                super.emitFCall(ctx, call, (decl) => 'mix');
                return;
            case 'frac':
                super.emitFCall(ctx, call, (decl) => 'fract');
                return;
            case 'asuint':
                // call.decl.def.params[0].type.name === 'float' ? 'floatBitsToUint' : 'floatBitsToUint'
                super.emitFCall(ctx, call, (decl) => 'floatBitsToUint');
                return;
            case 'asfloat':
                super.emitFCall(ctx, call, (decl) => 'uintBitsToFloat');
                return;
            case 'fmod':
                super.emitFCall(ctx, call, (decl) => 'mod');
                return;
            case 'clip':
                this.emitClipIntrinsic(ctx, args[0]);
                return;

        }

        if (callee) {
            const type = callee.type;
            if (/^Texture(2D|3D|1D)?(<[a-zA-Z0-9_]+>)?$/.test(type.name)) {
                const id = callee as IIdExprInstruction;
                this.emitGlobal(ctx, id.decl);

                if (decl.name == 'Sample') {
                    this.emitKeyword(`texture`);
                    this.emitChar('(');
                    this.emitNoSpace();
                    this.emitKeyword(id.name);
                    this.emitChar(`,`);
                    this.emitExpressionList(ctx, args.slice(1)); // remove sampler argument
                    this.emitChar(')');
                }
                
                if (decl.name == 'GetDimensions') {
                    this.emitChar('{');
                    this.push();
 
                    this.emitKeyword(`ivec2`);
                    this.emitKeyword(`temp`);
                    this.emitSpace();
                    this.emitChar(`=`);
                    this.emitKeyword('textureSize');
                    this.emitChar('(');
                    this.emitNoSpace();
                    this.emitKeyword(id.name);
                    this.emitChar(`,`);
                    this.emitKeyword('int');
                    this.emitChar('(');
                    this.emitNoSpace();
                    this.emitExpression(ctx, args[0]);
                    this.emitChar(')');
                    this.emitChar(')');
                    this.emitChar(';');
                    this.emitNewline();
                    
                    this.emitExpression(ctx, args[1]);
                    this.emitSpace();
                    this.emitChar(`=`);
                    this.emitKeyword('uint(temp.x)');
                    this.emitChar(';');
                    this.emitNewline();

                    this.emitExpression(ctx, args[2]);
                    this.emitSpace();
                    this.emitChar(`=`);
                    this.emitKeyword('uint(temp.y)');
                    this.emitChar(';');
                    this.emitNewline();

                    this.pop();
                    this.emitChar('}');
                }
                return;
            } 
        }
        
        super.emitFCall(ctx, call);
    }


    emitCast(ctx: ContextT, cast: ICastExprInstruction): void {
        if (cast.isUseless()) {
            return;
        }

        // replace '(vec3)value' to 'vec3(value)'
        if (GlslTypeNames[cast.type.name]) {
            const { typeName } = this.resolveType(ctx, cast.type);
            this.emitKeyword(typeName);
            this.emitChar('(');
            this.emitNoSpace();
            this.emitExpression(ctx, cast.expr);
            this.emitChar(')');
            return;
        }

        super.emitCast(ctx, cast);
    }


    emitInitExpr(ctx: ContextT, init: IInitExprInstruction) {
        // replaced '{1, 2, 3}' to 'ivec3(1, 2, 3)'
        if (GlslTypeNames[init.type.name]) {
            const { typeName } = this.resolveType(ctx, init.type);
            this.emitKeyword(typeName);
            this.emitChar('(');
            this.emitNoSpace();
            this.emitExpressionList(ctx, init.args);
            this.emitChar(')');
            return;
        }

        super.emitInitExpr(ctx, init);
    }


    // todo: use emitEntryFunction instead
    emitFunction(ctx: ContextT, fn: IFunctionDeclInstruction) {
        const def = fn.def;
        const retType = def.returnType;

        const isSupported = ctx.isVertex() || ctx.isPixel();
        if (this.depth() === 0 && isSupported) {
            this.emitPrologue(ctx, fn.def);
            const { typeName } = this.resolveType(ctx, def.returnType);

            super.emitRegularFunction(ctx, fn);

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
                        const { typeName } = this.resolveType(ctx, p.type);

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
                            if (IS_INSTANCEID(decl.semantic)) {
                                this.emitKeyword('uint(gl_InstanceID)');
                            } else if(IS_VERTEXID(decl.semantic)) {
                                this.emitKeyword('uint(gl_VertexID)');
                            } else {
                                this.emitKeyword(this.attr(ctx, decl));
                            }
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

                    if (ctx.isVertex()) {

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

        super.emitFunction(ctx, fn);
    }

    
    //
    // intrinsics
    //

    emitMulIntrinsic(ctx: ContextT, left: IExprInstruction, right: IExprInstruction) {
        this.emitChar('(');
        this.emitExpression(ctx, left);
        this.emitKeyword('*');
        this.emitExpression(ctx, right);
        this.emitChar(')');
    }


    // todo: call autogen function?
    emitClipIntrinsic(ctx: ContextT, x: IExprInstruction) {
        this.emitKeyword('if');
        this.emitChar('(');
        this.emitNoSpace();
        this.emitChar('(');
        this.emitNoSpace();
        this.emitExpression(ctx, x);
        this.emitChar(')');
        this.emitKeyword(`<`)
        this.emitKeyword(`0.0`);
        this.emitChar(')');
        this.emitKeyword(`discard`);
    }

    // is used in Bundle.ts
    static $declToAttributeName(decl: IVariableDeclInstruction) {
        return sname.attr(decl);
    }


    private static glslEmitter = new GLSLEmitter({ omitEmptyParams: true, omitInUsage: true });


    static translate(instr: IInstruction, ctx: GLSLContext = new GLSLContext): string {
        return GLSLEmitter.glslEmitter.emit(ctx, instr).toString();
    }
}


