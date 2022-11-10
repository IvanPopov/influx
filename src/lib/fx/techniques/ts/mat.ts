import { BundleT, EMatRenderRoutines, MatBundleT, RoutineGLSLSourceBundle, RoutineGLSLSourceBundleT, RoutineShaderBundleT, RoutineSourceBundle } from '@lib/idl/bundles/FxBundle_generated';
import { ITechnique, ITechniquePassDesc } from '@lib/idl/ITechnique';

// tslint:disable-next-line:max-func-body-length
function createMaterialFromBundle(bundle: BundleT): ITechnique {
    const { name, content } = bundle;
    const { renderPasses } = content as MatBundleT;

    const passes = renderPasses.map((pass, i) => {
        const {
            routines,
            instance,
            stride,
            renderStates
        } = pass;

        const vertexBundle = <RoutineShaderBundleT>routines[EMatRenderRoutines.k_Vertex];
        const vertexGLSLBundle = <RoutineGLSLSourceBundleT>vertexBundle.shaders.find( (shader, i) => vertexBundle.shadersType[i] === RoutineSourceBundle.RoutineGLSLSourceBundle);

        const pixelBundle = <RoutineShaderBundleT>routines[EMatRenderRoutines.k_Pixel];
        const pixelGLSLBundle = <RoutineGLSLSourceBundleT>pixelBundle.shaders.find( (shader, i) => pixelBundle.shadersType[i] === RoutineSourceBundle.RoutineGLSLSourceBundle);
        
        const vertexShader = <string>vertexGLSLBundle.code;
        const pixelShader = <string>pixelGLSLBundle.code;
        const instanceLayout = vertexGLSLBundle.attributes;
        
        const states = {};
        renderStates.forEach(({ type, value }) => { states[type] = value; });

        function getDesc(): ITechniquePassDesc {
            return {
                instanceName: instance.name as string,
                instanceLayout: instanceLayout.map(({ name, offset, size }) => ({ name: <string>name, offset, size })), // FIXME
                stride,                                                                          // FIXME
                vertexShader,
                pixelShader,
                renderStates: states
            };
        }

        return {
            getDesc
        };
    });


    const getName = () => <string>name;
    const getType = (): 'material' => 'material';
    const getPassCount = () => passes.length;
    const getPass = (i: number) => passes[i];

    return {
        // abstract interface
        getType,
        getName,
        getPassCount,
        getPass
    };
}

export function copyTsMaterial(dst: ITechnique, src: ITechnique): boolean
{
    return false;
}

export function destroyTsMaterial(tech: ITechnique): void 
{
    // nothing todo
}

export function createTsMaterial(bundle: BundleT)
{
    let newly = createMaterialFromBundle(bundle);
    return { bundle, ...newly };
}
