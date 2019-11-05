import { IFunctionDeclInstruction, IFunctionDefInstruction, IVariableDeclInstruction, ITypeInstruction, EInstructionTypes, IVariableTypeInstruction } from "@lib/idl/IInstruction";
import { assert, isDef, mwalk } from "@lib/common";
import { IMap } from "@lib/idl/IMap";
import { visitor } from "@lib/fx/Visitors";
import { IOutput, Output } from './Output';
import { EGlslType, IGlslType, IGlslVariable, EGlslVariableUsage } from "./IGlsl";


const GlslTypeNames = {
    [EGlslType.k_Float_f32]: 'float',
    [EGlslType.k_Int_i32]: 'int',
    [EGlslType.k_Vec2_f32]: 'vec2',
    [EGlslType.k_Vec3_f32]: 'vec3',
    [EGlslType.k_Vec4_f32]: 'vec4',
    [EGlslType.k_Struct]: 'struct'
}



const sname = {
    attr: (decl: IVariableDeclInstruction) => decl.semantics ?
        `a_${decl.semantics.toLowerCase()}` :
        `a_${decl.name}_${decl.instructionID}`,
    varying: (decl: IVariableDeclInstruction) => decl.semantics ?
        `v_${decl.semantics.toLowerCase()}` :
        `v_${decl.name}_${decl.instructionID}`,
    uniform: (decl: IVariableDeclInstruction) => `u_${decl.name}`
};


interface IStackEntry {
    fn: IFunctionDeclInstruction;
}


function ContextBuilder() {

    const stack: IStackEntry[] = [];
    const out = Output();

    const complexTypes: IMap<IGlslType> = {};
    const attributes: IMap<IGlslVariable> = {};
    const uniforms: IMap<IGlslVariable> = {};
    const varyings: IMap<IGlslVariable> = {};

    const depth = () => stack.length;
    const toString = () => out.toString();

    function push(fn: IFunctionDeclInstruction) {
        if (!stack.length) {
            printPrologue();
        }
        stack.push({ fn });
    }


    function pop() {
        stack.pop();
        if (!stack.length) {
            printEpilogue();
        }
    }

    function variable(src: IVariableDeclInstruction, rename?: (decl: IVariableDeclInstruction) => string): IGlslVariable {
        const type = rtype(src.type);
        const name = rename ? rename(src) : src.name;
        return { name, type };
    }

    function attribute(src: IVariableDeclInstruction): IGlslVariable {
        assert(!src.type.isNotBaseArray() && !src.type.isComplex());
        const attr = variable(src, sname.attr);

        assert(!isDef(attributes[attr.name]));
        attributes[attr.name] = attr;

        return attr;
    }

    function uniform(src: IVariableDeclInstruction): IGlslVariable {
        assert(src.isUniform());
        const uniform = variable(src, sname.uniform);

        assert(!isDef(uniforms[uniform.name]));
        uniforms[uniform.name] = uniform;

        return uniform;
    }

    function varying(src: IVariableDeclInstruction): IGlslVariable {
        assert(!src.type.isNotBaseArray() && !src.type.isComplex());

        const varying = variable(src, sname.varying);

        assert(!isDef(varyings[varying.name]));
        varyings[varying.name] = varying;

        return varying;
    }


    function rtype(src: ITypeInstruction, allowCaching: boolean = true): IGlslType {
        let complex = src.isComplex();

        let length: number;
        let name: string;
        let type: EGlslType;
        let fields: IGlslVariable[];
        // let usages: EGlslVariableUsage[];

        if (!complex) {
            switch (src.name) {
                case 'float':
                    type = EGlslType.k_Float_f32;
                    break;
                case 'int':
                    type = EGlslType.k_Int_i32;
                    break;
                case 'float2':
                    type = EGlslType.k_Vec2_f32;
                    break;
                case 'float3':
                    type = EGlslType.k_Vec3_f32;
                    break;
                case 'float4':
                    type = EGlslType.k_Vec4_f32;
                    break;
                default:
                    assert(false, 'unknown built in type found');
                    return null;
            }
        } else {
            type = EGlslType.k_Struct;
            name = src.name;
            fields = src.fields.map(field => ({
                name: field.name,
                type: rtype(field.type)
            }));
        }

        if (src.isNotBaseArray()) {
            length = src.length;
        }

        // if (src.instructionType === EInstructionTypes.k_VariableTypeInstruction) {
        //     (src as IVariableTypeInstruction).usageList.forEach(usage => {
        //         usages = usages || [];
        //         switch (usage) {
        //             case 'uniform':
        //                 break;
        //             case 'const':
        //         }
        //     });
        // }

        const dest: IGlslType = { length, type, name, fields };

        if (complex && allowCaching) {
            if (!isDef(complexTypes[name])) {
                complexTypes[name] = dest;
            }
        }

        return dest;
    }


    // function printVar(v: IGlslVariable) {
    //     const { keyword: kw } = out;
    //     kw(v.type.type === EGlslType.k_Struct ? v.type.name : GlslTypeNames[v.type.type]),
    //     kw(v.name)
    // }

    function printPrologue() {
        const { newline: nl, keyword: kw, add, push, pop } = out;

        const variable = (v: IGlslVariable) => (
            kw(v.type.type === EGlslType.k_Struct ? v.type.name : GlslTypeNames[v.type.type]),
            kw(v.name)
        );

        const complexType = (type: IGlslType) => (
            kw('struct'),
            add(name),
    
            nl(),
            add('{'),
            push(),
            type.fields.forEach(field => variable(field)),
            pop(),
            add('}')
        );

        const attribute = (attr: IGlslVariable) => (kw('attribute'), variable(attr));
        const uniform = (uni: IGlslVariable) => (kw('uniform'), variable(uni));
        const varying = (vary: IGlslVariable) => (kw('varying'), variable(vary));

        add('precision highp float;');
        nl(2);
        mwalk(complexTypes, type => (complexType(type), add(';'), nl(2) ));
        nl(2);
        mwalk(attributes, attr => (attribute(attr), add(';'), nl()));
        nl(2);
        mwalk(uniforms, uni => (uniform(uni), add(';'), nl()));
        nl(2);
        mwalk(varyings, vary => (varying(vary), add(';'), nl()));

        add('void main(void)');
        nl();
        add('{');
        push();
    }



    function printEpilogue() {
        const { newline: nl, keyword: kw, add, push, pop } = out;

        pop();
        add('}');
        nl();
    }


    return {
        push,
        pop,
        depth,
        rtype,

        // variable,
        attribute,
        uniform,
        varying,

        toString
    };
}


