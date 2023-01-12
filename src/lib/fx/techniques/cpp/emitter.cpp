#pragma once 

#include <stdio.h>

#include <cassert>
#include <vector>
#include <map>
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


std::unique_ptr<BYTECODE_BUNDLE> SetupFxRoutineBytecodeBundle(
    std::string debugName,
    const Fx::RoutineBytecodeBundleT* routineBundle,
    int capacity,
    std::vector<VM::BUNDLE_UAV> &sharedUAVs)
{
    if (routineBundle->code.empty()) {
        // it's dummy bundle (manual prerender is used)
        return nullptr;
    }

    auto uavs = CreateUAVsEx(routineBundle->resources->uavs, capacity, sharedUAVs);
    
    VM::BUNDLE vmBundle(debugName, VM::memory_view::FromVector(routineBundle->code));
    VM::BUNDLE_NUMTHREADS numthreads{
        routineBundle->numthreads[0],
        routineBundle->numthreads[1],
        routineBundle->numthreads[2]
    };

    for (auto &uav : uavs)
    {
        vmBundle.SetInput(uav.index, uav.buffer);
    }

    auto bcBundle = std::make_unique<BYTECODE_BUNDLE>();
    bcBundle->uavs = std::move(uavs);

    for (auto& buf : routineBundle->resources->buffers) {
        bcBundle->buffers.push_back(VM::BUNDLE::CreateBufferView(buf->name, buf->slot));
    }

    for (auto& tex : routineBundle->resources->textures) {
        bcBundle->textures.push_back(VM::BUNDLE::CreateTextureView(tex->name, tex->slot));
    }

    for (auto& mesh : routineBundle->resources->trimeshes) {
        auto& [ name, vertexCountUName, faceCountUName, verticesName, facesName, gsAdjecencyName, faceAdjacencyName ] = *mesh;
        bcBundle->trimeshes.push_back({
            name,
            vertexCountUName,
            faceCountUName,
            verticesName,
            facesName,
            gsAdjecencyName,
            faceAdjacencyName
        });
    }


    bcBundle->vmBundle = std::move(vmBundle); // << important to copy because of circular dependencies of constants
    bcBundle->numthreads = numthreads;
    return bcBundle;
}


EMITTER_PASS::EMITTER_PASS (
    const EMITTER* pParent, 
    uint32_t id, 
    const EMITTER_PASS_DESC& desc, 
    std::unique_ptr<BYTECODE_BUNDLE> bundle
)
    : m_parent(pParent)
    , m_id(id)
    , m_desc(desc)
    , m_prerenderBundle(std::move(bundle))
{

}


VM::BUNDLE_UAV* EMITTER_PASS::UavNonSorted() { return const_cast<VM::BUNDLE_UAV*>(Parent().Uav(UavPrerendered(m_id))); }
VM::BUNDLE_UAV* EMITTER_PASS::UavSorted() { return const_cast<VM::BUNDLE_UAV*>(Parent().Uav(UavPrerenderedSorted(m_id))); }
VM::BUNDLE_UAV* EMITTER_PASS::UavSerials() { return const_cast<VM::BUNDLE_UAV*>(Parent().Uav(IFX::UavSerials(m_id))); }

const VM::BUNDLE_UAV* EMITTER_PASS::UavNonSorted() const { return Parent().Uav(UavPrerendered(m_id)); }
const VM::BUNDLE_UAV* EMITTER_PASS::UavSorted() const { return Parent().Uav(UavPrerenderedSorted(m_id)); }
const VM::BUNDLE_UAV* EMITTER_PASS::UavSerials() const { return Parent().Uav(IFX::UavSerials(m_id)); }


void EMITTER_PASS::SetTrimesh(const std::string& name, const TRIMESH_RESOURCE* pMesh)
{
    if (m_prerenderBundle)
        m_prerenderBundle->SetTrimesh(name, pMesh);
}

void EMITTER_PASS::SetTexture(const std::string& name, const TEXTURE_RESOURCE* pTex)
{
    if (m_prerenderBundle)
        m_prerenderBundle->SetTexture(name, pTex);
}


