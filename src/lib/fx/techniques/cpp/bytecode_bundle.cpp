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

void BYTECODE_BUNDLE::SetBuffer(const std::string& name, VM::memory_view data)
{
    auto it = std::find_if(buffers.begin(), buffers.end(), 
        [&name] (const VM::RESOURCE_VIEW& buf) { return buf.name == name; });
    
    if (it == buffers.end()) {
        return;
    }

    vmBundle.SetInput(it->index, data);
}

void BYTECODE_BUNDLE:: SetTrimesh(std::string name, uint32_t vertCount, uint32_t faceCount, 
        VM::memory_view vertices, VM::memory_view faces, VM::memory_view indicesAdj)
{
    auto it = std::find_if(trimeshes.begin(), trimeshes.end(), 
        [&name] (const TRIMESH_DESC& mesh) { return mesh.name == name; });
    
    if (it == trimeshes.end()) {
        return;
    }

    SetBuffer(it->verticesName, vertices);
    SetBuffer(it->facesName, faces);
    SetBuffer(it->adjacencyName, indicesAdj);
    
    SetConstant(it->vertexCountUName, vertCount);
    SetConstant(it->faceCountUName, faceCount);
}

}