type IContext = ReturnType<typeof ContextBuilder>;

type IOptions = {
    type: 'vertex' | 'pixel';
};


function preloadAttributes(ctx: IContext, param: IVariableDeclInstruction) {
    const { attribute } = ctx;

    const type = param.type;

    if (!type.isComplex()) {
        attribute(param);
        return;
    }

    type.fields.forEach(field => attribute(field));
}


function preloadVaryings(ctx: IContext, def: IFunctionDefInstruction) {
    const { varying } = ctx;

    if (!def.returnType.isComplex()) {
        assert(false, 'only complex return type supported for vertex shader');
        return;
    }

    const type = def.returnType;
    type.fields.forEach(field => varying(field));
}


function preloadEntry(ctx: IContext, fn: IFunctionDeclInstruction) {
    const { depth, uniform } = ctx;
    const def = fn.definition;

    assert(depth() === 0);

    for (const param of def.paramList) {
        if (param.isUniform()) {
            uniform(param);
            continue;
        }

        preloadAttributes(ctx, param);
    }

    preloadVaryings(ctx, def);
}



function translateVertexShader(ctx: IContext, fn: IFunctionDeclInstruction): string {
    const { push, pop } = ctx;

    preloadEntry(ctx, fn);

    push(fn);

    visitor(fn.implementation, instr => {
        switch (instr.instructionType) {
            case EInstructionTypes.k_VariableDeclInstruction:
            // variable(instr as IVariableDeclInstruction)
        }
    });

    pop();

    return ctx.toString();
}


export function translate(entryFunc: IFunctionDeclInstruction, options: IOptions): string {
    const ctx = ContextBuilder();

    switch (options.type) {
        case 'vertex':
            return translateVertexShader(ctx, entryFunc);
        case 'pixel':
        default:
            console.error('unsupported shader type');
    }

    return null;
}


