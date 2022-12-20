#pragma once

#include <vector>
#include <map>

#include "../../bytecode/VM/cpp/memory_view.h"
#include "../../bytecode/VM/cpp/bundle_uav.h"
#include "../../bytecode/VM/cpp/bundle.h"

#include "uniforms.h"
namespace IFX
{

struct TRIMESH_INTERNAL_DESC 
{
    std::string name;
    std::string vertexCountUName;
    std::string faceCountUName;
    std::string verticesName;
    std::string facesName;
    std::string adjacencyName;
};

struct TRIMESH_DESC
{
    uint32_t vertCount;
    uint32_t faceCount;
};


struct TEXTURE_DESC
{
    uint32_t width;
    uint32_t height;
};


struct TEXTURE_RESOURCE
{
    VM::memory_view layout;
};

struct BUFFER_RESOURCE
{
    VM::memory_view layout;
};

struct TRIMESH_RESOURCE
{
    uint32_t vertCount;
    uint32_t faceCount;

    BUFFER_RESOURCE vertices;
    BUFFER_RESOURCE faces;
    BUFFER_RESOURCE indicesAdj;
};


struct BYTECODE_BUNDLE
{
    std::vector<VM::BUNDLE_UAV> uavs;

    std::vector<VM::RESOURCE_VIEW> buffers;
    std::vector<VM::RESOURCE_VIEW> textures;
    std::vector<TRIMESH_INTERNAL_DESC> trimeshes;

    VM::BUNDLE vmBundle;
    VM::BUNDLE_NUMTHREADS numthreads;

    void Run(uint32_t count);
    void SetConstants(const UNIFORMS& uniforms);
    void SetConstant(const std::string& name, VM::memory_view value);
    void SetConstant(const std::string& name, int32_t value);
    void SetConstant(const std::string& name, uint32_t value);
    void SetConstant(const std::string& name, float value);
    void SetBuffer(const std::string& name, const BUFFER_RESOURCE* data);
    void SetTexture(const std::string& name, const TEXTURE_RESOURCE* data);
    void SetTrimesh(const std::string& name, const TRIMESH_RESOURCE* data);
};

}
