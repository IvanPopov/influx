#pragma once 

#include <stdio.h>

#include <cassert>
#include <vector>
#include <iostream>
#include <algorithm>
#include <sstream>
#include <memory>
#include <utility>

#include <emscripten/bind.h>
#include <glm/glm.hpp> 

#include "emitter.h" 

using namespace emscripten;
using namespace glm;
using namespace std::chrono;


namespace FxTranslator
{
    // attention! must be synced with FxTranslator.ts (!)
    static std::string UAV_PARTICLES = "uavParticles";
    static std::string UAV_STATES = "uavStates";
    static std::string UAV_DEAD_INDICES = "uavDeadIndices";
    static std::string UAV_CREATION_REQUESTS = "uavCreationRequests";
    static std::string UAV_PRERENDERED = "uavPrerendered";
    static std::string UAV_SPAWN_DISPATCH_ARGUMENTS = "uavSpawnDispatchArguments";
}


std::string uavPrerendered(uint32_t i)
{
    std::ostringstream s;
    s << FxTranslator::UAV_PRERENDERED << i;
    return s.str();
}


std::string uavPrerenderedSorted(uint32_t i)
{
    std::ostringstream s;
    s << FxTranslator::UAV_PRERENDERED << i << "Sorted";
    return s.str();
}


BUNDLE_UAV createUAVEx(const Fx::UAVBundleT &bundle, int capacity)
{
    return BUNDLE::createUAV(bundle.name, bundle.stride, capacity, bundle.slot);
}


std::vector<BUNDLE_UAV> createUAVsEx(const std::vector<std::unique_ptr<Fx::UAVBundleT>> &bundles, int capacity, std::vector<BUNDLE_UAV> &sharedUAVs)
{
    std::vector<BUNDLE_UAV> uavs;
    for (auto &uavBundle : bundles)
    {
        auto sharedUAV = find_if(begin(sharedUAVs), end(sharedUAVs),
                                 [&uavBundle](const BUNDLE_UAV &el)
                                 { return el.name == uavBundle->name; });
        if (sharedUAV != end(sharedUAVs))
        {
            uavs.push_back(*sharedUAV);
            continue;
        }

        BUNDLE_UAV uav = createUAVEx(*uavBundle, capacity);
        uavs.push_back(uav);
        sharedUAVs.push_back(uav);
    }
    return uavs;
}


BYTECODE_BUNDLE setupFxRoutineBytecodeBundle(
    std::string debugName,
    const Fx::RoutineBytecodeBundleT &routineBundle,
    int capacity,
    std::vector<BUNDLE_UAV> &sharedUAVs)
{
    BUNDLE vmBundle(debugName, u32_array_t::fromVector(routineBundle.code));
    auto uavs = createUAVsEx(routineBundle.resources->uavs, capacity, sharedUAVs);
    BUNDLE_NUMTHREADS numthreads{
        routineBundle.numthreads[0],
        routineBundle.numthreads[1],
        routineBundle.numthreads[2]
    };

    for (auto &uav : uavs)
    {
        vmBundle.setInput(uav.index, uav.buffer);
    }

    return { uavs, vmBundle, numthreads };
}


EMITTER_PASS::EMITTER_PASS (
    const EMITTER* pParent, 
    uint32_t id, 
    const EMITTER_DESC& desc, 
    const BYTECODE_BUNDLE& bundle
)
    : m_parent(pParent)
    , m_id(id)
    , m_desc(desc)
    , m_prerenderBundle(bundle)
{

}


BUNDLE_UAV* EMITTER_PASS::uavSorted() { return const_cast<BUNDLE_UAV*>(parent().uav(uavPrerendered(m_id))); }
BUNDLE_UAV* EMITTER_PASS::uavNonSorted() { return const_cast<BUNDLE_UAV*>(parent().uav(uavPrerenderedSorted(m_id))); }

const BUNDLE_UAV* EMITTER_PASS::uavSorted() const { return parent().uav(uavPrerendered(m_id)); }
const BUNDLE_UAV* EMITTER_PASS::uavNonSorted() const { return parent().uav(uavPrerenderedSorted(m_id)); }

const EMITTER& EMITTER_PASS::parent() const
{
    return *m_parent;
}


uint32_t EMITTER_PASS::getNumRenderedParticles() const
{ 
    return parent().getNumParticles() * m_desc.instanceCount; 
}


u32_array_t EMITTER_PASS::getData() const
{
    return (!m_desc.sorting ? uavNonSorted() : uavSorted())->data;
}