const EMITTER& EMITTER_PASS::Parent() const
{
    return *m_parent;
}


uint32_t EMITTER_PASS::GetNumRenderedParticles() const
{ 
    return UavNonSorted()->ReadCounter() * m_desc.instanceCount; 
}


VM::memory_view EMITTER_PASS::GetData() const
{
    return GetDesc().sorting ? UavSorted()->data : UavNonSorted()->data;
}

struct SERIAL_PAIR {
    int32_t sortIndex;
    int32_t instanceIndex;
};

struct SERIAL_PAIR_CMP
{
    inline bool operator() (const SERIAL_PAIR& a, const SERIAL_PAIR& b)
    {
        return a.sortIndex > b.sortIndex;
    }
};

void EMITTER_PASS::Serialize()
{
    if (!GetDesc().sorting) {
        return;
    }

    // NOTE: yes, I understand this is a crappy and stupid brute force sorting,
    //       I hate javascript for that :/

    uint32_t nStride = m_desc.stride * m_desc.instanceCount; // stride in floats

    auto* src = UavNonSorted()->data.As<float_t>();
    auto* dst = UavSorted()->data.As<float_t>();

    int nPart = UavSerials()->ReadCounter();
    auto* serials = UavSerials()->data.As<SERIAL_PAIR>();
 
    std::sort(UavSerials()->data.Begin<SERIAL_PAIR>(), UavSerials()->data.End<SERIAL_PAIR>(), 
        SERIAL_PAIR_CMP());
    
    for (uint32_t i = 0; i < nPart; ++i) {
        uint32_t iFrom = serials[i].instanceIndex * nStride;
        uint32_t iTo = i * nStride;
        memcpy(dst + iTo, src + iFrom, nStride * sizeof(float_t));
    }
}


void EMITTER_PASS::PreparePrerender()
{
    auto* pPrerendered = UavNonSorted();
    if (pPrerendered) pPrerendered->OverwriteCounter(0);

    auto* pSerials = UavSerials();
    if (pSerials) pSerials->OverwriteCounter(0);
}


void EMITTER_PASS::Prerender(const UNIFORMS& uniforms) 
{
    auto& bundle = m_prerenderBundle;
    if (!bundle) {
        return;
    }

    // simulation could be omitted (effect is paused for ex.) 
    // but prerender counters still have to be dropped
    // if we want to continue prerender every frame
    PreparePrerender();

    bundle->SetConstants(uniforms);
    bundle->Run(Parent().GetCapacity() / bundle->numthreads.x);
}


// struct PartInstance 
// {
//     float pos[3];
//     float color[4];
//     float size;
//     float frame;
// };

void EMITTER_PASS::Dump() const 
{
    auto npart = GetNumRenderedParticles(); 
    std::cout << "particles rendered total: " << npart << std::endl;

    for (int iPart = 0; iPart < npart; ++ iPart)
    {
        // auto& part = UavNonSorted()->data.As<PartInstance>()[iPart];
        // std::cout 
        // << "part(" << iPart 
        // << ") = { size: " << part.size 
        // << ", pos: " << part.pos[0] << ", " << part.pos[1] << ", " << part.pos[2] 
        // << ", color: " << part.color[0] << ", " << part.color[1] << ", " << part.color[2] << ", " << part.color[3] 
        // << ", frame: " << part.frame
        // << " } " 
        // << std::endl;
    }
}


EMITTER::EMITTER(void* buf)
{
   ReloadBundles(buf);
}


void ScanConstanBuffers(std::map<std::string, CBUFFER>& sharedCbufs
    , Fx::RoutineGLSLSourceBundleT* pBundle
    , EUsage usage)
{
    for (auto& cbufPtr: pBundle->cbuffers) 
    {
        auto& [ name, slot, size, fields ] = *cbufPtr;

        if (sharedCbufs.find(name) == sharedCbufs.end()) 
        {
            CBUFFER cb;
            cb.slot = slot;
            cb.name = name;
            cb.size = size;

            for (auto& fieldPtr : fields) 
            {
                // Fx::TypeFieldT& field;
                auto& [type, name, semantic, size, padding] = *fieldPtr;
                // std::unique_ptr<Fx::TypeLayoutT> type;
                CBUFFER_FIELD field;
                field.name = name;
                field.semantic = semantic.empty() ? semantic : name;
                field.size = size;
                field.padding = padding;
                field.length = type->length;
                
                cb.fields.push_back(field);
            }

            sharedCbufs[name] = cb;
        } 

        sharedCbufs[name].usage |= usage;
    }
}


