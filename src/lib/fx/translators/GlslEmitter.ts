import { CodeEmitter } from "./CodeEmitter";
import { IVariableDeclInstruction, ITypeInstruction, IPostfixPointInstruction, EInstructionTypes, IFunctionDefInstruction, IIdExprInstruction, IFunctionCallInstruction, IFunctionDeclInstruction, IExprInstruction } from "@lib/idl/IInstruction";
import { isDef, assert } from "@lib/common";
import { IdExprInstruction } from "@lib/fx/instructions/IdExprInstruction";

const GlslTypeNames = {
    'int': 'int',
    'float': 'float',
    'float2': 'vec2',
    'float3': 'vec3',
    'float4': 'vec4',
    'float4x4': 'mat4'
}
 

const sname = {
    attr: (decl: IVariableDeclInstruction) => decl.semantics ?
        `a_${decl.semantics.toLowerCase()}` :
        `a_${decl.name}_${decl.instructionID}`,
    varying: (decl: IVariableDeclInstruction) => decl.semantics ?
        `v_${decl.semantics.toLowerCase()}` :
        `v_${decl.name}_${decl.instructionID}`,
    // uniform: (decl: IVariableDeclInstruction) => `u_${decl.name}`
};



export class GlslEmitter extends CodeEmitter {

    protected isMain() {
        return this.depth() <= 1;
    }
    
    protected resolveTypeName(type: ITypeInstruction): string {
        const typeName = GlslTypeNames[type.name];
        if (!isDef(typeName)) {
            assert(false, 'unknown built in type found');
            return null;
        }

        return typeName;
    }


    protected isAttributeAlias(pfxp: IPostfixPointInstruction) {
        if (this.isMain()) {
            if (pfxp.element.instructionType === EInstructionTypes.k_IdExprInstruction) {
                const id = pfxp.element as IdExprInstruction;
                if (id.decl.isParameter() && !id.decl.isUniform()) {
                    return true;
                }
            }
        }
        return false;
    }


    protected emitPrologue(def: IFunctionDefInstruction): void {
        this.begin();
        {
            for (const param of def.params) {
                if (param.isUniform()) {
                    continue;
                }

                const type = param.type;

                this.emitChar(`/* ${param.toCode()}; */`);
                this.emitNewline();

                if (!type.isComplex()) {
                    assert(type.isNotBaseArray());
                    this.emitAttribute(param);
                    continue;
                }

                type.fields.forEach(field => {
                    assert(!field.type.isNotBaseArray() && !field.type.isComplex());
                    this.emitAttribute(field);
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

    protected emitAttribute(src: IVariableDeclInstruction) {
        return (this.emitKeyword('attribute'), this.emitVariableDecl(src, sname.attr), this.emitChar(';'), this.emitNewline());
    }

    protected emitVarying(src: IVariableDeclInstruction) {
        return (this.emitKeyword('varying'), this.emitVariableDecl(src, sname.varying), this.emitChar(';'), this.emitNewline());
    }

    emitPostfixPoint(pfxp: IPostfixPointInstruction) {
        if (this.isAttributeAlias(pfxp)) {
            this.emitKeyword(sname.attr(pfxp.postfix.decl));
            return;
        }
        
        super.emitPostfixPoint(pfxp);
    }

    emitIdentifier(id: IIdExprInstruction) {
        const decl = id.decl;
        const name = id.name;


        // if (isMain() && decl.isParameter() && !decl.isUniform()) {
        // TODO: add support of main arguments with basic types (attributes)
        // }

        const isUniformArg = this.isMain() && decl.isParameter() && decl.isUniform();

        if (decl.isGlobal() || isUniformArg) {
            assert(decl.isUniform());

            if (this.knownGlobals.indexOf(name) === -1) {
                this.begin();
                this.emitStmt(decl);
                this.end();
                this.knownGlobals.push(name);
            }
        }

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
        const { typeName } = this.resolveType(def.returnType);

        if (this.isMain()) {
            this.emitPrologue(fn.def);

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

                    assert(retType.isComplex());

                    const tempName = 'temp';

                    this.emitKeyword(typeName);
                    this.emitKeyword(tempName);
                    this.emitKeyword('=');
                    this.emitKeyword(fn.name);
                    this.emitChar('()');
                    this.emitChar(';');
                    this.emitNewline();

                    retType.fields.forEach(field => {
                        this.emitKeyword(sname.varying(field));
                        this.emitKeyword('=');
                        this.emitKeyword(tempName);
                        this.emitChar('.');
                        this.emitChar(field.name);
                        this.emitChar(';');
                        this.emitNewline();
                    });
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
        this.emitExpression(left);
        this.emitKeyword('*');
        this.emitExpression(right);
    }
}