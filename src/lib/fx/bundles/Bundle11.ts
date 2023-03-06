import { assert } from "@lib/common";
import * as Bytecode from "@lib/fx/bytecode/Bytecode";
import { typeAstToTypeLayout } from "@lib/fx/bytecode/VM/native";
import * as TSVM from "@lib/fx/bytecode/VM/ts/bundle";
import { createSLASTDocument } from "@lib/fx/SLASTDocument";
import { createSLDocument } from "@lib/fx/SLDocument";
import { createTextDocument } from "@lib/fx/TextDocument";
import { CodeConvolutionContext, CodeConvolutionEmitter } from "@lib/fx/translators/CodeConvolutionEmitter";
import { CodeContextMode } from "@lib/fx/translators/CodeEmitter";
import { FxTranslator, FxTranslatorContext, IFxContextExOptions, IUIControl } from "@lib/fx/translators/FxTranslator";
import { TypeFieldT } from "@lib/idl/bundles/auto/type-field";
import { EChunkType } from "@lib/idl/bytecode";
import { ITechnique11Instruction } from "@lib/idl/IInstruction";
import { Diagnostics } from "@lib/util/Diagnostics";
import { isDef } from "@lib/util/s3d/type";
import { ConvolutionPackEx, encodeControlValue, encodePropertyValue, controlValueFromString, propertyValueFromString } from "./utils";

import * as flatbuffers from "flatbuffers";

import { CBBundleT } from "@lib/idl/bundles/auto/cbbundle";
import { BundleT } from "@lib/idl/bundles/auto/fx/bundle";
import { BundleContent } from "@lib/idl/bundles/auto/fx/bundle-content";
import { BundleMetaT } from "@lib/idl/bundles/auto/fx/bundle-meta";
import { BundleSignatureT } from "@lib/idl/bundles/auto/fx/bundle-signature";
import { PixelShaderT } from "@lib/idl/bundles/auto/fx/pixel-shader";
import { PresetT } from "@lib/idl/bundles/auto/fx/preset";
import { Shader } from "@lib/idl/bundles/auto/fx/shader";
import { Technique11BundleT } from "@lib/idl/bundles/auto/fx/technique11bundle";
import { Technique11RenderPassT } from "@lib/idl/bundles/auto/fx/technique11render-pass";
import { UIControlT } from "@lib/idl/bundles/auto/fx/uicontrol";
import { VertexShaderT } from "@lib/idl/bundles/auto/fx/vertex-shader";
import { ViewTypePropertyT } from "@lib/idl/bundles/auto/fx/view-type-property";

/** Create flatbuffers controls from native translator description. */
function createFxControls(controls: IUIControl[]): UIControlT[] {
    return controls.map(ctrl => {
        const props = ctrl.properties.map(prop => new ViewTypePropertyT(
            prop.name, 
            propertyValueFromString(prop.type), 
            encodePropertyValue(prop.type, prop.value)
        ));
        return new UIControlT(
            ctrl.name, 
            controlValueFromString(ctrl.type), 
            encodeControlValue(ctrl.type, ctrl.value), 
            props);
    });
}


export interface Bundle11Options {
    packed?: boolean;
    meta?: {
        author: string;
        source: string;
    };
    name?: string;
    // deprecated?
    translator?: IFxContextExOptions;
}


/// <reference path="../../webpack.d.ts" />
function createFxBundle(name: string, type: BundleContent, data: Technique11BundleT, meta = new BundleMetaT, controls?: UIControlT[], presets?: PresetT[]): BundleT {
    const signature = new BundleSignatureT(MODE, VERSION, COMMITHASH, BRANCH, TIMESTAMP);
    return new BundleT(name, signature, meta, type, data, controls, presets);
}


function finalizeBundle(bundle: BundleT, opts: Bundle11Options = {}): Uint8Array | BundleT {
    // get unpacked version
    // --------------------------------

    let { packed = true } = opts;

    if (!packed)
        return bundle;

    // get packed version
    // --------------------------------

    let fbb = new flatbuffers.Builder();
    let end = bundle.pack(fbb);
    fbb.finish(end);

    return fbb.asUint8Array();
}


/**
 * Pipeline:
 *  1. Translate the whole technique to raw hlsl
 *     in order to unwrap fx types (like trimeshes)
 *     and collect autogen buffers (like controls, global & local uniforms).
 *  2. Iterate over pass code to find all used shaders to print raw per 
 *     shader hlsl code with precise reflections (used cbuffers).
 *  3. Wrap with flatbuffers.
 */