void IFX::EMITTER::ReloadBundles(void* buf)
{
    Fx::BundleT fx;
    const Fx::Bundle *pBundle = Fx::GetBundle(buf);
    pBundle->UnPackTo(&fx);
 
    std::cout << "==========================================" << std::endl;
    std::cout << "   bundle name: " << fx.name << std::endl;
    std::cout << "bundle version: " << fx.signature->version << std::endl;
    std::cout << "==========================================" << std::endl;

    auto [name, signature, meta, content, controls, presets] = fx;
    auto [capacity, simulationRoutines, renderPasses, particle] = *content.AsPartBundle();

    m_name = name;
    m_capacity = capacity;
    m_particle = Fx::TypeLayoutT(*particle); // create new copy of type layout
    
    auto& sharedUAVs = m_sharedUAVs;
    m_resetBundle = SetupFxRoutineBytecodeBundle(
        name + "/reset",
        simulationRoutines[Fx::EPartSimRoutines_k_Reset].AsRoutineBytecodeBundle(),
        capacity,
        sharedUAVs);
    m_initBundle = SetupFxRoutineBytecodeBundle(
        name + "/init",
        simulationRoutines[Fx::EPartSimRoutines_k_Init].AsRoutineBytecodeBundle(),
        capacity,
        sharedUAVs);
    m_updateBundle = SetupFxRoutineBytecodeBundle(
        name + "/update",
        simulationRoutines[Fx::EPartSimRoutines_k_Update].AsRoutineBytecodeBundle(),
        capacity,
        sharedUAVs);
    m_spawnBundle = SetupFxRoutineBytecodeBundle(
        name + "/spawn",
        simulationRoutines[Fx::EPartSimRoutines_k_Spawn].AsRoutineBytecodeBundle(),
        4,
        sharedUAVs);

    auto& passes = m_passes;
    for (int i = 0; i < renderPasses.size(); ++i)
    {
        auto &pass = renderPasses[i];
        auto [routines, geometry, sorting, instanceCount, stride, instance, renderStates] = *pass;

        
        const Fx::RoutineBytecodeBundleT* prerender = routines[Fx::EPartRenderRoutines_k_Prerender].AsRoutineBytecodeBundle();
        auto bundle = SetupFxRoutineBytecodeBundle(
            name + "/prerender",
            prerender,
            capacity * instanceCount,
            sharedUAVs);

        auto uav = find_if(begin(sharedUAVs), end(sharedUAVs), [&](const VM::BUNDLE_UAV &uav)
                            { return uav.name == UavPrerendered(i); });

        auto vertexBundle = routines[Fx::EPartRenderRoutines_k_Vertex].AsRoutineShaderBundle()->shaders[0];
        assert(vertexBundle.type == Fx::RoutineSourceBundle_RoutineGLSLSourceBundle);

        auto pixelBundle = routines[Fx::EPartRenderRoutines_k_Pixel].AsRoutineShaderBundle()->shaders[0];
        assert(pixelBundle.type == Fx::RoutineSourceBundle_RoutineGLSLSourceBundle);

        Fx::RoutineGLSLSourceBundleT* pVertexGLSLBundle = vertexBundle.AsRoutineGLSLSourceBundle();
        Fx::RoutineGLSLSourceBundleT* pPixelGLSLBundle = pixelBundle.AsRoutineGLSLSourceBundle();

        std::string vertexShader = pVertexGLSLBundle->code;
        std::string pixelShader = pPixelGLSLBundle->code;

        // note: only GLSL routines are supported!
        std::vector<std::unique_ptr<Fx::GLSLAttributeT>> &attrs = pVertexGLSLBundle->attributes;

        // merge VS & PS constant buffer into shared list 
        // it's guaranteed by translator that buffers with the same name are the same
        std::map<std::string, CBUFFER> cbufs;
        ScanConstanBuffers(cbufs, pVertexGLSLBundle, EUsage::k_Vertex);
        ScanConstanBuffers(cbufs, pPixelGLSLBundle, EUsage::k_Pixel);

        std::vector<CBUFFER> cbuffers;
        for (const auto &cb : cbufs) 
        {
            cbuffers.push_back(cb.second);
        }

        if (sorting) 
        {
            // if no prerender bundle then all particles must be prerendered within update stage
            // looking for prerendered reflection among prerender or update routine uavs
            auto &prerenderUAVs = (bundle ? routines[Fx::EPartRenderRoutines_k_Prerender] : simulationRoutines[Fx::EPartSimRoutines_k_Update]).AsRoutineBytecodeBundle()->resources->uavs;
            auto uavPrerendReflect = std::find_if(std::begin(prerenderUAVs), std::end(prerenderUAVs), [&](const std::unique_ptr<Fx::UAVBundleT> &uav)
                                                { return uav->name == UavPrerendered(i); });

            {
                std::vector<std::unique_ptr<Fx::UAVBundleT>> bundles;
                bundles.push_back(std::make_unique<Fx::UAVBundleT>(**uavPrerendReflect));
                bundles.back()->name = UavPrerenderedSorted(i);

                CreateUAVsEx(bundles, capacity * instanceCount, sharedUAVs);
            }
        }

        {
            EMITTER_PASS_DESC desc;
            desc.geometry = geometry;
            desc.sorting = sorting;
            desc.stride = stride;
            desc.instanceCount = instanceCount;
            desc.renderInstance = Fx::TypeLayoutT(*instance);
            desc.cbuffers = std::move(cbuffers);

            for (auto& attr : attrs)
            {
                desc.instanceLayout.push_back({ attr->size, attr->offset, attr->name });
            }
            
            desc.vertexShader = vertexShader;
            desc.pixelShader = pixelShader;

            passes.emplace_back(this, i, desc, std::move(bundle));
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
    assert(m_capacity % m_resetBundle->numthreads.x == 0);
    // reset all available particles
    m_resetBundle->Run(m_capacity / m_resetBundle->numthreads.x);
    UavDeadIndices()->OverwriteCounter(m_capacity);

    // std::cout << "Reset emitter, new dead indices count is " << UavDeadIndices()->ReadCounter() << std::endl;
}


void EMITTER::Emit(const UNIFORMS& uniforms)
{
    m_initBundle->SetConstants(uniforms);
    m_initBundle->Run(UavInitArguments()->data.As<int>()[0]);

    m_spawnBundle->SetConstants(uniforms);
    m_spawnBundle->Run(1);
}


void EMITTER::Update(const UNIFORMS& uniforms)
{
    // drop prerender counters all the time before update
    // because some effects may use "draw" operator
    // which means that simulation and preprender are mixed
    PreparePrerender();

    assert(m_capacity % m_updateBundle->numthreads.x == 0);
    m_updateBundle->SetConstants(uniforms);
    m_updateBundle->Run(m_capacity / m_updateBundle->numthreads.x);
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


void EMITTER::PreparePrerender()
{
    for (int i = 0; i < m_passes.size(); ++i) {
        m_passes[i].PreparePrerender();
    }
}

void EMITTER::SetTrimesh(const std::string& name, const TRIMESH_RESOURCE* pMesh) 
{
    m_spawnBundle->SetTrimesh(name, pMesh);
    m_initBundle->SetTrimesh(name, pMesh);
    m_updateBundle->SetTrimesh(name, pMesh);
    for (int i = 0; i < m_passes.size(); ++i) 
    {
        m_passes[i].SetTrimesh(name, pMesh);
    }
}


void EMITTER::SetTexture(const std::string& name, const TEXTURE_RESOURCE* pTex) 
{
    m_spawnBundle->SetTexture(name, pTex);
    m_initBundle->SetTexture(name, pTex);
    m_updateBundle->SetTexture(name, pTex);
    for (int i = 0; i < m_passes.size(); ++i) 
    {
        m_passes[i].SetTexture(name, pTex);
    }
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

// struct float3 
// {
//     float x, y, z;
// };

// struct Part 
// {
//     float3 pos;
//     float timelife;
// };


void EMITTER::Dump()
{
    auto npart = GetNumParticles();
    auto partSize = m_particle.size;

    std::cout << "particles total: " << npart << " ( " << UavDeadIndices()->ReadCounter() / m_capacity << " )" << std::endl;

    for (int iPart = 0; iPart < UavStates()->data.size; ++ iPart)
    {
        uint32_t alive = !!UavStates()->data[iPart];
        if (alive) 
        {
            // auto& part = UavParticles()->data.As<Part>()[iPart];
            // std::cout << "part(" << iPart 
            // // << ") = { size: " << part.size 
            // << ", timelife: " << part.timelife 
            // << ", pos: " << part.pos.x << ", " << part.pos.y << ", " << part.pos.z 
            // << " } " << std::endl;
        }
    }
}


const TRIMESH_RESOURCE* CreateTrimesh(TRIMESH_DESC desc, 
    VM::memory_view vertices, VM::memory_view faces, VM::memory_view indicesAdj, VM::memory_view facesAdj)
{
    float_t* pVertices = new float_t[vertices.size]; 
    uint32_t* pFaces = new uint32_t[faces.size];
    uint32_t* pIndicesAdj = new uint32_t[indicesAdj.size];
    uint32_t* pFacesAdj = new uint32_t[facesAdj.size];

    memcpy(pVertices, vertices.As(), vertices.size << 2);
    memcpy(pFaces, faces.As(), faces.size << 2);
    memcpy(pIndicesAdj, indicesAdj.As(), indicesAdj.size << 2);
    memcpy(pFacesAdj, facesAdj.As(), facesAdj.size << 2);

    auto* pMesh = new TRIMESH_RESOURCE;
    pMesh->vertCount = desc.vertCount;
    pMesh->faceCount = desc.faceCount;
    pMesh->vertices.layout = VM::memory_view((uintptr_t)pVertices, vertices.size);
    pMesh->faces.layout = VM::memory_view((uintptr_t)pFaces, faces.size);
    pMesh->indicesAdj.layout = VM::memory_view((uintptr_t)pIndicesAdj, indicesAdj.size);
    pMesh->facesAdj.layout = VM::memory_view((uintptr_t)pFacesAdj, facesAdj.size);
    return pMesh;    
}


const TEXTURE_RESOURCE* CreateTexture(TEXTURE_DESC desc, VM::memory_view initData)
{
    uint32_t DESCRIPTOR_SIZE = 64;
    uint32_t bytesPerPixel = 4;
    uint32_t byteLength = bytesPerPixel * desc.width * desc.height;
    uint32_t byteLengthEx = DESCRIPTOR_SIZE + byteLength;
    uint8_t* pLayout = new uint8_t[byteLengthEx]; 
    uint32_t* pDesc = (uint32_t*)(pLayout);
    uint32_t* pDest = (uint32_t*)(pLayout + DESCRIPTOR_SIZE);

    memset(pLayout, 0, byteLengthEx);

    if (initData.size != 0) {
        assert((initData.size << 2) == byteLength);
        memcpy(pDest, initData.As(), byteLength);
    }

    pDesc[0] = desc.width;
    pDesc[1] = desc.height;
    // set format R8G8B8A8 == 0
    pDesc[2] = 0;
    
    auto* pTex = new TEXTURE_RESOURCE;
    pTex->layout = VM::memory_view((uintptr_t)pLayout, byteLengthEx >> 2);
    return pTex;
}

void DestroyTexture(const TEXTURE_RESOURCE* pTex)
{
    delete[] pTex->layout.As<uint32_t>();
    delete pTex;
}

void DestroyTrimesh(const TRIMESH_RESOURCE* pMesh)
{
    delete[] pMesh->vertices.layout.As<float_t>();
    delete[] pMesh->faces.layout.As<uint32_t>();
    delete[] pMesh->indicesAdj.layout.As<uint32_t>();
    delete[] pMesh->facesAdj.layout.As<uint32_t>();
    delete pMesh;
}

}