void EMITTER_PASS::sort(vec3 targetPos)
{
    assert(m_desc.sorting);

    // NOTE: yes, I understand this is a crappy and stupid brute force sorting,
    //       I hate javascript for that :/

    vec3 v3;
    uint32_t length = getNumRenderedParticles();

    uint32_t nStride = m_desc.stride * m_desc.instanceCount; // stride in floats

    assert(uavSorted()->data.size == nStride * parent().getCapacity());

    float* src = (float_t*)uavNonSorted()->data.ptr;
    float* dst = (float_t*)uavSorted()->data.ptr;

    std::vector<std::pair<uint32_t, float_t>> indicies;

     // NOTE: sort using only first instance's postion
    for (uint32_t iPart = 0; iPart < length; ++iPart) 
    {
        uint32_t offset = iPart * nStride;                                  // offset in floats
        float dist = distance(*((vec3*)(src + offset)), targetPos);    /* add offset of POSTION semantic */
        indicies.push_back({ iPart, dist });
    }

    std::sort(begin(indicies), end(indicies), 
        [](const std::pair<uint32_t, float32_t>& a, const std::pair<uint32_t, float32_t>& b) {
            return a.second > b.second; // b < a ?
        });


    for (uint32_t i = 0; i < indicies.size(); ++i) {
        uint32_t iFrom = indicies[i].first * nStride;
        uint32_t iTo = i * nStride;
        memcpy(dst + iTo, src + iFrom, nStride * sizeof(float_t));
    }
}



void EMITTER_PASS::prerender(const UNIFORMS& uniforms) 
{
    auto& bundle = m_prerenderBundle;
    assert(parent().getCapacity() % bundle.numthreads.x == 0);

    auto uav = find_if(begin(bundle.uavs), end(bundle.uavs), 
        [&](const BUNDLE_UAV& uav) { return uav.name == uavPrerendered(m_id); });
    uav->overwriteCounter(0);
    bundle.setConstants(uniforms);
    bundle.run(parent().getCapacity() / bundle.numthreads.x);
}



void EMITTER_PASS::dump() const 
{
    // verbose(`dump ${UAV.readCounter(uav)}/${capacity} prerendred particles: `);
    // for (let iElement = 0; iElement < UAV.readCounter(uav); ++iElement) {
    //     verbose(VM.asNativeRaw(UAV.readElement(uav, iElement), instance));
    // }
}


EMITTER::EMITTER(const Fx::BundleT& bundle)
{
    load(bundle);
}


BUNDLE_UAV* EMITTER::uav(const std::string& name)
{
    auto it = find_if(begin(m_sharedUAVs), end(m_sharedUAVs), 
        [&name](const BUNDLE_UAV &uav) { return uav.name == name; });
    return it == end(m_sharedUAVs) ? nullptr : &(*it);
}


const BUNDLE_UAV* EMITTER::uav(const std::string& name) const 
{ 
    auto it = find_if(begin(m_sharedUAVs), end(m_sharedUAVs), 
        [&name](const BUNDLE_UAV &uav) { return uav.name == name; });
    return it == end(m_sharedUAVs) ? nullptr : &(*it);
}


BUNDLE_UAV* EMITTER::uavDeadIndices() { return uav(FxTranslator::UAV_DEAD_INDICES); }
BUNDLE_UAV* EMITTER::uavParticles() { return uav(FxTranslator::UAV_PARTICLES); }
BUNDLE_UAV* EMITTER::uavStates() { return uav(FxTranslator::UAV_STATES); }
BUNDLE_UAV* EMITTER::uavInitArguments() { return uav(FxTranslator::UAV_SPAWN_DISPATCH_ARGUMENTS); }


const BUNDLE_UAV* EMITTER::uavDeadIndices() const { return uav(FxTranslator::UAV_DEAD_INDICES); }
const BUNDLE_UAV* EMITTER::uavParticles() const { return uav(FxTranslator::UAV_PARTICLES); }
const BUNDLE_UAV* EMITTER::uavStates() const { return uav(FxTranslator::UAV_STATES); }
const BUNDLE_UAV* EMITTER::uavInitArguments() const { return uav(FxTranslator::UAV_SPAWN_DISPATCH_ARGUMENTS); }


uint32_t EMITTER::getNumParticles() const
{
    return m_capacity - uavDeadIndices()->readCounter();
}


void EMITTER::reset()
{
    assert(m_capacity % m_resetBundle.numthreads.x == 0);
    // reset all available particles
    m_resetBundle.run(m_capacity / m_resetBundle.numthreads.x);
    uavDeadIndices()->overwriteCounter(m_capacity);
}


void EMITTER::emit(const UNIFORMS& uniforms)
{
    // std::cout << uniforms.at("elapsedTime") << ", " << uniforms.at("elapsedTimeLevel") << ", " << uavInitArguments()->readCounter() << std::endl;
    m_initBundle.setConstants(uniforms);
    m_initBundle.run(uavInitArguments()->readCounter());
    m_spawnBundle.setConstants(uniforms);
    m_spawnBundle.run(1);
}


void EMITTER::update(const UNIFORMS& uniforms)
{
    assert(m_capacity % m_updateBundle.numthreads.x == 0);
    m_updateBundle.setConstants(uniforms);
    m_updateBundle.run(m_capacity / m_updateBundle.numthreads.x);
}


void EMITTER::prerender(const UNIFORMS& uniforms) 
{
    for (int i = 0; i < m_passes.size(); ++ i)
    {
        m_passes[i].prerender(uniforms);
    }
}


