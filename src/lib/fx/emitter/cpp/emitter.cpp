#pragma once 

#include <stdio.h>

#include <cassert>
#include <vector>
#include <iostream>
#include <algorithm>
#include <sstream>
#include <memory>
#include <utility>

#include "emitter.h" 

namespace IFX
{

namespace FxTranslator
{
    // attention! must be synced with FxTranslator.ts (!)
    static std::string UAV_PARTICLES = "uavParticles";
    static std::string UAV_STATES = "uavStates";
    static std::string UAV_DEAD_INDICES = "uavDeadIndices";
    static std::string UAV_CREATION_REQUESTS = "uavCreationRequests";
    static std::string UAV_PRERENDERED = "uavPrerendered";
    static std::string UAV_SERIALS = "uavSerials";
    static std::string UAV_SPAWN_DISPATCH_ARGUMENTS = "uavSpawnDispatchArguments";
}

std::string UavSerials(uint32_t i)
{
    std::ostringstream s;
    s << FxTranslator::UAV_SERIALS << i;
    return s.str();
}

std::string UavPrerendered(uint32_t i)
{
    std::ostringstream s;
    s << FxTranslator::UAV_PRERENDERED << i;
    return s.str();
}


std::string UavPrerenderedSorted(uint32_t i)
{
    std::ostringstream s;
    s << FxTranslator::UAV_PRERENDERED << i << "Sorted";
    return s.str();
}


VM::BUNDLE_UAV CreateUAVEx(const Fx::UAVBundleT &bundle, int capacity)
{
    return VM::BUNDLE::CreateUAV(bundle.name, bundle.stride, capacity, bundle.slot);
}


std::vector<VM::BUNDLE_UAV> CreateUAVsEx(const std::vector<std::unique_ptr<Fx::UAVBundleT>> &bundles, int capacity, std::vector<VM::BUNDLE_UAV> &sharedUAVs)
{
    std::vector<VM::BUNDLE_UAV> uavs;
    for (auto &uavBundle : bundles)
    {
        auto sharedUAV = find_if(begin(sharedUAVs), end(sharedUAVs),
                                 [&uavBundle](const VM::BUNDLE_UAV &el)
                                 { return el.name == uavBundle->name; });
        if (sharedUAV != end(sharedUAVs))
        {
            uavs.push_back(*sharedUAV);
            continue;
        }
        VM::BUNDLE_UAV uav = CreateUAVEx(*uavBundle, capacity);
        uavs.push_back(uav);
        sharedUAVs.push_back(uav);
    }
    return uavs;
}


BYTECODE_BUNDLE SetupFxRoutineBytecodeBundle(
    std::string debugName,
    const Fx::RoutineBytecodeBundleT &routineBundle,
    int capacity,
    std::vector<VM::BUNDLE_UAV> &sharedUAVs)
{
    auto uavs = CreateUAVsEx(routineBundle.resources->uavs, capacity, sharedUAVs);
    
    VM::BUNDLE vmBundle(debugName, VM::memory_view::FromVector(routineBundle.code));
    VM::BUNDLE_NUMTHREADS numthreads{
        routineBundle.numthreads[0],
        routineBundle.numthreads[1],
        routineBundle.numthreads[2]
    };

    for (auto &uav : uavs)
    {
        vmBundle.SetInput(uav.index, uav.buffer);
    }

    BYTECODE_BUNDLE bcBundle;
    bcBundle.uavs = std::move(uavs);
    bcBundle.vmBundle = std::move(vmBundle); // << important to copy because of circular dependencies of constants
    bcBundle.numthreads = numthreads;
    return bcBundle;
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


VM::BUNDLE_UAV* EMITTER_PASS::UavNonSorted() { return const_cast<VM::BUNDLE_UAV*>(Parent().Uav(UavPrerendered(m_id))); }
VM::BUNDLE_UAV* EMITTER_PASS::UavSorted() { return const_cast<VM::BUNDLE_UAV*>(Parent().Uav(UavPrerenderedSorted(m_id))); }

const VM::BUNDLE_UAV* EMITTER_PASS::UavNonSorted() const { return Parent().Uav(UavPrerendered(m_id)); }
const VM::BUNDLE_UAV* EMITTER_PASS::UavSorted() const { return Parent().Uav(UavPrerenderedSorted(m_id)); }

const VM::BUNDLE_UAV* EMITTER_PASS::UavSerials() const { return Parent().Uav(IFX::UavSerials(m_id)); }
const VM::BUNDLE_UAV* EMITTER_PASS::UavStates() const { return Parent().Uav(FxTranslator::UAV_STATES); }

const EMITTER& EMITTER_PASS::Parent() const
{
    return *m_parent;
}


uint32_t EMITTER_PASS::GetNumRenderedParticles() const
{ 
    return Parent().GetNumParticles() * m_desc.instanceCount; 
}


VM::memory_view EMITTER_PASS::GetData() const
{
    return UavSorted()->data;
}


void EMITTER_PASS::Serialize()
{
    // NOTE: yes, I understand this is a crappy and stupid brute force sorting,
    //       I hate javascript for that :/

    uint32_t nStride = m_desc.stride * m_desc.instanceCount; // stride in floats

    assert(UavSorted()->data.size == nStride * Parent().GetCapacity());

    auto* src = UavNonSorted()->data.As<float_t>();
    auto* dst = UavSorted()->data.As<float_t>();

    auto* states = UavStates()->data.As<int32_t>();
    auto* serials = UavSerials()->data.As<int32_t>();

    std::vector<std::pair<uint32_t, int32_t>> indicies;

     for (uint32_t iPart = 0; iPart < Parent().GetCapacity(); ++iPart) 
     {
        if (states[iPart]) 
        {
            indicies.push_back({ iPart, GetDesc().sorting ? serials[iPart * GetDesc().instanceCount] : 0 });
        }
    }
 
    if (GetDesc().sorting)
    {
        std::sort(begin(indicies), end(indicies), 
            [](const std::pair<uint32_t, uint32_t>& a, const std::pair<uint32_t, uint32_t>& b) {
                return a.second > b.second; 
            });
    }

    for (uint32_t i = 0; i < indicies.size(); ++i) {
        uint32_t iFrom = indicies[i].first * nStride;
        uint32_t iTo = i * nStride;
        memcpy(dst + iTo, src + iFrom, nStride * sizeof(float_t));
    }
}



void EMITTER_PASS::Prerender(const UNIFORMS& uniforms) 
{
    auto& bundle = m_prerenderBundle;
    assert(Parent().GetCapacity() % bundle.numthreads.x == 0);

    auto uav = find_if(begin(bundle.uavs), end(bundle.uavs), 
        [&](const VM::BUNDLE_UAV& uav) { return uav.name == UavPrerendered(m_id); });
    assert(uav != end(bundle.uavs));
    uav->OverwriteCounter(0);
    bundle.SetConstants(uniforms);
    bundle.Run(Parent().GetCapacity() / bundle.numthreads.x);
}


// struct DefaultShaderInput {
//     vec3 pos;
//     vec4 color;
//     float size;
// };

void EMITTER_PASS::Dump() const 
{
    auto npart = GetNumRenderedParticles(); 
    std::cout << "particles rendered total: " << npart << std::endl;

    for (int iPart = 0; iPart < npart; ++ iPart)
    {
        // auto& part = UavNonSorted()->data.As<DefaultShaderInput>()[iPart];
        // std::cout << "part(" << iPart 
        // << ") = { size: " << part.size 
        // << ", pos: " << part.pos.x << ", " << part.pos.y << ", " << part.pos.z 
        // << " } " << std::endl;
    }
}


EMITTER::EMITTER(void* buf)
{
    Fx::BundleT fx;
    const Fx::Bundle *pBundle = Fx::GetBundle(buf);
    pBundle->UnPackTo(&fx);
 
    std::cout << "==========================================" << std::endl;
    std::cout << "   bundle name: " << fx.name << std::endl;
    std::cout << "bundle version: " << fx.signature->version << std::endl;
    std::cout << "==========================================" << std::endl;

    auto [name, signature, meta, content] = fx;
    auto [capacity, simulationRoutines, renderPasses, particle] = *content.AsPartBundle();

    m_name = name;
    m_capacity = capacity;
    m_particle = Fx::TypeLayoutT(*particle); // create new copy of type layout
    
    auto& sharedUAVs = m_sharedUAVs;
    m_resetBundle = SetupFxRoutineBytecodeBundle(
        name + "/reset",
        *simulationRoutines[Fx::EPartSimRoutines_k_Reset].AsRoutineBytecodeBundle(),
        capacity,
        sharedUAVs);
    m_initBundle = SetupFxRoutineBytecodeBundle(
        name + "/init",
        *simulationRoutines[Fx::EPartSimRoutines_k_Init].AsRoutineBytecodeBundle(),
        capacity,
        sharedUAVs);
    m_updateBundle = SetupFxRoutineBytecodeBundle(
        name + "/update",
        *simulationRoutines[Fx::EPartSimRoutines_k_Update].AsRoutineBytecodeBundle(),
        capacity,
        sharedUAVs);
    m_spawnBundle = SetupFxRoutineBytecodeBundle(
        name + "/spawn",
        *simulationRoutines[Fx::EPartSimRoutines_k_Spawn].AsRoutineBytecodeBundle(),
        4,
        sharedUAVs);

    auto& passes = m_passes;
    for (int i = 0; i < renderPasses.size(); ++i)
    {
        auto &pass = renderPasses[i];
        auto [routines, geometry, sorting, instanceCount, stride, instance] = *pass;

        const Fx::RoutineBytecodeBundleT &prerender = *routines[Fx::EPartRenderRoutines_k_Prerender].AsRoutineBytecodeBundle();
        BYTECODE_BUNDLE bundle = SetupFxRoutineBytecodeBundle(
            name + "/prerender",
            prerender,
            capacity * instanceCount,
            sharedUAVs);

        auto uav = find_if(begin(bundle.uavs), end(bundle.uavs), [&](const VM::BUNDLE_UAV &uav)
                            { return uav.name == UavPrerendered(i); });

        std::string vertexShader = routines[Fx::EPartRenderRoutines_k_Vertex].AsRoutineGLSLBundle()->code;
        std::string pixelShader = routines[Fx::EPartRenderRoutines_k_Pixel].AsRoutineGLSLBundle()->code;

        // note: only GLSL routines are supported!
        std::vector<std::unique_ptr<Fx::GLSLAttributeT>> &attrs = routines[Fx::EPartRenderRoutines_k_Vertex].AsRoutineGLSLBundle()->attributes;

        auto &prerenderUAVs = prerender.resources->uavs;
        auto uavPrerendReflect = std::find_if(std::begin(prerenderUAVs), std::end(prerenderUAVs), [&](const std::unique_ptr<Fx::UAVBundleT> &uav)
                                            { return uav->name == UavPrerendered(i); });

        {
            std::vector<std::unique_ptr<Fx::UAVBundleT>> bundles;
            bundles.push_back(std::make_unique<Fx::UAVBundleT>(**uavPrerendReflect));
            bundles.back()->name = UavPrerenderedSorted(i);

            CreateUAVsEx(bundles, capacity * instanceCount, sharedUAVs)[0];
        }

        {
            EMITTER_DESC desc;
            desc.geometry = geometry;
            desc.sorting = sorting;
            desc.stride = stride;
            desc.instanceCount = instanceCount;
            desc.renderInstance = Fx::TypeLayoutT(*instance);

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


EMITTER::~EMITTER()
{
    for (auto& uav : m_sharedUAVs)
    {
        VM::BUNDLE::DestroyUAV(uav);
        // std::cout << "UAV '" << uav.name << " has been destroyed." << std::endl;
    }
    std::cout << "emitter '" << m_name << "' has been dropped." << std::endl;
}


VM::BUNDLE_UAV* EMITTER::Uav(const std::string& name)
{
    auto it = find_if(begin(m_sharedUAVs), end(m_sharedUAVs), 
        [&name](const VM::BUNDLE_UAV &uav) { return uav.name == name; });
    return it == end(m_sharedUAVs) ? nullptr : &(*it);
}


const VM::BUNDLE_UAV* EMITTER::Uav(const std::string& name) const 
{ 
    auto it = find_if(begin(m_sharedUAVs), end(m_sharedUAVs), 
        [&name](const VM::BUNDLE_UAV &uav) { return uav.name == name; });
    return it == end(m_sharedUAVs) ? nullptr : &(*it);
}


VM::BUNDLE_UAV* EMITTER::UavDeadIndices() { return Uav(FxTranslator::UAV_DEAD_INDICES); }
VM::BUNDLE_UAV* EMITTER::UavParticles() { return Uav(FxTranslator::UAV_PARTICLES); }
VM::BUNDLE_UAV* EMITTER::UavStates() { return Uav(FxTranslator::UAV_STATES); }
VM::BUNDLE_UAV* EMITTER::UavInitArguments() { return Uav(FxTranslator::UAV_SPAWN_DISPATCH_ARGUMENTS); }
VM::BUNDLE_UAV* EMITTER::UavCreationRequests() { return Uav(FxTranslator::UAV_CREATION_REQUESTS); }

const VM::BUNDLE_UAV* EMITTER::UavDeadIndices() const { return Uav(FxTranslator::UAV_DEAD_INDICES); }
const VM::BUNDLE_UAV* EMITTER::UavParticles() const { return Uav(FxTranslator::UAV_PARTICLES); }
const VM::BUNDLE_UAV* EMITTER::UavStates() const { return Uav(FxTranslator::UAV_STATES); }
const VM::BUNDLE_UAV* EMITTER::UavInitArguments() const { return Uav(FxTranslator::UAV_SPAWN_DISPATCH_ARGUMENTS); }
const VM::BUNDLE_UAV* EMITTER::UavCreationRequests() const { return Uav(FxTranslator::UAV_CREATION_REQUESTS); }

uint32_t EMITTER::GetNumParticles() const
{
    return m_capacity - UavDeadIndices()->ReadCounter();
}

void EMITTER::Reset()
{
    assert(m_capacity % m_resetBundle.numthreads.x == 0);
    // reset all available particles
    m_resetBundle.Run(m_capacity / m_resetBundle.numthreads.x);
    UavDeadIndices()->OverwriteCounter(m_capacity);
}


void EMITTER::Emit(const UNIFORMS& uniforms)
{
    m_initBundle.SetConstants(uniforms);
    m_initBundle.Run(UavInitArguments()->data.As<int>()[0]);

    m_spawnBundle.SetConstants(uniforms);
    m_spawnBundle.Run(1);
}


void EMITTER::Update(const UNIFORMS& uniforms)
{
    assert(m_capacity % m_updateBundle.numthreads.x == 0);
    m_updateBundle.SetConstants(uniforms);
    m_updateBundle.Run(m_capacity / m_updateBundle.numthreads.x);
}


void EMITTER::Prerender(const UNIFORMS& uniforms) 
{
    for (int i = 0; i < m_passes.size(); ++ i)
    {
        m_passes[i].Prerender(uniforms);
    }
}


void EMITTER::Serialize() 
{
    for (int i = 0; i < m_passes.size(); ++ i)
    {
        m_passes[i].Serialize();
    }
}

void EMITTER::Simulate(const UNIFORMS& uniforms)
{
    Update(uniforms);
    Emit(uniforms);
    // dump();
}


//
// hack to allow hot reload for similar emitters
//

bool CompareTypeLayout(const Fx::TypeLayoutT& lhs, const Fx::TypeLayoutT& rhs);
bool CompareTypeField(const Fx::TypeFieldT& lhs, const Fx::TypeFieldT& rhs)
{
    if (lhs.name != rhs.name || lhs.padding != rhs.padding || lhs.size != rhs.size) 
        return false;
    return CompareTypeLayout(*lhs.type, *rhs.type);
}

bool CompareTypeLayout(const Fx::TypeLayoutT& lhs, const Fx::TypeLayoutT& rhs)
{
    if (lhs.name != rhs.name || lhs.length != rhs.length || lhs.size != rhs.size) 
        return false;
    for (int i = 0; i < lhs.fields.size(); ++i)
    {
        if (!CompareTypeField(*lhs.fields[i], *rhs.fields[i]))
            return false;
    }
    return true;
}

bool EMITTER::Copy(const EMITTER& src)
{
    if (!(operator == (src))) return false; 
    for (auto& uav : m_sharedUAVs)
    {
        memcpy(uav.buffer.As<void>(), src.Uav(uav.name)->buffer.As<void>(), uav.buffer.ByteLength());
    }
    return true;
}

bool EMITTER::operator ==(const EMITTER& rhs) const
{
    if (m_capacity != rhs.m_capacity ||
        m_passes.size() != rhs.m_passes.size() ||
        !CompareTypeLayout(m_particle, rhs.m_particle)) return false;
    for (int i = 0; i < m_passes.size(); ++i) {
        auto& lp = m_passes[i].GetDesc();
        auto& rp = rhs.m_passes[i].GetDesc();
        if (lp.geometry != rp.geometry || lp.sorting != rp.sorting) return false;
        if (!CompareTypeLayout(lp.renderInstance, rp.renderInstance)) return false;
    }
    return true;
}

//
// -- end of hack
//

// struct Part
// {
// 	vec3 speed;
// 	vec3 pos;
// 	float size;
// 	float timelife;
// };

void EMITTER::Dump()
{
    auto npart = GetNumParticles();
    auto partSize = m_particle.size;

    std::cout << "particles total: " << npart << " ( " << UavDeadIndices()->ReadCounter() / m_capacity << " )" << std::endl;

    for (int iPart = 0; iPart < UavStates()->data.size; ++ iPart)
    {
        auto alive = !!UavStates()->data[iPart];
        if (alive)
        {
            // auto& part = uavParticles()->data.As<Part>()[iPart];
            // std::cout << "part(" << iPart 
            // << ") = { size: " << part.size 
            // << ", timelife: " << part.timelife 
            // << ", pos: " << part.pos.x << ", " << part.pos.y << ", " << part.pos.z 
            // << " } " << std::endl;
        }
    }
}


}

