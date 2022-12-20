#pragma once

#include "bytecode_bundle.h"

namespace IFX
{

void BYTECODE_BUNDLE::Run(uint32_t count)
{
    VM::BUNDLE_NUMGROUPS numgroups{count, 1u, 1u};
    vmBundle.Dispatch(numgroups, numthreads);
}

void BYTECODE_BUNDLE::SetConstants(const UNIFORMS& unis)
{
    for (const auto &[name, value] : unis)
    {
        auto mem = VM::memory_view::FromVector<uint8_t>(value);
        vmBundle.SetConstant(name, mem);
    }
}

void BYTECODE_BUNDLE::SetConstant(const std::string& name, VM::memory_view value)
{
    vmBundle.SetConstant(name, value);
}

void BYTECODE_BUNDLE::SetConstant(const std::string& name, int32_t value)
{

    vmBundle.SetConstant(name, VM::memory_view((uintptr_t)&value, 1));
}

void BYTECODE_BUNDLE::SetConstant(const std::string& name, uint32_t value)
{
    vmBundle.SetConstant(name, VM::memory_view((uintptr_t)&value, 1));
}

void BYTECODE_BUNDLE::SetConstant(const std::string& name, float value)
{
    vmBundle.SetConstant(name, VM::memory_view((uintptr_t)&value, 1));
}

void BYTECODE_BUNDLE::SetBuffer(const std::string& name, const BUFFER_RESOURCE* pBuffer)
{
    auto it = std::find_if(buffers.begin(), buffers.end(), 
        [&name] (const VM::RESOURCE_VIEW& buf) { return buf.name == name; });
    
    if (it == buffers.end()) {
        return;
    }

    vmBundle.SetInput(it->index, pBuffer->layout);
}

void BYTECODE_BUNDLE::SetTrimesh(const std::string& name, const TRIMESH_RESOURCE* pMesh)
{
    auto it = std::find_if(trimeshes.begin(), trimeshes.end(), 
        [&name] (const TRIMESH_INTERNAL_DESC& mesh) { return mesh.name == name; });
    
    if (it == trimeshes.end()) {
        return;
    }

    SetBuffer(it->verticesName, &pMesh->vertices);
    SetBuffer(it->facesName, &pMesh->faces);
    SetBuffer(it->adjacencyName, &pMesh->indicesAdj);
    
    SetConstant(it->vertexCountUName, pMesh->vertCount);
    SetConstant(it->faceCountUName, pMesh->faceCount);
}

void BYTECODE_BUNDLE::SetTexture(const std::string& name, const TEXTURE_RESOURCE* pTex)
{
    auto it = std::find_if(textures.begin(), textures.end(), 
    [&name] (const VM::RESOURCE_VIEW& view) { return view.name == name; });

    if (it == textures.end()) {
        return;
    }
    vmBundle.SetInput(it->index, pTex->layout);
}

}

