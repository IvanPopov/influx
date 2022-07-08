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

    Fx::TypeLayoutT m_renderInstance;        
};

class EMITTER_PASS
{
public:
    EMITTER_PASS(const EMITTER* pParent, uint32_t id): m_parent(pParent), m_id(id) {}

    EMITTER_PASS (
        const EMITTER* pParent, 
        uint32_t id, 
        const EMITTER_DESC& desc,
        const BYTECODE_BUNDLE& prerenderBundle
    );

    uint32_t     GetNumRenderedParticles() const;  // num alive particles multipled by the prerendered instance count
    void         Sort(VECTOR3 pos);
    void         Dump() const;
    void         Prerender(const UNIFORMS& uniforms);
    void         Serialize();
    // returns sorted data if sorting is on and unsorted otherwise 
    VM::memory_view  GetData() const;
    const EMITTER_DESC& GetDesc() const { return m_desc; }

private:
    const EMITTER* m_parent;
    uint32_t m_id;

    EMITTER_DESC m_desc;
    BYTECODE_BUNDLE m_prerenderBundle;

    // parent shortcuts
    VM::BUNDLE_UAV* UavSorted();
    VM::BUNDLE_UAV* UavNonSorted();
    const VM::BUNDLE_UAV* UavSorted() const;
    const VM::BUNDLE_UAV* UavNonSorted() const;
    const VM::BUNDLE_UAV* UavSerials() const;
    const VM::BUNDLE_UAV* UavStates() const;

    const EMITTER& Parent() const;
};


class EMITTER
{
    friend class EMITTER_PASS;
private:
    std::string                 m_name;
    uint32_t                    m_capacity;
    std::vector<EMITTER_PASS>   m_passes;

    BYTECODE_BUNDLE             m_resetBundle;
    BYTECODE_BUNDLE             m_initBundle;
    BYTECODE_BUNDLE             m_spawnBundle;
    BYTECODE_BUNDLE             m_updateBundle;

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
    
    bool Copy(const EMITTER& src);
    bool operator == (const EMITTER& emit) const;
};

}
