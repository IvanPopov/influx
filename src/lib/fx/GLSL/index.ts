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

function createBaseEmitter() {

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



interface ITypeInfo {
    typeName: string;
    length: number;
    usage?: string;
}

function createCodeEmitter(ctx = createBaseEmitter()) {
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

    const knownGlobals: string[] = [];
    const knownTypes: string[] = [];

    const isMain = () => depth() === 0;

    function resolveTypeName(type: ITypeInstruction): string {
        const typeName = GlslTypeNames[type.name];
        if (!isDef(typeName)) {
            assert(false, 'unknown built in type found');
            return null;
        }

        return typeName;
    }


    function resolveType(type: ITypeInstruction): ITypeInfo {
        let complex = type.isComplex();

        let length: number;
        let typeName: string;
        let usages: string[];
        let usage: string;

        if (!complex) {
            typeName = resolveTypeName(type);
        } else {
            typeName = type.name;

            if (knownTypes.indexOf(typeName) === -1) {
                begin();
                emitComplexType(type);
                end();

                knownTypes.push(typeName);
            }
        }

        if (type.instructionType === EInstructionTypes.k_VariableTypeInstruction) {
            const vtype = type as IVariableTypeInstruction;
            if (vtype.isUniform()) {
                usages = usages || [];
                usages.push('uniform');
            }
        }

        if (type.isNotBaseArray()) {
            length = type.length;
        }

        if (usages) {
            usage = usages.join(' ');
        }

        return { typeName, length, usage };
    }


    function emitComplexType(ctype: ITypeInstruction) {
        assert(ctype.isComplex());

        kw('struct');
        kw(ctype.name);
        nl();
        add('{');
        push();

        ctype.fields.map(field => (emitStmt(field), nl()));

        pop();
        add('}');
    }


    function emitVariableDecl(src: IVariableDeclInstruction, rename?: (decl: IVariableDeclInstruction) => string): void {
        const { typeName, length, usage } = resolveType(src.type);
        const name = rename ? rename(src) : src.name;

        usage && kw(usage);
        kw(typeName);
        kw(name);
        length && add(`[${length}]`);
    }

    const attribute = (src: IVariableDeclInstruction) =>
        (kw('attribute'), emitVariableDecl(src, sname.attr), add(';'), nl());
    const varying = (src: IVariableDeclInstruction) =>
        (kw('varying'), emitVariableDecl(src, sname.varying), add(';'), nl());

    function emitPrologue(def: IFunctionDefInstruction): void {
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

                emitVariableDecl(param);
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

    function emitFunction(fn: IFunctionDeclInstruction) {
        const def = fn.def;
        const retType = def.returnType;
        const { typeName } = resolveType(def.returnType);

        if (isMain()) {
            emitPrologue(fn.def);

            // emit original function witout parameters
            begin();
            {
                kw(typeName);
                kw(fn.name);
                add('(');
                add(')');
                nl();
                emitBlock(fn.impl);
            }
            end();

            // emit main()
            begin();
            {
                add('void main(void)');
                nl();
                add('{');
                push();
                {
                  
                    assert(retType.isComplex());

                    const tempName = 'temp';

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
            return;
        }

        begin();
        {
            kw(typeName);
            kw(fn.name);
            add('(');
            def.params.forEach((param, i, list) => {
                emitVariableDecl(param);
                (i + 1 != list.length) && add(',');
            });
            add(')');
            nl();
            emitBlock(fn.impl);
        }
        end();
    }

    function emitExpression(expr: IExprInstruction) {
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
        | ILogicalExprInstruction
        | IPostfixArithmeticInstruction
        | IPostfixIndexInstruction
        | IRelationalExprInstruction
        | ISamplerStateBlockInstruction
        | IUnaryExprInstruction;
        */
        switch (expr.instructionType) {
            case EInstructionTypes.k_ArithmeticExprInstruction:
                return emitArithmetic(expr as IArithmeticExprInstruction);
            case EInstructionTypes.k_AssignmentExprInstruction:
                return emitAssigment(expr as IAssignmentExprInstruction);
            case EInstructionTypes.k_PostfixPointInstruction:
                {
                    const pfxp = expr as IPostfixPointInstruction;
                    if (isAttributeAlias(pfxp)) {
                        kw(sname.attr(pfxp.postfix.decl));
                        return;
                    }
                }
                return emitPostfixPoint(expr as IPostfixPointInstruction);
            case EInstructionTypes.k_IdExprInstruction:
                return emitIdentifier(expr as IIdExprInstruction);
            case EInstructionTypes.k_FunctionCallInstruction:
                return emitFCall(expr as IFunctionCallInstruction);
            case EInstructionTypes.k_ConstructorCallInstruction:
                return emitCCall(expr as IConstructorCallInstruction);
            case EInstructionTypes.k_FloatInstruction:
                return emitFloat(expr as ILiteralInstruction<number>);
            case EInstructionTypes.k_IntInstruction:
                return emitInteger(expr as ILiteralInstruction<number>);
            case EInstructionTypes.k_BoolInstruction:
                return emitBool(expr as ILiteralInstruction<boolean>);
        }
    }

    function emitFloat(lit: ILiteralInstruction<number>) {
        const sval = String(lit.value);
        kw(sval);
        (sval.indexOf('.') === -1) && add('.');
        add('f');
    }

    function emitBool(lit: ILiteralInstruction<boolean>) {
        kw(lit.value ? 'true' : 'false');
    }

    function emitInteger(lit: ILiteralInstruction<number>) {
        kw(lit.value.toFixed(0));
    }

    function emitArithmetic(arthm: IArithmeticExprInstruction) {
        emitExpression(arthm.left);
        kw(arthm.operator);
        emitExpression(arthm.right);
    }

    function emitAssigment(asgm: IAssignmentExprInstruction) {
        emitExpression(asgm.left);
        kw('=');
        assert(Instruction.isExpression(asgm.right));
        emitExpression(asgm.right as IExprInstruction);
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

    function emitPostfixPoint(pfxp: IPostfixPointInstruction) {
        emitExpression(pfxp.element);
        add('.');
        add(pfxp.postfix.name);
    }


    function emitIdentifier(id: IIdExprInstruction) {
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
                emitStmt(decl);
                end();
                knownGlobals.push(name);
            }
        }

        kw(name);
    }


    function emitCCall(call: IConstructorCallInstruction) {
        const args = call.args as IExprInstruction[];
        const { typeName } = resolveType(call.ctor);

        kw(typeName);
        add('(');
        args.forEach((arg, i, list) => {
            emitExpression(arg);
            (i + 1 != list.length) && add(',');
        });
        add(' )');
    }

    const intrinsics = {
        mul(left: IExprInstruction, right: IExprInstruction) {
            emitExpression(left);
            kw('*');
            emitExpression(right);
        }
    }

    function emitFCall(call: IFunctionCallInstruction) {
        const decl = call.decl;
        const args = call.args;

        switch (decl.name) {
            case 'mul':
                assert(args.length == 2);
                intrinsics.mul(args[0], args[1]);
                return;
        }

        kw(decl.name);
        add('(');
        args.forEach((arg, i, list) => {
            emitExpression(arg);
            (i + 1 != list.length) && add(',');
        });
        add(' )');
    }

    /*
        | IDeclStmtInstruction
        | IReturnStmtInstruction
        | IIfStmtInstruction
        | IStmtBlockInstruction
        | IExprStmtInstruction
        | IWhileStmtInstruction
        | IForStmtInstruction;
    */
    function emitStmt(stmt: IInstruction) {
        switch (stmt.instructionType) {
            case EInstructionTypes.k_DeclStmtInstruction:
                (stmt as IDeclStmtInstruction).declList.forEach(dcl => (emitStmt(dcl), nl()));
                break;
            case EInstructionTypes.k_ExprStmtInstruction:
                emitExpression((stmt as IExprStmtInstruction).expr);
                add(';');
                break;
            case EInstructionTypes.k_ReturnStmtInstruction:
                kw('return');
                emitExpression((stmt as IReturnStmtInstruction).expr);
                add(';');
                break;
            case EInstructionTypes.k_VariableDeclInstruction:
                emitVariableDecl(stmt as IVariableDeclInstruction);
                add(';');
                break;
        }
    }

    function emitBlock(blk: IStmtBlockInstruction) {
        add('{');
        push();
        blk.stmtList.forEach(stmt => (emitStmt(stmt), nl()));
        pop();
        add('}');
    }

    return {
        isMain,

        resolveTypeName,
        resolveType,

        emitComplexType,
        emitVariableDecl,
        emitPrologue,
        emitFunction,
        emitExpression,
        emitFloat,
        emitBool,
        emitInteger,
        emitArithmetic,
        emitAssigment,
        emitIdentifier,
        emitCCall,
        emitFCall,
        emitStmt,
        emitBlock,

        ...ctx
    }
}

type ICodeEmitter = ReturnType<typeof createCodeEmitter>;

type IOptions = {
    type: 'vertex' | 'pixel';
};


export function translate(entryFunc: IFunctionDeclInstruction, options: IOptions): string {

    switch (options.type) {
        case 'vertex':
        case 'pixel':
            break;
        default:
            console.error('unsupported shader type');
    }

    const emitter: ICodeEmitter = createCodeEmitter();
    emitter.emitFunction(entryFunc);

    return emitter.toString();
}


