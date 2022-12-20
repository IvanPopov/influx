#pragma once

#include <vector>
#include <string>

#include "../../../idl/bundles/FxBundle_generated.h"
#include "../../bytecode/VM/cpp/memory_view.h"
#include "../../bytecode/VM/cpp/bundle_uav.h"
#include "../../bytecode/VM/cpp/bundle.h"

#include "uniforms.h"
#include "bytecode_bundle.h"

namespace IFX
{

struct VECTOR3
{
    float x;
    float y;
    float z;
};

class EMITTER;
class EMITTER_PASS;

struct SHADER_ATTR
{
    uint32_t size;
    uint32_t offset;
    std::string name;
};


struct CBUFFER_FIELD 
{
    std::string name;
    std::string semantic;
    int size;
    int offset;
    int length;
};

struct CBUFFER 
{
    std::string name;
    int size;
    int usage;
    std::vector<CBUFFER_FIELD> fields;
};

struct EMITTER_DESC
{
    uint32_t stride;                             // number of float elements in the prerendered particle
    std::string geometry;
    bool sorting;
    uint32_t instanceCount;                     // number of instances prerendered per one simulated particle
    
    // GLSL shader's sources
    std::string vertexShader;
    std::string pixelShader;
    std::vector<SHADER_ATTR> instanceLayout;    // layout of one instance given from shader reflection            

    Fx::TypeLayoutT renderInstance;    

    std::vector<CBUFFER> cbuffers;
};

class EMITTER_PASS
{
public:
    EMITTER_PASS(const EMITTER* pParent, uint32_t id): m_parent(pParent), m_id(id) {}

    EMITTER_PASS (
        const EMITTER* pParent, 
        uint32_t id, 
        const EMITTER_DESC& desc,
        std::unique_ptr<BYTECODE_BUNDLE> prerenderBundle
    );

    uint32_t     GetNumRenderedParticles() const;  // num alive particles multipled by the prerendered instance count
    void         Dump() const;
    void         PreparePrerender();
    void         Prerender(const UNIFORMS& uniforms);
    void         Serialize();
    // returns sorted data if sorting is on and unsorted otherwise 
    VM::memory_view  GetData() const;
    const EMITTER_DESC& GetDesc() const { return m_desc; }

    const EMITTER& Parent() const;
    
    const VM::BUNDLE_UAV* UavSorted() const;
    const VM::BUNDLE_UAV* UavNonSorted() const;
    const VM::BUNDLE_UAV* UavSerials() const;

    void SetTrimesh(const std::string& name, const TRIMESH_RESOURCE* pMesh);
    void SetTexture(const std::string& name, const TEXTURE_RESOURCE* pTexture);

private:
    const EMITTER* m_parent;
    uint32_t m_id;

    EMITTER_DESC m_desc;
    std::unique_ptr<BYTECODE_BUNDLE> m_prerenderBundle;

    // parent shortcuts
    VM::BUNDLE_UAV* UavSorted();
    VM::BUNDLE_UAV* UavNonSorted();
    VM::BUNDLE_UAV* UavSerials();
};


class EMITTER
{
    friend class EMITTER_PASS;
private:
    std::string                 m_name;
    uint32_t                    m_capacity;
    std::vector<EMITTER_PASS>   m_passes;

    std::unique_ptr<BYTECODE_BUNDLE> m_resetBundle;
    std::unique_ptr<BYTECODE_BUNDLE> m_initBundle;
    std::unique_ptr<BYTECODE_BUNDLE> m_spawnBundle;
    std::unique_ptr<BYTECODE_BUNDLE> m_updateBundle;

    std::vector<VM::BUNDLE_UAV> m_sharedUAVs;

    Fx::TypeLayoutT             m_particle;

private:
    VM::BUNDLE_UAV* Uav(const std::string& name);
    const VM::BUNDLE_UAV* Uav(const std::string& name) const;

    VM::BUNDLE_UAV* UavDeadIndices();
    VM::BUNDLE_UAV* UavParticles();
    VM::BUNDLE_UAV* UavStates();
    VM::BUNDLE_UAV* UavInitArguments();
    VM::BUNDLE_UAV* UavCreationRequests();

    const VM::BUNDLE_UAV* UavDeadIndices() const;
    const VM::BUNDLE_UAV* UavParticles() const;
    const VM::BUNDLE_UAV* UavStates() const;
    const VM::BUNDLE_UAV* UavInitArguments() const;
    const VM::BUNDLE_UAV* UavCreationRequests() const;

    void Emit(const UNIFORMS& uniforms);
    void Update(const UNIFORMS& uniforms);
    void PreparePrerender();
public:
    EMITTER(void* buf);
    ~EMITTER();

    std::string         GetName() const { return m_name; }
    uint32_t            GetCapacity() const { return m_capacity; }
    uint32_t            GetPassCount() const { return m_passes.size(); }
    EMITTER_PASS*       GetPass(uint32_t i) { return &(m_passes[i]); }
    const EMITTER_PASS* GetPass(uint32_t i) const { return &(m_passes[i]); }
    uint32_t            GetNumParticles() const;

    void Simulate(const UNIFORMS& uniforms);
    void Prerender(const UNIFORMS& uniforms);
    void Serialize();

    void Reset();
    void Dump();
    void ReloadBundles(void* buf);

    void SetTrimesh(const std::string& name, const TRIMESH_RESOURCE* mesh);
    void SetTexture(const std::string& name, const TEXTURE_RESOURCE* texture);
    
    bool Copy(const EMITTER& src);
    bool operator == (const EMITTER& emit) const;
};

// const TRIMESH_RESOURCE* CreateTrimesh(const TRIMESH_DESC& desc, 
//     VM::memory_view vertices, VM::memory_view faces, VM::memory_view indicesAdj);
// const TEXTURE_RESOURCE* CreateTexture(const TEXTURE_DESC& desc, VM::memory_view initData);

}
