import { IScope } from "@lib/idl/IInstruction";
import AppendStructuredBufferTemplate from "./AppendStructuredBufferTemplate";
import BufferTemplate from "./BufferTemplate";
import RWBufferTemplate from "./RWBufferTemplate";
import RWStructuredBufferTemplate from "./RWStructuredBufferTemplate";
import RWTexture1DTemplate from "./RWTexture1DTemplate";
import RWTexture2DTemplate from "./RWTexture2DTemplate";
import StructuredBufferTemplate from "./StructuredBufferTemplate";
import Texture2DArrayTemplate from "./Texture2DArrayTemplate";
import Texture2DTemplate from "./Texture2DTemplate";
import Texture3DTemplate from "./Texture3DTemplate";
import TextureCubeArrayTemplate from "./TextureCubeArrayTemplate";
import TextureCubeTemplate from "./TextureCubeTemplate";
import TriMeshTemplate from "./TriMeshTemplate";
import { generateSystemType } from "./utils";


export function addSystemTypeBuiltin(scope: IScope) {
    generateSystemType(scope, "SamplerState", 4);
    generateSystemType(scope, "SamplerComparisonState", 4);
    generateSystemType(scope, "DepthStencilState", 4);
    generateSystemType(scope, "BlendState", 4);
    generateSystemType(scope, "RasterizerState", 4);

    generateSystemType(scope, "VertexShader", 4);
    generateSystemType(scope, "PixelShader", 4);
    generateSystemType(scope, "ComputeShader", 4);
    generateSystemType(scope, "GeometryShader", 4);
    generateSystemType(scope, "HullShader", 4);
    generateSystemType(scope, "DomainShader", 4);

    // generateSystemType(scope, "texture");
    // generateSystemType(scope, "sampler");
    // generateSystemType(scope, "sampler2D");
    // generateSystemType(scope, "samplerCUBE");

    scope.addTypeTemplate(new BufferTemplate);
    scope.addTypeTemplate(new RWBufferTemplate);
    scope.addTypeTemplate(new RWStructuredBufferTemplate);
    scope.addTypeTemplate(new AppendStructuredBufferTemplate);
    scope.addTypeTemplate(new StructuredBufferTemplate);

    scope.addTypeTemplate(new TriMeshTemplate);

    scope.addTypeTemplate(new RWTexture1DTemplate);
    scope.addTypeTemplate(new RWTexture2DTemplate);
    // TODO: RWTexture3D

    // TODO: Texture1D
    scope.addTypeTemplate(new Texture2DTemplate);
    scope.addTypeTemplate(new Texture3DTemplate);
    scope.addTypeTemplate(new TextureCubeTemplate);
    // TODO: Texture1DArray
    scope.addTypeTemplate(new Texture2DArrayTemplate);
    // TODO: Texture3DArray
    scope.addTypeTemplate(new TextureCubeArrayTemplate);

    // produce default Texture2D type
    const templateTexture2D = scope.findTypeTemplate(Texture2DTemplate.TYPE_NAME);
    const typeTexture2D = templateTexture2D.produceType(scope, []);
    scope.addType(typeTexture2D);

    // produce default TextureCube type
    const templateTextureCube = scope.findTypeTemplate(TextureCubeTemplate.TYPE_NAME);
    const typeTextureCube = templateTextureCube.produceType(scope, []);
    scope.addType(typeTextureCube);

    // produce default Texture3D type
    const templateTexture3D = scope.findTypeTemplate(Texture3DTemplate.TYPE_NAME);
    const typeTexture3D = templateTexture3D.produceType(scope, []);
    scope.addType(typeTexture3D);

    // produce default Texture2DArray type
    const templateTexture2DArray = scope.findTypeTemplate(Texture2DArrayTemplate.TYPE_NAME);
    const typeTexture2DArray = templateTexture2DArray.produceType(scope, []);
    scope.addType(typeTexture2DArray);

    // produce default TextureCubeArray type
    const templateTextureCubeArray = scope.findTypeTemplate(TextureCubeArrayTemplate.TYPE_NAME);
    const typeTextureCubeArray = templateTextureCubeArray.produceType(scope, []);
    scope.addType(typeTextureCubeArray);

    // produce default RWTexture1D type
    const templateRWTexture1D = scope.findTypeTemplate(RWTexture1DTemplate.TYPE_NAME);
    const typeRWTexture1D = templateRWTexture1D.produceType(scope, []);
    scope.addType(typeRWTexture1D);

    // produce default RWTexture2D type
    const templateRWTexture2D = scope.findTypeTemplate(RWTexture2DTemplate.TYPE_NAME);
    const typeRWTexture2D = templateRWTexture2D.produceType(scope, []);
    scope.addType(typeRWTexture2D);
}
