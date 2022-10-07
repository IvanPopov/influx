import { BundleT, EMatRenderRoutines, MatBundleT, RoutineGLSLBundleT } from '@lib/idl/bundles/FxBundle_generated';
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


        const vertexShader = <string>routines[EMatRenderRoutines.k_Vertex].code;
        const pixelShader = <string>routines[EMatRenderRoutines.k_Pixel].code;

        // note: only GLSL routines are supported!
        const instanceLayout = (<RoutineGLSLBundleT>routines[EMatRenderRoutines.k_Vertex]).attributes;
        
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
