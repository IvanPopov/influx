#pragma once

#include <vector>
#include <map>

#include "../../bytecode/VM/cpp/memory_view.h"
#include "../../bytecode/VM/cpp/bundle_uav.h"
#include "../../bytecode/VM/cpp/bundle.h"

#include "uniforms.h"
namespace IFX
{

struct TRIMESH_DESC 
{
    std::string name;
    std::string vertexCountUName;
    std::string faceCountUName;
    std::string verticesName;
    std::string facesName;
    std::string adjacencyName;
};

struct BYTECODE_BUNDLE
{
    std::vector<VM::BUNDLE_UAV> uavs;

    std::vector<VM::RESOURCE_VIEW> buffers;
    std::vector<VM::RESOURCE_VIEW> textures;
    std::vector<TRIMESH_DESC> trimeshes;

    VM::BUNDLE vmBundle;
    VM::BUNDLE_NUMTHREADS numthreads;

    void Run(uint32_t count);
    void SetConstants(const UNIFORMS& uniforms);
    void SetConstant(const std::string& name, VM::memory_view value);
    void SetConstant(const std::string& name, int32_t value);
    void SetConstant(const std::string& name, uint32_t value);
    void SetConstant(const std::string& name, float value);
    void SetBuffer(const std::string& name, VM::memory_view data);
    void SetTrimesh(std::string name, uint32_t vertCount, uint32_t faceCount, 
        VM::memory_view vertices, VM::memory_view faces, VM::memory_view indicesAdj);
};

}
