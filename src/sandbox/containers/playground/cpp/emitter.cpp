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
using namespace std;
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


string uavPrerendered(uint32_t i)
{
    std::ostringstream s;
    s << FxTranslator::UAV_PRERENDERED << i;
    return s.str();
}


string uavPrerenderedSorted(uint32_t i)
{
    std::ostringstream s;
    s << FxTranslator::UAV_PRERENDERED << i << "Sorted";
    return s.str();
}


BUNDLE_UAV createUAVEx(const Fx::UAVBundleT &bundle, int capacity)
{
    return BUNDLE::createUAV(bundle.name, bundle.stride, capacity, bundle.slot);
}


vector<BUNDLE_UAV> createUAVsEx(const vector<unique_ptr<Fx::UAVBundleT>> &bundles, int capacity, vector<BUNDLE_UAV> &sharedUAVs)
{
    vector<BUNDLE_UAV> uavs;
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
    string debugName,
    const Fx::RoutineBytecodeBundleT &routineBundle,
    int capacity,
    vector<BUNDLE_UAV> &sharedUAVs)
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


EMITTER_PASS::EMITTER_PASS (const std::shared_ptr<EMITTER>& parent, uint32_t id)
    : m_parent(parent)
    , m_id(id)
{

}


BUNDLE_UAV* EMITTER_PASS::uavSorted() { return const_cast<BUNDLE_UAV*>(parent().uav(uavPrerendered(m_id))); }
BUNDLE_UAV* EMITTER_PASS::uavNonSorted() { return const_cast<BUNDLE_UAV*>(parent().uav(uavPrerenderedSorted(m_id))); }

const BUNDLE_UAV* EMITTER_PASS::uavSorted() const { return parent().uav(uavPrerendered(m_id)); }
const BUNDLE_UAV* EMITTER_PASS::uavNonSorted() const { return parent().uav(uavPrerenderedSorted(m_id)); }

const EMITTER& EMITTER_PASS::parent() const
{
    return *(m_parent.lock());
}


uint32_t EMITTER_PASS::numRenderedParticles() const
{ 
    return parent().numParticles() * m_instanceCount; 
}


