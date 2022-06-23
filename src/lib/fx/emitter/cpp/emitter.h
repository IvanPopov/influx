#pragma once

#include <vector>
#include <string>

#include "lib/idl/bundles/FxBundle_generated.h"
#include "lib/fx/bytecode/VM/cpp/memory_view.h"
#include "lib/fx/bytecode/VM/cpp/bundle_uav.h"
#include "lib/fx/bytecode/VM/cpp/bundle.h"

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

struct EMITTER;
struct EMITTER_PASS;

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

    uint32_t     getNumRenderedParticles() const;  // num alive particles multipled by the prerendered instance count
    void         sort(VECTOR3 pos);
    void         dump() const;
    void         prerender(const UNIFORMS& uniforms);
    memory_view  getData() const;
    const EMITTER_DESC& getDesc() const { return m_desc; }

private:
    const EMITTER* m_parent;
    uint32_t m_id;

    EMITTER_DESC m_desc;
    BYTECODE_BUNDLE m_prerenderBundle;

    // parent shortcuts
    BUNDLE_UAV* uavSorted();
    BUNDLE_UAV* uavNonSorted();
    const BUNDLE_UAV* uavSorted() const;
    const BUNDLE_UAV* uavNonSorted() const;
    const EMITTER& parent() const;
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

    std::vector<BUNDLE_UAV>     m_sharedUAVs;

    Fx::TypeLayoutT             m_particle;

private:
    BUNDLE_UAV* uav(const std::string& name);
    const BUNDLE_UAV* uav(const std::string& name) const;

    BUNDLE_UAV* uavDeadIndices();
    BUNDLE_UAV* uavParticles();
    BUNDLE_UAV* uavStates();
    BUNDLE_UAV* uavInitArguments();
    BUNDLE_UAV* uavCreationRequests();

    const BUNDLE_UAV* uavDeadIndices() const;
    const BUNDLE_UAV* uavParticles() const;
    const BUNDLE_UAV* uavStates() const;
    const BUNDLE_UAV* uavInitArguments() const;
    const BUNDLE_UAV* uavCreationRequests() const;

    void emit(const UNIFORMS& uniforms);
    void update(const UNIFORMS& uniforms);
    void prerender(const UNIFORMS& uniforms);
public:
    EMITTER(void* buf);
    ~EMITTER();

    std::string     getName() const { return m_name; }
    uint32_t        getCapacity() const { return m_capacity; }
    uint32_t        getPassCount() const { return m_passes.size(); }
    EMITTER_PASS*   getPass(uint32_t i) { return &(m_passes[i]); }
    uint32_t        getNumParticles() const;

    void tick(const UNIFORMS& uniforms);
    void reset();
    void dump();
    
    bool copy(const EMITTER& src);
    bool operator == (const EMITTER& emit) const;
};

}