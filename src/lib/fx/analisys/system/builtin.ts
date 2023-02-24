import { IFunctionDeclInstruction, IScope, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { instruction } from "@lib/fx/analisys/helpers/instruction";
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
import { generateSystemType, defineTypeAlias } from "./utils";
import { SystemTypeInstruction } from "../instructions/SystemTypeInstruction";
import { VariableTypeInstruction } from "../instructions/VariableTypeInstruction";
import { IdInstruction } from "../instructions/IdInstruction";
import { Scope } from "../ProgramScope";

/*
typedef enum D3D11_STENCIL_OP {
  D3D11_STENCIL_OP_KEEP = 1,
  D3D11_STENCIL_OP_ZERO = 2,
  D3D11_STENCIL_OP_REPLACE = 3,
  D3D11_STENCIL_OP_INCR_SAT = 4,
  D3D11_STENCIL_OP_DECR_SAT = 5,
  D3D11_STENCIL_OP_INVERT = 6,
  D3D11_STENCIL_OP_INCR = 7,
  D3D11_STENCIL_OP_DECR = 8
} ;
typedef enum D3D11_DEPTH_WRITE_MASK {
  D3D11_DEPTH_WRITE_MASK_ZERO = 0,
  D3D11_DEPTH_WRITE_MASK_ALL = 1
} ;
typedef enum D3D11_COMPARISON_FUNC {
  D3D11_COMPARISON_NEVER = 1,
  D3D11_COMPARISON_LESS = 2,
  D3D11_COMPARISON_EQUAL = 3,
  D3D11_COMPARISON_LESS_EQUAL = 4,
  D3D11_COMPARISON_GREATER = 5,
  D3D11_COMPARISON_NOT_EQUAL = 6,
  D3D11_COMPARISON_GREATER_EQUAL = 7,
  D3D11_COMPARISON_ALWAYS = 8
} ;
typedef struct D3D11_DEPTH_STENCILOP_DESC {
  D3D11_STENCIL_OP      StencilFailOp;
  D3D11_STENCIL_OP      StencilDepthFailOp;
  D3D11_STENCIL_OP      StencilPassOp;
  D3D11_COMPARISON_FUNC StencilFunc;
} D3D11_DEPTH_STENCILOP_DESC;
typedef struct D3D11_DEPTH_STENCILOP_DESC {
  D3D11_STENCIL_OP      StencilFailOp;
  D3D11_STENCIL_OP      StencilDepthFailOp;
  D3D11_STENCIL_OP      StencilPassOp;
  D3D11_COMPARISON_FUNC StencilFunc;
} D3D11_DEPTH_STENCILOP_DESC;
typedef struct D3D11_DEPTH_STENCIL_DESC {
  BOOL                       DepthEnable;
  D3D11_DEPTH_WRITE_MASK     DepthWriteMask;
  D3D11_COMPARISON_FUNC      DepthFunc;
  BOOL                       StencilEnable;
  UINT8                      StencilReadMask;
  UINT8                      StencilWriteMask;
  D3D11_DEPTH_STENCILOP_DESC FrontFace;
  D3D11_DEPTH_STENCILOP_DESC BackFace;
} D3D11_DEPTH_STENCIL_DESC;
*/
/*
function addDepthStencilState(scope: IScope) {
    const name = 'DepthStencilState';
    const size = 0;
    const fields: IVariableDeclInstruction[] = [];

    // let scope = new Scope({ parent: sysScope, type: EScopeType.k_Struct });

    // let uint = scope.findType("uint");
    // const type = new VariableTypeInstruction({ type: uint, scope });
    // const id = new IdInstruction({ scope, name: 'DepthEnable' });
    // const usageFlags = EVariableUsageFlags.k_Argument | EVariableUsageFlags.k_Local;
    // const param0 = new VariableDeclInstruction({ scope, type, id, usageFlags });
    // fields.push(param0);

    const type = new SystemTypeInstruction({ scope, name, fields, size });
    scope.addType(type);
}
*/
export function addSystemTypeBuiltin(scope: IScope) {
    generateSystemType(scope, "SamplerState");
    generateSystemType(scope, "SamplerComparisonState");
    generateSystemType(scope, "DepthStencilState");
    generateSystemType(scope, "BlendState");
    generateSystemType(scope, "RasterizerState");

    // addDepthStencilState(scope);

    defineTypeAlias(scope, "int", "VertexShader");
    defineTypeAlias(scope, "int", "PixelShader");
    defineTypeAlias(scope, "int", "ComputeShader");
    defineTypeAlias(scope, "int", "GeometryShader");
    defineTypeAlias(scope, "int", "HullShader");
    defineTypeAlias(scope, "int", "DomainShader");

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
