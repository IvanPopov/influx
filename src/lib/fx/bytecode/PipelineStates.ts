import { assert, isDef } from "@lib/common";
import { expression } from "@lib/fx/analisys/helpers";
import * as SystemScope from "@lib/fx/analisys/SystemScope";
import { IShader } from "@lib/idl/bytecode";
import { EComparisonFunc, EDepthWriteMask, EStencilOp, IDepthStencilState } from "@lib/idl/bytecode";
import { ERenderTargetFormats, IRenderTargetView } from "@lib/idl/bytecode/IRenderTargetView";
import { EInstructionTypes, ICompileShader11Instruction, ILiteralInstruction, IStateBlockInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";

function hash(csh: ICompileShader11Instruction): string {
    return `${csh.ver}-${csh.func.name}.${csh.func.instructionID}-${csh.args.map(a => expression.evalConst(a)).join(':')}`;
}

///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

export function createDepthStencilState(): IDepthStencilState {
    return {
        DepthEnable: true,
        DepthWriteMask: EDepthWriteMask.k_All,
        DepthFunc: EComparisonFunc.k_Less,
        StencilEnable: false,
        StencilReadMask: 0xff,
        StencilWriteMask: 0xff,
        FrontFace: {
            StencilFailOp: EStencilOp.k_Keep,
            StencilDepthFailOp: EStencilOp.k_Keep,
            StencilPassOp: EStencilOp.k_Keep,
            StencilFunc: EComparisonFunc.k_Always
        },
        BackFace: {
            StencilFailOp: EStencilOp.k_Keep,
            StencilDepthFailOp: EStencilOp.k_Keep,
            StencilPassOp: EStencilOp.k_Keep,
            StencilFunc: EComparisonFunc.k_Always
        }
    };
}

///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

const camelToSnakeCase = str => str?.length > 1 
    ? (str[0] + str.substring(1).replace(/[A-Z]/g, letter => `_${letter}`)).toLowerCase()
    : str;

function evalPropEnum(props: Object, key: string, enumObj: Object, defaultVal: number): number {
    if (!isDef(props[key])) {
        return defaultVal;
    }

    const knownKeys = Object.keys(enumObj);
    const keyIndex = knownKeys.map(k => camelToSnakeCase(k.substring(2)).toUpperCase()).indexOf(props[key].toUpperCase());
    assert(keyIndex !== -1);

    if (keyIndex == -1) {
        return defaultVal;
    }

    const keyName = knownKeys[keyIndex];
    const enumVal = enumObj[keyName];
    
    return enumVal;
}

function evalPropBool(props: Object, key: string, defaultVal: boolean) {
    enum EBool { k_False, k_True }
    return !!evalPropEnum(props, key, EBool, +defaultVal);
}

function evalNumber(props: Object, key: string, defaultVal: number) {
    if (!isDef(props[key])) {
        return defaultVal;
    }

    return Number(props[key]);
}

///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

interface IDepthStencilStateEntry {
    name: string;
    state: IDepthStencilState;
}

interface IRenderTargetViewEntry {
    name: string;
    view: IRenderTargetView;
}

interface IShaderEntry {
    id: number;
    shader: IShader;
}

export class PipelineStates {
    protected _knownShaders: IMap<IShaderEntry> = {};
    protected _knownDepthStencilStates: IDepthStencilStateEntry[] = [];
    protected _knownRenderTargetViews: IRenderTargetViewEntry[] = [];


    dumpShaders(): IShaderEntry[] {
        return Object.values(this._knownShaders).sort((a, b) => a.id - b.id);
    }


    dumpDepthStencilStates(): IDepthStencilState[] {
        return this._knownDepthStencilStates.map(entry => entry.state);
    }


    dumpRenderTargetViews(): IRenderTargetView[] {
        return this._knownRenderTargetViews.map(entry => entry.view);
    }


    derefShader11(csh: ICompileShader11Instruction): number {
        const { func, ver } = csh;
        const { name } = func;
        const key = hash(csh);
        const shaders = this._knownShaders;

        if (shaders[key]) {
            return shaders[key].id;
        }

        const id = Object.keys(shaders).length + 1; // '0' is reserved id for NULL shaders
        // todo: add support for complex constants/expressions like float4(1,2,3,4), complex types etc.
        const args = csh.args.map(arg => ({ type: arg.type.name, value: expression.evalConst(arg) }));
        shaders[key] = { id, shader: { name, ver, args } };
        return id;
    }


    deref(decl: IVariableDeclInstruction): number {
        if (SystemScope.isDepthStencilState(decl.type)) {
            return this.derefDethStencilState(decl);
        }

        if (SystemScope.isBlendState(decl.type)) {
            console.assert(false, 'blend state is not yet supported');
            return this.derefBlendState(decl);
        }

        if (SystemScope.isRasterizerState(decl.type)) {
            console.assert(false, 'raserizer state is not yet supported');
            return this.derefRasterizerState(decl);
        }

        if (SystemScope.isRenderTargetView(decl.type)) {
            return this.derefRenderTargetView(decl);
        }

        if (SystemScope.isDepthStencilView(decl.type)) {
            console.assert(false, 'DSV is not yet supported');
            return this.derefDepthStencilView(decl);
        }
        
        assert(false, `unknown pipeline state "${decl.type.name}" found`);
        return -1;
    }


    protected derefDethStencilState(decl: IVariableDeclInstruction): number {
        assert(!decl.type.isNotBaseArray(), 'DSS arrays are not yet unsupported (!)');
        assert(decl.isGlobal());

        const { name, type, initExpr } = decl;
        const entries = this._knownDepthStencilStates;
        const entryIndex = entries.findIndex(s => s.name === name);

        if (entryIndex !== -1) {
            return entryIndex;
        }

        const state = createDepthStencilState();
        const id = entries.length;
        entries.push({ name, state });

        if (initExpr) {
            assert(initExpr.instructionType === EInstructionTypes.k_StateBlockExpr);
            const props = (initExpr as IStateBlockInstruction).props;
            
            state.DepthEnable = evalPropBool(props, 'DepthEnable', state.DepthEnable);
            state.DepthWriteMask = evalPropEnum(props, 'DepthWriteMask', EDepthWriteMask, state.DepthWriteMask);
            state.DepthFunc = evalPropEnum(props, 'DepthFunc', EComparisonFunc, state.DepthFunc);

            state.StencilEnable = evalPropBool(props, 'StencilEnable', state.StencilEnable);
            state.StencilReadMask = evalNumber(props, 'StencilReadMask', state.StencilReadMask);
            state.StencilWriteMask = evalNumber(props, 'StencilWriteMask', state.StencilWriteMask);

            state.FrontFace.StencilFailOp = evalPropEnum(props, 'FrontFaceStencilFailOp', EStencilOp, state.FrontFace.StencilFailOp);
            state.FrontFace.StencilDepthFailOp = evalPropEnum(props, 'FrontFaceStencilDepthFailOp', EStencilOp, state.FrontFace.StencilDepthFailOp);
            state.FrontFace.StencilPassOp = evalPropEnum(props, 'FrontFaceStencilPassOp', EStencilOp, state.FrontFace.StencilPassOp);
            state.FrontFace.StencilFunc = evalPropEnum(props, 'FrontFaceStencilFunc', EComparisonFunc, state.FrontFace.StencilFunc);

            state.BackFace.StencilFailOp = evalPropEnum(props, 'BackFaceStencilFailOp', EStencilOp, state.BackFace.StencilFailOp);
            state.BackFace.StencilDepthFailOp = evalPropEnum(props, 'BackFaceStencilDepthFailOp', EStencilOp, state.BackFace.StencilDepthFailOp);
            state.BackFace.StencilPassOp = evalPropEnum(props, 'BackFaceStencilPassOp', EStencilOp, state.BackFace.StencilPassOp);
            state.BackFace.StencilFunc = evalPropEnum(props, 'BackFaceStencilFunc', EComparisonFunc, state.BackFace.StencilFunc);
        }
        
        return id;
    }


    protected derefBlendState(decl: IVariableDeclInstruction): number {
        return 0;
    }

    
    protected derefRasterizerState(decl: IVariableDeclInstruction): number {
        return 0;
    }


    protected derefRenderTargetView(decl: IVariableDeclInstruction): number {
        const { name, type, initExpr, annotation } = decl;
        const entries = this._knownRenderTargetViews;
        let id = entries.findIndex(s => s.name === name);

        if (id == -1) {
            id = entries.length;
            let texture = null;
            let format = ERenderTargetFormats.k_rgba8;

            annotation.decls.forEach(decl => {
                switch (decl.name) {
                    case 'format': {
                            const value = ((decl.initExpr as ILiteralInstruction<string>)?.value || 'rgba8').toLowerCase();
                            if (value === 'rgba8') format = ERenderTargetFormats.k_rgba8;
                            if (value === 'rgba32') format = ERenderTargetFormats.k_rgba32;
                        }
                        break;
                    case 'texture': {
                            const value = ((decl.initExpr as ILiteralInstruction<string>)?.value.slice(1, -1) || '');
                            assert(value, 'RTV texture must be explicitly defined!');
                            if (value) {
                                const texDecl = decl.scope.findVariable(value);
                                assert(texDecl && SystemScope.isTexture(texDecl.type));
                                texture = value;
                            }
                        }
                        break;
                }
            });

            const view = { name, texture, format };
            entries.push({ name, view });
        }

        return id + 1; // '0' is reserved id for NULL shaders
    }


    protected derefDepthStencilView(decl: IVariableDeclInstruction): number {
        return 0;
    }
}


export default PipelineStates;
