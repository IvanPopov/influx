import { assert, isDef } from "@lib/common";
import { EInstructionTypes, IFunctionDeclInstruction, IFunctionDefInstruction, IInstruction, ITypeInstruction, IVariableDeclInstruction, IStmtBlockInstruction, IDeclInstruction, IDeclStmtInstruction, IAssignmentExprInstruction, IExprInstruction, IExprStmtInstruction, IPostfixPointInstruction, IIdExprInstruction, IReturnStmtInstruction, IFunctionCallInstruction, IConstructorCallInstruction, ILiteralInstruction, IArithmeticExprInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";
import { IOutput, Output } from './Output';
import { Instruction } from "../instructions/Instruction";
import { IdExprInstruction } from "../instructions/IdExprInstruction";


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


function ContextBuilder() {

    let blocks: IOutput[] = [];
    let stack: IOutput[] = [];

    const depth = () => stack.length;
    const top = () => stack[stack.length - 1];

    function begin() {
        stack.push(Output());
    }


    function end() {
        blocks.push(stack.pop());
    }


    const push = () => top().push();
    const pop = () => top().pop();
    const kw = (kw: string) => top().keyword(kw);
    const nl = () => top().newline();
    const add = (val: string) => top().add(val);

    const toString = (): string => blocks
        .map(block => block.toString())
        .filter(code => !!code)
        .join('\n\n');

    return {
        begin,
        end,
        depth,

        push,
        pop,
        kw,
        nl,
        add,

        toString
    };
}


type IContext = ReturnType<typeof ContextBuilder>;

type IOptions = {
    type: 'vertex' | 'pixel';
};


function $emit(ctx: IContext, fn: IFunctionDeclInstruction): void {
    const {
        depth,
        begin,
        end,
        nl,
        kw,
        add,
        push,
        pop
    } = ctx;

    const isMain = () => depth() === 1;

    const knownTypes: string[] = [];
    function type(src: ITypeInstruction): { typeName: string; length: number; usage?: string } {
        let complex = src.isComplex();

        let length: number;
        let typeName: string;
        let usages: string[];
        let usage: string;

        if (!complex) {
            typeName = GlslTypeNames[src.name];
            if (!isDef(typeName)) {
                assert(false, 'unknown built in type found');
                return null;
            }
        } else {
            typeName = src.name;

            if (knownTypes.indexOf(typeName) === -1) {
                begin();
                kw('struct');
                kw(src.name);
                nl();
                add('{');
                push();

                src.fields.map(field => (vdecl(field), add(';'), nl()));

                pop();
                add('}');
                end();

                knownTypes.push(typeName);
            }
        }

        if (src.instructionType === EInstructionTypes.k_VariableTypeInstruction) {
            const vtype = src as IVariableTypeInstruction;
            if (vtype.isUniform()) {
                usages = usages || [];
                usages.push('uniform');
            }
        }

        if (src.isNotBaseArray()) {
            length = src.length;
        }

        if (usages) {
            usage = usages.join(' ');
        }

        return { typeName, length, usage };
    }

    
    function vdecl(src: IVariableDeclInstruction, rename?: (decl: IVariableDeclInstruction) => string): void {
        const { typeName, length, usage } = type(src.type);
        const name = rename ? rename(src) : src.name;

        usage && kw(usage);
        kw(typeName);
        kw(name);
        length && add(`[${length}]`);
    }

    const attribute = (src: IVariableDeclInstruction) =>
        (kw('attribute'), vdecl(src, sname.attr), add(';'), nl());
    const varying = (src: IVariableDeclInstruction) =>
        (kw('varying'), vdecl(src, sname.varying), add(';'), nl());

    function prologue(def: IFunctionDefInstruction): void {
        begin();
        {
            for (const param of def.params) {
                if (param.isUniform()) {
                    continue;
                }

                const type = param.type;

                add(`/* ${param.toCode()}; */`);
                nl();

                if (!type.isComplex()) {
                    assert(type.isNotBaseArray());
                    attribute(param);
                    continue;
                }

                type.fields.forEach(field => {
                    assert(!field.type.isNotBaseArray() && !field.type.isComplex());
                    attribute(field);
                });
            }
        }
        end();

        begin();
        {
            for (const param of def.params) {
                if (!param.isUniform()) {
                    continue;
                }

                vdecl(param);
            }
        }
        end();


        begin();
        {
            const retType = def.returnType;
            assert(retType.isComplex(), 'basic types unsupported yet');

            retType.fields.forEach(field => {
                assert(!field.type.isNotBaseArray() && !field.type.isComplex());
                varying(field);
            });
        }
        end();
    }

    function func(fn: IFunctionDeclInstruction) {
        const omitParameters = isMain();
        const def = fn.def;
        const { typeName } = type(def.returnType);
        kw(typeName);
        kw(fn.name);
        add('(');
        if (!omitParameters) {
            def.params.forEach((param, i, list) => {
                vdecl(param);
                (i + 1 != list.length) && add(',');
            });
        }
        add(')');
        nl();
        block(fn.impl);
    }

    function decl(dcl: IDeclInstruction) {
        switch (dcl.instructionType) {
            case EInstructionTypes.k_VariableDeclInstruction:
                vdecl(dcl as IVariableDeclInstruction);
                add(';');
                break;
        }
    }

    function expression(expr: IExprInstruction) {
        if (!expr) {
            return;
        }

        /*
        | IArithmeticExprInstruction
        | ICastExprInstruction
        | ICompileExprInstruction
        | IComplexExprInstruction
        | IConditionalExprInstruction
        | IInitExprInstruction
        | ILiteralInstruction
        | ILogicalExprInstruction
        | IPostfixArithmeticInstruction
        | IPostfixIndexInstruction
        | IRelationalExprInstruction
        | ISamplerStateBlockInstruction
        | IUnaryExprInstruction;
        */
        switch (expr.instructionType) {
            case EInstructionTypes.k_ArithmeticExprInstruction:
                arithmetic(expr as IArithmeticExprInstruction);
                break;
            case EInstructionTypes.k_AssignmentExprInstruction:
                assigment(expr as IAssignmentExprInstruction);
                break;
            case EInstructionTypes.k_PostfixPointInstruction:
                {
                    const pfxp = expr as IPostfixPointInstruction;
                    if (isAttributeAlias(pfxp)) {
                        kw(sname.attr(pfxp.postfix.decl));
                        return;
                    }
                }
                postfixPoint(expr as IPostfixPointInstruction);
                return;
            case EInstructionTypes.k_IdExprInstruction:
                identifier(expr as IIdExprInstruction);
                return;
            case EInstructionTypes.k_FunctionCallInstruction:
                fcall(expr as IFunctionCallInstruction);
                return;
            case EInstructionTypes.k_ConstructorCallInstruction:
                ccall(expr as IConstructorCallInstruction);
                return;
            case EInstructionTypes.k_FloatInstruction:
                {
                    const lit = expr as ILiteralInstruction<number>;
                    const sval = String(lit.value);
                    kw(sval);
                    (sval.indexOf('.') === -1) && add('.');
                    add('f');
                }
                return;
            case EInstructionTypes.k_IntInstruction:
                {
                    const lit = expr as ILiteralInstruction<number>;
                    kw(lit.value.toFixed(0));
                }
                return;
            case EInstructionTypes.k_BoolInstruction:
                {
                    const lit = expr as ILiteralInstruction<boolean>;
                    kw(lit.value ? 'true' : 'false');
                }
                return;
        }
    }

    function arithmetic(arthm: IArithmeticExprInstruction) {
        expression(arthm.left);
        kw(arthm.operator);
        expression(arthm.right);
    }

    function assigment(asgm: IAssignmentExprInstruction) {
        expression(asgm.left);
        kw('=');
        assert(Instruction.isExpression(asgm.right));
        expression(asgm.right as IExprInstruction);
    }

    function isAttributeAlias(pfxp: IPostfixPointInstruction) {
        if (isMain()) {
            if (pfxp.element.instructionType === EInstructionTypes.k_IdExprInstruction) {
                const id = pfxp.element as IdExprInstruction;
                if (id.decl.isParameter() && !id.decl.isUniform()) {
                    return true;
                }
            }
        }
        return false;
    }

    function postfixPoint(pfxp: IPostfixPointInstruction) {
        expression(pfxp.element);
        add('.');
        add(pfxp.postfix.name);
    }

    const knownGlobals: string[] = [];
    function identifier(id: IIdExprInstruction) {
        const decl = id.decl;
        const name = id.name;


        // if (isMain() && decl.isParameter() && !decl.isUniform()) {
        // TODO: add support of main arguments with basic types (attributes)
        // }

        const isUniformArg = isMain() && decl.isParameter() && decl.isUniform();

        if (decl.isGlobal() || isUniformArg) {
            assert(decl.isUniform());

            if (knownGlobals.indexOf(name) === -1) {
                begin();
                vdecl(decl);
                add(';');
                nl();
                end();
                knownGlobals.push(name);
            }
        }

        kw(name);
    }

    function retStmt(stmt: IReturnStmtInstruction) {
        kw('return');
        expression(stmt.expr);
        add(';');
    }

    function ccall(call: IConstructorCallInstruction) {
        const args = call.args as IExprInstruction[];
        const { typeName } = type(call.ctor);

        kw(typeName);
        add('(');
        args.forEach((arg, i, list) => {
            expression(arg);
            (i + 1 != list.length) && add(',');
        });
        add(' )');
    }

    function fcall(call: IFunctionCallInstruction) {
        const decl = call.decl;
        const args = call.args;

        switch (decl.name) {
            case 'mul':
                assert(args.length == 2);
                expression(args[0]);
                kw('*');
                expression(args[1]);
                return;
        }

        kw(decl.name);
        add('(');
        args.forEach((arg, i, list) => {
            expression(arg);
            (i + 1 != list.length) && add(',');
        });
        add(' )');
    }

    function block(blk: IStmtBlockInstruction) {
        add('{');
        push();

        /*
            | IDeclStmtInstruction
            | IReturnStmtInstruction
            | IIfStmtInstruction
            | IStmtBlockInstruction
            | IExprStmtInstruction
            | IWhileStmtInstruction
            | IForStmtInstruction;
        */

        blk.stmtList.forEach(stmt => {
            switch (stmt.instructionType) {
                case EInstructionTypes.k_DeclStmtInstruction:
                    (stmt as IDeclStmtInstruction).declList.forEach(dcl => (decl(dcl), nl()));
                    break;
                case EInstructionTypes.k_ExprStmtInstruction:
                    expression((stmt as IExprStmtInstruction).expr);
                    add(';');
                    nl();
                    break;
                case EInstructionTypes.k_ReturnStmtInstruction:
                    retStmt(stmt as IReturnStmtInstruction);
                    nl();
                    break;
            }
        });

        pop();
        add('}');
    }

    prologue(fn.def);

    begin();
    func(fn);
    end();

    begin();
    {
        add('void main(void)');
        add('{');
        push();
        {
            const def = fn.def;
            const retType = def.returnType;
            assert(retType.isComplex());

            const tempName = 'temp';

            const { typeName } = type(retType);
            kw(typeName);
            kw(tempName);
            kw('=');
            kw(fn.name);
            add('()');
            add(';');
            nl();

            retType.fields.forEach(field => {
                kw(sname.varying(field));
                kw('=');
                kw(tempName);
                add('.');
                add(field.name);
                add(';');
                nl();
            });
        }
        pop();
        add('}');
    }
    end();
}


export function translate(entryFunc: IFunctionDeclInstruction, options: IOptions): string {
    const ctx = ContextBuilder();

    $emit(ctx, entryFunc);

    switch (options.type) {
        case 'vertex':
        case 'pixel':
            break;
        default:
            console.error('unsupported shader type');
    }

    return ctx.toString();
}


