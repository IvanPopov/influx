#pragma once

#include <stdio.h>

#include <vector>
#include <map>
#include <chrono>

#include <glm/vec3.hpp> 

#include "lib/idl/bundles/FxBundle_generated.h"
#include "lib/fx/bytecode/VM/cpp/u32_array.h"
#include "lib/fx/bytecode/VM/cpp/bundle_uav.h"
#include "lib/fx/bytecode/VM/cpp/bundle.h"

#include "timeline.h"
#include "bytecode_bundle.h"

struct EMITTER;
struct EMITTER_PASS;

struct EMITTER_PASS
{
    EMITTER_PASS (const std::shared_ptr<EMITTER>& parent, uint32_t id);

    std::weak_ptr<EMITTER> m_parent;
    uint32_t m_id;

    std::string     m_geometry;
    u32_array_t     m_data;
    bool            m_sorting;
    BYTECODE_BUNDLE m_prerenderBundle;
    uint32_t        m_stride;           // number of float elements in the prerendered particle (src)
    uint32_t        m_instanceCount;

    // GLSL shader's sources
    // std::vector<Fx::GLSLAttributeT> instanceLayout;
    // std::string vertexShader;
    // std::string pixelShader;

    BUNDLE_UAV* uavSorted();
    BUNDLE_UAV* uavNonSorted();
    const BUNDLE_UAV* uavSorted() const;
    const BUNDLE_UAV* uavNonSorted() const;
    
    const EMITTER& parent() const;

    uint32_t numRenderedParticles() const;  // num alive particles multipled by the prerendered instance count
    void     sort(glm::vec3 pos);
    void     dump() const;
};


class EMITTER : public std::enable_shared_from_this<EMITTER>
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

    const BUNDLE_UAV* uavDeadIndices() const;
    const BUNDLE_UAV* uavParticles() const;
    const BUNDLE_UAV* uavStates() const;
    const BUNDLE_UAV* uavInitArguments() const;

    void load(const Fx::BundleT& fx);
public:
    EMITTER(const Fx::BundleT&);

    uint32_t numParticles() const;

    void reset();
    void emit(const TIMELINE& timeline);
    void update(const TIMELINE& timeline);
    void prerender(const TIMELINE& timeline);
    void destroy();
    void dump();

    // test
    std::string name() const { return m_name; }
};