async function createTechnique11Bundle(tech: ITechnique11Instruction, opts: Bundle11Options = {}, 
    convPack: ConvolutionPackEx = {}): Promise<Uint8Array | BundleT> {
    const ctx = new FxTranslatorContext({ ...opts.translator, ...convPack });
    const codeRaw =  FxTranslator.translate(tech, ctx);
    const passes: Technique11RenderPassT[] = [];
    for (const pass11 of tech.passes) {
        const { program } = Bytecode.translate(pass11);
        // depth, stencil, rasterizer and blend states are already serialized
        // as part of code binary
        const { code, cdl } = program;
        const chunks = TSVM.decodeChunks(code);
        const shaderChunk = chunks[EChunkType.k_Shaders];

        const shaderTypes: Shader[] = [];
        const shaders : (PixelShaderT | VertexShaderT)[] = [];

        if (isDef(shaderChunk)) {
            const descs = TSVM.decodeShadersChunk(shaderChunk);
            for (const desc of descs) {
                const { ver, args, name } = desc;
                console.warn(`compile shader <${name}> -v ${ver}`, args);

                // it's assumed that all the shaders places in the same scope for now
                // (near the technique it'self in other words - not imported)
                
                {
                    const scope = tech.scope;
                    const entryFn = scope.findFunction(name, null);
                    const params = entryFn.def.params;
                    assert(args.every((_, i) => [ ...params ].reverse()[i].type.name === [ ...args ].reverse()[i].type), 
                        'entry function doesn\'t match uniform arguments');
                }

                const mode = <CodeContextMode>ver.substring(0, 2);
                assert(['vs', 'ps', 'gs'].includes(mode), `invalid mode: "${mode}"`);

                // translate per shader in order to extract precise reflection
                const textDocument = await createTextDocument(`file://${tech.name}///${name}.fx`, codeRaw);
                const slastDocument = await createSLASTDocument(textDocument, convPack);
                const slDocument = await createSLDocument(slastDocument);

                const convPackSh = new ConvolutionPackEx(textDocument, slastDocument, 
                    convPack.includeResolver, convPack.defines);
            
                if (slDocument.diagnosticReport.errors) {
                    console.error(Diagnostics.stringify(slDocument.diagnosticReport));
                    return null;
                }

                const scope = slDocument.root.scope;
                const entryFn = scope.findFunction(name, null);
                const ctx = new CodeConvolutionContext({ ...convPackSh, mode, constants: args });
                const sourceCode = CodeConvolutionEmitter.translate(entryFn, ctx);

                const cbuffers = ctx.cbuffers.map(({ name, register, size }) => {
                    const { type } = scope.findCbuffer(name);
                    const fields = type.fields.map(
                        f => new TypeFieldT(
                            typeAstToTypeLayout(f.type), 
                            f.name, 
                            f.semantic, 
                            f.type.size, 
                            f.type.padding
                        )
                    );
                    return new CBBundleT(name, register, size, fields);
                });

                let shaderType: Shader;
                let shader: VertexShaderT | PixelShaderT;
                switch (mode) {
                    case 'vs': 
                    let input = typeAstToTypeLayout(entryFn.def.params[0].type);
                    shaderType = Shader.VertexShader;
                    shader = new VertexShaderT(sourceCode, name, input, cbuffers);
                    break;
                    case 'ps':
                    shaderType = Shader.PixelShader;
                    shader = new PixelShaderT(sourceCode, name, cbuffers);
                    break;
                    default:
                        assert(false, 'not implemeted');
                }

                shaderTypes.push(shaderType);
                shaders.push(shader);
            }
        }

        passes.push(new Technique11RenderPassT([ ...code ], shaderTypes, shaders));
    };

    ///////////////////////////////////

    const { name } = tech;
    opts.name ||= name;

    const reflection = ctx.techniques11[0];
    const controls = createFxControls(reflection.controls);

    // todo: add presets support.
    // const presets = ...

    const tech11 = new Technique11BundleT(passes);

    const { meta } = opts;
    const bundle = createFxBundle(opts.name, BundleContent.Technique11Bundle, tech11, new BundleMetaT(meta?.author, meta?.source), controls);

    return finalizeBundle(bundle, opts);
}


export async function createBundle(fx: ITechnique11Instruction, options?: Bundle11Options, convPack?: ConvolutionPackEx): Promise<Uint8Array | BundleT> {
    return createTechnique11Bundle(fx, options, convPack);
}


