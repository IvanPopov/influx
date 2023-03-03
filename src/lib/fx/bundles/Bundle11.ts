import { assert } from "@lib/common";
import * as Bytecode from "@lib/fx/bytecode/Bytecode";
import { typeAstToTypeLayout } from "@lib/fx/bytecode/VM/native";
import * as TSVM from "@lib/fx/bytecode/VM/ts/bundle";
import { CodeConvolutionContext, CodeConvolutionEmitter } from '@lib/fx/translators/CodeConvolutionEmitter';
import { CodeContextMode } from "@lib/fx/translators/CodeEmitter";
import { IFxContextExOptions } from "@lib/fx/translators/FxTranslator";
import { EChunkType } from "@lib/idl/bytecode";
import { ITechnique11Instruction } from "@lib/idl/IInstruction";
import { isDef } from "@lib/util/s3d/type";
import { ConvolutionPackEx } from "./utils";

import * as flatbuffers from "flatbuffers";

import { BundleT } from "@lib/idl/bundles/auto/fx/bundle";
import { BundleContent } from "@lib/idl/bundles/auto/fx/bundle-content";
import { BundleMetaT } from "@lib/idl/bundles/auto/fx/bundle-meta";
import { BundleSignatureT } from "@lib/idl/bundles/auto/fx/bundle-signature";
import { PresetT } from "@lib/idl/bundles/auto/fx/preset";
import { Shader } from "@lib/idl/bundles/auto/fx/shader";
import { Technique11BundleT } from "@lib/idl/bundles/auto/fx/technique11bundle";
import { Technique11RenderPassT } from "@lib/idl/bundles/auto/fx/technique11render-pass";
import { UIControlT } from "@lib/idl/bundles/auto/fx/uicontrol";
import { CBBundleT, PixelShaderT, VertexShaderT } from "@lib/idl/bundles/auto/technique11_generated";
import { TypeFieldT } from "@lib/idl/bundles/auto/type-field";


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


// import { createSLASTDocument } from "@lib/fx/SLASTDocument";

async function createTechnique11Bundle(tech: ITechnique11Instruction, opts: Bundle11Options = {}, convPack: ConvolutionPackEx = {}): Promise<Uint8Array | BundleT> {

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
                const scope = tech.scope;
                const entryFn = scope.findFunction(name, null);
                
                const params = entryFn.def.params;
                assert(args.every((_, i) => [ ...params ].reverse()[i].type.name === [ ...args ].reverse()[i].type), 
                    'entry function doesn\'t match uniform arguments');
                
                const mode = <CodeContextMode>ver.substring(0, 2);
                assert(['vs', 'ps', 'gs'].includes(mode), `invalid mode: "${mode}"`);

                const ctx = new CodeConvolutionContext({ ...convPack, mode });
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

                // console.log(sourceCode);

                // {
                //     const textDocument = await createTextDocument('://raw', sourceCode);
                //     const slDocument = await createSLDocument(textDocument);
                //     const scope = slDocument.root.scope;
                //     const ctx = new GLSLContext({ mode: 'vs' });
                //     const codeGLSL = GLSLEmitter.translate(scope.findFunction(name, null), ctx); // raw hlsl
                //     console.log(codeGLSL);
                // }
            }
        }

        passes.push(new Technique11RenderPassT([ ...code ], shaderTypes, shaders));
    };

    ///////////////////////////////////

    const { name } = tech;
    opts.name ||= name;

    const tech11 = new Technique11BundleT(passes);

    const { meta } = opts;
    const bundle = createFxBundle(opts.name, BundleContent.Technique11Bundle, tech11, new BundleMetaT(meta?.author, meta?.source));

    return finalizeBundle(bundle, opts);
}


export async function createBundle(fx: ITechnique11Instruction, options?: Bundle11Options, convPack?: ConvolutionPackEx): Promise<Uint8Array | BundleT> {
    return createTechnique11Bundle(fx, options, convPack);
}