void EMITTER_PASS::sort(vec3 targetPos) 
{
    assert(m_sorting);

    // NOTE: yes, I understand this is a crappy and stupid brute force sorting,
    //       I hate javascript for that :/

    vec3 v3;
    uint32_t length = numRenderedParticles();

    uint32_t nStride = m_stride * m_instanceCount; // stride in floats

    assert(uavSorted()->data.size == nStride * parent().m_capacity);

    float* src = (float_t*)uavNonSorted()->data.ptr;
    float* dst = (float_t*)uavSorted()->data.ptr;

    vector<pair<uint32_t, float_t>> indicies;

     // NOTE: sort using only first instance's postion
    for (uint32_t iPart = 0; iPart < length; ++iPart) 
    {
        uint32_t offset = iPart * nStride;                                  // offset in floats
        float dist = distance(*((vec3*)(src + offset)), targetPos);    /* add offset of POSTION semantic */
        indicies.push_back({ iPart, dist });
    }

    std::sort(begin(indicies), end(indicies), 
        [](const pair<uint32_t, float32_t>& a, const pair<uint32_t, float32_t>& b) {
            return a.second > b.second; // b < a ?
        });


    for (uint32_t i = 0; i < indicies.size(); ++i) {
        uint32_t iFrom = indicies[i].first * nStride;
        uint32_t iTo = i * nStride;
        memcpy(dst + iTo, src + iFrom, nStride * sizeof(float_t));
    }
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


BUNDLE_UAV* EMITTER::uav(const string& name)
{
    auto it = find_if(begin(m_sharedUAVs), end(m_sharedUAVs), 
        [&name](const BUNDLE_UAV &uav) { return uav.name == name; });
    return it == end(m_sharedUAVs) ? nullptr : &(*it);
}


const BUNDLE_UAV* EMITTER::uav(const string& name) const 
{ 
    return const_cast<const BUNDLE_UAV*>(uav(name)); 
}


BUNDLE_UAV* EMITTER::uavDeadIndices() { return uav(FxTranslator::UAV_DEAD_INDICES); }
BUNDLE_UAV* EMITTER::uavParticles() { return uav(FxTranslator::UAV_PARTICLES); }
BUNDLE_UAV* EMITTER::uavStates() { return uav(FxTranslator::UAV_STATES); }
BUNDLE_UAV* EMITTER::uavInitArguments() { return uav(FxTranslator::UAV_SPAWN_DISPATCH_ARGUMENTS); }


const BUNDLE_UAV* EMITTER::uavDeadIndices() const { return uav(FxTranslator::UAV_DEAD_INDICES); }
const BUNDLE_UAV* EMITTER::uavParticles() const { return uav(FxTranslator::UAV_PARTICLES); }
const BUNDLE_UAV* EMITTER::uavStates() const { return uav(FxTranslator::UAV_STATES); }
const BUNDLE_UAV* EMITTER::uavInitArguments() const { return uav(FxTranslator::UAV_SPAWN_DISPATCH_ARGUMENTS); }


uint32_t EMITTER::numParticles() const
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


void EMITTER::emit(const TIMELINE& timeline)
{
    m_initBundle.setConstants(timeline.m_constants);
    m_initBundle.run(uavInitArguments()->readCounter());
    m_spawnBundle.setConstants(timeline.m_constants);
    m_spawnBundle.run(1);
}


void EMITTER::update(const TIMELINE& timeline)
{
    assert(m_capacity % m_updateBundle.numthreads.x == 0);
    m_updateBundle.setConstants(timeline.m_constants);
    m_updateBundle.run(m_capacity / m_updateBundle.numthreads.x);
}


void EMITTER::prerender(const TIMELINE& timeline) 
{
    for (int i = 0; i < m_passes.size(); ++ i)
    {
        auto& bundle = m_passes[i].m_prerenderBundle;

        assert(m_capacity % bundle.numthreads.x == 0);

        auto uav = find_if(begin(bundle.uavs), end(bundle.uavs), 
            [i](const BUNDLE_UAV& uav) { return uav.name == uavPrerendered(i); });
        uav->overwriteCounter(0);
        bundle.setConstants(timeline.m_constants);
        bundle.run(m_capacity / bundle.numthreads.x);
    }
}


void EMITTER::destroy()
{
    for (auto& uav : m_sharedUAVs)
    {
        BUNDLE::destroyUAV(uav);
        cout << "UAV '" << uav.name << " has been destroyed." << endl;
    }
    cout << "emitter '" << m_name << "' has been dropped." << endl;
}


void EMITTER::dump()
{
    auto npart = numParticles();
    auto partSize = m_particle.size;

    cout << "particles total: " << npart << " ( " << uavDeadIndices()->readCounter() / m_capacity << " )" << endl;

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

    return;
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

        string vertexShader = routines[Fx::EPartRenderRoutines_k_Vertex].AsRoutineGLSLBundle()->code;
        string pixelShader = routines[Fx::EPartRenderRoutines_k_Pixel].AsRoutineGLSLBundle()->code;

        // note: only GLSL routines are supported!
        auto &instanceLayout = routines[Fx::EPartRenderRoutines_k_Vertex].AsRoutineGLSLBundle()->attributes;

        // const numRenderedParticles = () => numParticles() * instanceCount;

        auto &prerenderUAVs = prerender.resources->uavs;
        auto uavPrerendReflect = find_if(begin(prerenderUAVs), end(prerenderUAVs), [&](const unique_ptr<Fx::UAVBundleT> &uav)
                                            { return uav->name == uavPrerendered(i); });

        if (sorting)
        {
            vector<unique_ptr<Fx::UAVBundleT>> bundles;
            bundles.push_back(make_unique<Fx::UAVBundleT>(**uavPrerendReflect));
            bundles.back()->name = uavPrerenderedSorted(i);

            createUAVsEx(bundles, capacity, sharedUAVs)[0];
        }

        {
            EMITTER_PASS pass(shared_from_this(), i);
            pass.m_geometry         = geometry;
            pass.m_sorting          = sorting;
            pass.m_prerenderBundle  = bundle;
            pass.m_stride           = stride;
            passes.push_back(pass);
        }
    }
}