void EMITTER::tick(const UNIFORMS& uniforms)
{
    update(uniforms);
    emit(uniforms);
    prerender(uniforms);
    std::cout << getNumParticles() << std::endl;
}


void EMITTER::destroy()
{
    for (auto& uav : m_sharedUAVs)
    {
        BUNDLE::destroyUAV(uav);
        std::cout << "UAV '" << uav.name << " has been destroyed." << std::endl;
    }
    std::cout << "emitter '" << m_name << "' has been dropped." << std::endl;
}


void EMITTER::dump()
{
    auto npart = getNumParticles();
    auto partSize = m_particle.size;

    std::cout << "particles total: " << npart << " ( " << uavDeadIndices()->readCounter() / m_capacity << " )" << std::endl;

    for (int iPart = 0; iPart < uavStates()->data.size; ++ iPart)
    {
        auto alive = !!uavStates()->data[iPart];
        if (alive)
        {
            // const partRaw = new Uint8Array(uavParticlesU8.buffer, uavParticlesU8.byteOffset + iPart * partSize, partSize);
            // verbose(iPart, VM.asNativeRaw(partRaw, particle));
        }
    }
}


void EMITTER::load(const Fx::BundleT &fx)
{
    auto [name, signature, content] = fx;
    auto [capacity, simulationRoutines, renderPasses, particle] = *content.AsPartBundle();

    m_name = name;
    m_capacity = capacity;
    m_particle = *particle;
    
    auto& sharedUAVs = m_sharedUAVs;

    m_resetBundle = setupFxRoutineBytecodeBundle(
        name + " + /reset",
        *simulationRoutines[Fx::EPartSimRoutines_k_Reset].AsRoutineBytecodeBundle(),
        capacity,
        sharedUAVs);

    m_initBundle = setupFxRoutineBytecodeBundle(
        name + " + /init",
        *simulationRoutines[Fx::EPartSimRoutines_k_Init].AsRoutineBytecodeBundle(),
        capacity,
        sharedUAVs);

    m_updateBundle = setupFxRoutineBytecodeBundle(
        name + " + /update",
        *simulationRoutines[Fx::EPartSimRoutines_k_Update].AsRoutineBytecodeBundle(),
        capacity,
        sharedUAVs);

    m_spawnBundle = setupFxRoutineBytecodeBundle(
        name + " + /spawn",
        *simulationRoutines[Fx::EPartSimRoutines_k_Spawn].AsRoutineBytecodeBundle(),
        4,
        sharedUAVs);

   
    auto& passes = m_passes;
    for (int i = 0; i < renderPasses.size(); ++i)
    {
        auto &pass = renderPasses[i];
        auto [routines, geometry, sorting, instanceCount, stride, instance] = *pass;

        const Fx::RoutineBytecodeBundleT &prerender = *routines[Fx::EPartRenderRoutines_k_Prerender].AsRoutineBytecodeBundle();
        BYTECODE_BUNDLE bundle = setupFxRoutineBytecodeBundle(
            name + " + /prerender",
            prerender,
            capacity * instanceCount,
            sharedUAVs);

        auto uav = find_if(begin(bundle.uavs), end(bundle.uavs), [&](const BUNDLE_UAV &uav)
                            { return uav.name == uavPrerendered(i); });

        std::string vertexShader = routines[Fx::EPartRenderRoutines_k_Vertex].AsRoutineGLSLBundle()->code;
        std::string pixelShader = routines[Fx::EPartRenderRoutines_k_Pixel].AsRoutineGLSLBundle()->code;

        // note: only GLSL routines are supported!
        std::vector<std::unique_ptr<Fx::GLSLAttributeT>> &attrs = routines[Fx::EPartRenderRoutines_k_Vertex].AsRoutineGLSLBundle()->attributes;

        // const getNumRenderedParticles = () => getNumParticles() * instanceCount;

        auto &prerenderUAVs = prerender.resources->uavs;
        auto uavPrerendReflect = std::find_if(std::begin(prerenderUAVs), std::end(prerenderUAVs), [&](const std::unique_ptr<Fx::UAVBundleT> &uav)
                                            { return uav->name == uavPrerendered(i); });

        if (sorting)
        {
            std::vector<std::unique_ptr<Fx::UAVBundleT>> bundles;
            bundles.push_back(std::make_unique<Fx::UAVBundleT>(**uavPrerendReflect));
            bundles.back()->name = uavPrerenderedSorted(i);

            createUAVsEx(bundles, capacity, sharedUAVs)[0];
        }

        {
            EMITTER_DESC desc;
            desc.geometry = geometry;
            desc.sorting = sorting;
            desc.stride = stride;
            desc.instanceCount = instanceCount;

            for (auto& attr : attrs)
            {
                desc.instanceLayout.push_back({ attr->size, attr->offset, attr->name });
            }
            
            desc.vertexShader = vertexShader;
            desc.pixelShader = pixelShader;

            passes.emplace_back(this, i, desc, bundle);
        }
    }
}



