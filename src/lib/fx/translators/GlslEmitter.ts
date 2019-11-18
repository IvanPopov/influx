import { assert, isDef } from "@lib/common";
import { IdExprInstruction } from "@lib/fx/instructions/IdExprInstruction";
import { EInstructionTypes, IExprInstruction, IFunctionCallInstruction, IFunctionDeclInstruction, IFunctionDefInstruction, IIdExprInstruction, IInstruction, ILiteralInstruction, IPostfixPointInstruction, ITypeInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";

import { CodeEmitter, ICodeEmitterOptions } from "./CodeEmitter";

const GlslTypeNames = {
    'int': 'int',
    'float': 'float',
    'float2': 'vec2',
    'float3': 'vec3',
    'float4': 'vec4',
    'float4x4': 'mat4'
}
 

const sname = {
    attr: (decl: IVariableDeclInstruction) => decl.semantic ?
        `a_${decl.semantic.toLowerCase()}` :
        `a_${decl.name}_${decl.instructionID}`,
    varying: (decl: IVariableDeclInstruction) => decl.semantic ?
        `v_${decl.semantic.toLowerCase()}` :
        `v_${decl.name}_${decl.instructionID}`,
    // uniform: (decl: IVariableDeclInstruction) => `u_${decl.name}`
};



export class GlslEmitter extends CodeEmitter {
    
    protected resolveTypeName(type: ITypeInstruction): string {
        const typeName = GlslTypeNames[type.name];
        if (!isDef(typeName)) {
            assert(false, 'unknown built in type found');
            return null;
        }

        return typeName;
    }


    protected isVaryingOrAttributeAlias(pfxp: IPostfixPointInstruction) {
        if (this.isMain() && this.mode !== 'raw') {
            if (pfxp.element.instructionType === EInstructionTypes.k_IdExpr) {
                const id = pfxp.element as IdExprInstruction;
                if (id.decl.isParameter() && !id.decl.isUniform()) {
                    return true;
                }
            }
        }
        return false;
    }

    emitSemantic(semantic: string) {
        // disabling of semantics emission.
    }

    protected emitPrologue(def: IFunctionDefInstruction): void {
        this.begin();
        {
            this.emitLine(`precision highp float;`);
            this.emitLine(`precision highp int;`);
        }
        this.end();
        this.begin();
        {
            for (const param of def.params) {
                if (param.isUniform()) {
                    continue;
                }

                const type = param.type;

                this.emitComment(param.toCode());
                this.emitNewline();

                if (!type.isComplex()) {
                    assert(type.isNotBaseArray());
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
                if (!param.isUniform()) {
                    continue;
                }

                this.emitVariableDecl(param);
            }
        }
        this.end();


        if (this.mode === 'vertex') {
            this.begin();
            {
                const retType = def.returnType;
                assert(retType.isComplex(), 'basic types unsupported yet');

                retType.fields.forEach(field => {
                    assert(!field.type.isNotBaseArray() && !field.type.isComplex());
                    this.emitVarying(field);
                });
            }
            this.end();
        }
    }

    protected emitAttribute(decl: IVariableDeclInstruction) {
        return (this.emitKeyword('attribute'), this.emitVariableDecl(decl, sname.attr), this.emitChar(';'), this.emitNewline());
    }

    protected emitVarying(decl: IVariableDeclInstruction) {
        return (this.emitKeyword('varying'), this.emitVariableDecl(decl, sname.varying), this.emitChar(';'), this.emitNewline());
    }

    protected emitVaryingOrAttribute(decl: IVariableDeclInstruction) {
        switch(this.mode) {
            case 'vertex':
                return this.emitAttribute(decl);
            case 'pixel':
                return this.emitVarying(decl);
        }
    }

    emitFloat(lit: ILiteralInstruction<number>) {
        const sval = String(lit.value);
        this.emitKeyword(sval);
        (sval.indexOf('.') === -1) && this.emitChar('.0');
    }

    emitPostfixPoint(pfxp: IPostfixPointInstruction) {
        if (this.isVaryingOrAttributeAlias(pfxp)) {
            this.emitKeyword(this.mode === 'vertex' ? sname.attr(pfxp.postfix.decl) : sname.varying(pfxp.postfix.decl));
            return;
        }
        
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
        }
        
        super.emitFCall(call);
    }


    emitFunction(fn: IFunctionDeclInstruction) {
        const def = fn.def;
        const retType = def.returnType;

        if (this.depth() === 0 && this.mode !== 'raw') {
            this.emitPrologue(fn.def);
            const { typeName } = this.resolveType(def.returnType);

            // emit original function witout parameters
            this.begin();
            {
                this.emitKeyword(typeName);
                this.emitKeyword(fn.name);
                this.emitChar('(');
                this.emitChar(')');
                this.emitNewline();
                this.emitBlock(fn.impl);
            }
            this.end();

            // emit main()
            this.begin();
            {
                this.emitChar('void main(void)');
                this.emitNewline();
                this.emitChar('{');
                this.push();
                {
                    const tempName = 'temp';

                    this.emitKeyword(typeName);
                    this.emitKeyword(tempName);
                    this.emitKeyword('=');
                    this.emitKeyword(fn.name);
                    this.emitChar('()');
                    this.emitChar(';');
                    this.emitNewline();

                    if (this.mode === 'vertex') {
                        retType.fields.forEach(field => {
                            const varyingName = sname.varying(field);
                            this.emitKeyword(varyingName);
                            this.emitKeyword('=');
                            this.emitKeyword(tempName);
                            this.emitChar('.');
                            this.emitChar(field.name);
                            this.emitChar(';');
                            this.emitNewline();
                        });

                        const fieldPos = retType.fields.filter(field => (field.semantic === 'POSITION'))[0];
                        this.emitKeyword('gl_Position');
                        this.emitKeyword('=');
                        this.emitKeyword(tempName);
                        this.emitChar('.');
                        this.emitChar(fieldPos.name);
                        this.emitChar(';');
                        this.emitNewline();
                    } else { // pixel
                        this.emitKeyword('gl_FragColor');
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


    static $declToAttributeName(decl: IVariableDeclInstruction) {
        return sname.attr(decl);
    }
}


export function translate(instr: IInstruction, options?: ICodeEmitterOptions): string {
    return (new GlslEmitter(options)).emit(instr).toString();
}
