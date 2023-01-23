import * as flatbuffers from 'flatbuffers';
import fs from 'fs';
import minimist from 'minimist';
import { Bundle, BundleContent, BundleT, EMatRenderRoutines, MatBundleT, RoutineBytecodeBundleT, RoutineGLSLSourceBundleT, RoutineHLSLSourceBundleT, RoutineShaderBundleT, RoutineSourceBundle } from '@lib/idl/bundles/FxBundle_generated';

const argv = minimist(process.argv);

function printHelp() {
    let m = [
      "No options needed!",
      "Just specify path to BFX file."
    ];

    console.log(m.join('\n'));
}

if (argv['help'] || argv['h']) {
    printHelp();
    process.exit(0);
}

function main() {
    const filename = argv['_'][2];
    if (!filename) {
        console.error(`[ ERROR ] Path to bfx must be specified.`);
        return;
    }
    // console.log(argv);
    const data = fs.readFileSync(filename);
    const fx = new BundleT();
    const buf = new flatbuffers.ByteBuffer(data);
    Bundle.getRootAsBundle(buf).unpackTo(fx);
    
    // if (argv['info']) 
    {
        console.log(`Fx: ${fx.name}\n`);
        console.log(JSON.stringify(fx.signature, null, '   '));
        console.log(`\n`);
        const deps = { templates: fx.content.renderPasses.map(pass => pass.geometry) };
        console.log(JSON.stringify(deps, null, '   '));   

        console.log('\n');
        console.log(fx.controls);

        console.log('\n');
        console.log(fx.presets);

        if (fx.contentType === BundleContent.MatBundle) {
            const bundle = <MatBundleT>fx.content;
            bundle.renderPasses.forEach(pass => {
                const { routines } = pass;

                const asGLSL = (routine: RoutineBytecodeBundleT | RoutineShaderBundleT): RoutineGLSLSourceBundleT => {
                    const bundle = <RoutineShaderBundleT>routine;
                    return <RoutineGLSLSourceBundleT>bundle.shaders.find((shader, i) => bundle.shadersType[i] === RoutineSourceBundle.RoutineGLSLSourceBundle);
                }

                const asHLSL = (routine: RoutineBytecodeBundleT | RoutineShaderBundleT): RoutineHLSLSourceBundleT => {
                    const bundle = <RoutineShaderBundleT>routine;
                    return <RoutineHLSLSourceBundleT>bundle.shaders.find((shader, i) => bundle.shadersType[i] === RoutineSourceBundle.RoutineHLSLSourceBundle);
                }
                

                const printShader = (title: string, routine: RoutineGLSLSourceBundleT | RoutineHLSLSourceBundleT ) => {
                    if (routine) {
                        console.log('\n');
                        console.log(`+---------------------------------------+`);
                        console.log(`| ${title}                           |`);
                        console.log(`+---------------------------------------+`);
                        console.log(routine.code);
                        console.log('\n');
                    }
                }

                const printCBuffers = (title: string, shader: RoutineHLSLSourceBundleT) => {
                    console.log('\n');
                    console.log(`+---------------------------------------+`);
                    console.log(`| ${title}                           |`);
                    console.log(`+---------------------------------------+`);
                    console.log('\n');

                    shader.cbuffers.map(cb => {
                        console.log(cb);
                    });
                }

                
                printShader('Vertex GLSL', asGLSL(routines[EMatRenderRoutines.k_Vertex]));
                printShader('Pixel GLSL ', asGLSL(routines[EMatRenderRoutines.k_Pixel]));

                printShader('Vertex HLSL', asHLSL(routines[EMatRenderRoutines.k_Vertex]));
                printShader('Pixel HLSL ', asHLSL(routines[EMatRenderRoutines.k_Pixel]));

                printCBuffers('Vertex HLSL - cbuffers', asHLSL(routines[EMatRenderRoutines.k_Vertex]));
                printCBuffers('Pixel HLSL - cbuffers ', asHLSL(routines[EMatRenderRoutines.k_Pixel]));
            });
        }
    }
}

main();
process.exit(0);

