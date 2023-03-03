import { ITechnique11 } from "@lib/idl/ITechnique11";
import { ITechnique } from "@lib/idl/ITechnique";

import { BundleT } from "@lib/idl/bundles/auto/fx/bundle";
import { Technique11BundleT } from "@lib/idl/bundles/auto/technique11_generated";

function createTechnique11FromBundle(bundle: BundleT): ITechnique11 {
    const { name, content } = bundle;
    const { passes } = content as Technique11BundleT;

    passes.map(({ code, shaders, shadersType }) => {
        
    });

    const getName = () => <string>name;
    const getType = (): 'technique11' => 'technique11';
    const getPassCount = () => passes.length;
    const getPass = (i: number) => passes[i];
    // const vmBundle = VM.make(debugName, routineBundle.code);
    return {
        getType,
        getName,
        getPassCount,
        getPass
    };
}

////////////////////////////////////////////////

export function copyTsTechnique11(dst: ITechnique, src: ITechnique): boolean
{
    return false;
}

export function destroyTsTechnique11(tech: ITechnique): void 
{
    // nothing todo
}

export function createTsTechnique11(bundle: BundleT)
{
    let newly = createTechnique11FromBundle(bundle);
    return { bundle, ...newly };
}
