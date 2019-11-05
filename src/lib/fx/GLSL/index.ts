import { IFunctionDeclInstruction, IFunctionDefInstruction, IVariableDeclInstruction, ITypeInstruction, EInstructionTypes, IVariableTypeInstruction } from "@lib/idl/IInstruction";
import { assert, isDef, mwalk } from "@lib/common";
import { IMap } from "@lib/idl/IMap";
import { visitor } from "@lib/fx/Visitors";
import { IOutput, Output } from './Output';

enum EGlslType {
    k_Float_f32,
    k_Int_i32,
    k_Vec2_f32,
    k_Vec3_f32,
    k_Vec4_f32,
    k_Struct
};

const GlslTypeNames = {
    [EGlslType.k_Float_f32]: 'float',
    [EGlslType.k_Int_i32]: 'int',
    [EGlslType.k_Vec2_f32]: 'vec2',
    [EGlslType.k_Vec3_f32]: 'vec3',
    [EGlslType.k_Vec4_f32]: 'vec4',
    [EGlslType.k_Struct]: 'struct'
}

class IGlslType {
    type: EGlslType;
    name?: string;
    length?: number;
    fields?: IGlslVariable[];
}

interface IGlslVariable {
    name: string;
    type: IGlslType;
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

    const complexTypes: IMap<IGlslType> = {};
    const attributes: IMap<IGlslVariable> = {};
    const uniforms: IMap<IGlslVariable> = {};
    const varyings: IMap<IGlslVariable> = {};

    const depth = () => stack.length;

    function push(fn: IFunctionDeclInstruction) {
        stack.push({ fn });
    }


    function pop() {
        stack.pop();
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

        const dest: IGlslType = { length, type, name, fields };

        if (complex && allowCaching) {
            if (!isDef(complexTypes[name])) {
                complexTypes[name] = dest;
            }
        }

        return dest;
    }


    function print(): string {
        const out = Output();
        const { newline, keyword: kw, add, push, pop } = out;

        const variable = (v: IGlslVariable) => (
            kw(v.type.type === EGlslType.k_Struct ? v.type.name : GlslTypeNames[v.type.type]),
            kw(v.name)
        );

        const complexType = (type: IGlslType) => (
            kw('struct'),
            add(name),
    
            newline(),
            add('{'),
            push(),
            type.fields.forEach(field => variable(field)),
            pop(),
            add('}')
        );

        const attribute = (attr: IGlslVariable) => (kw('attribute'), variable(attr));
        const uniform = (attr: IGlslVariable) => (kw('uniform'), variable(attr));
        const varying = (attr: IGlslVariable) => (kw('varying'), variable(attr));

        add('precision highp float;');
        newline(2);

        mwalk(complexTypes, type => (complexType(type), add(';'), newline(2) ));

        newline(2);
        mwalk(attributes, attr => (attribute(attr), add(';'), newline()));

        newline(2);
        mwalk(uniforms, uni => (uniform(uni), add(';'), newline()));

        newline(2);
        mwalk(varyings, vary => (varying(vary), add(';'), newline()));

        return out.toString();
    }


    return {
        push,
        pop,
        depth,
        rtype,

        attribute,
        uniform,
        varying,

        print
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
    const { depth, attribute, uniform, rtype } = ctx;
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
    const { push, pop, print } = ctx;

    preloadEntry(ctx, fn);
    push(fn);

    visitor(fn.implementation, instr => {
        switch (instr.instructionType) {
            case EInstructionTypes.k_VariableDeclInstruction:

        }
    });

    pop();

    return print();
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


