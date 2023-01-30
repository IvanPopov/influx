#pragma once

#include <vector>
#include <string>
#include <sstream>
#include <type_traits>
#include <tuple>
#include <algorithm>
#include <cassert>

#include "memory_view.h"
#include "bundle_uav.h"
#include "../../../../idl/bundles/FxBundle_generated.h"

namespace VM
{

// must be synced with Bytecode.ts (!)
const int CBUFFER0_REGISTER = 0;
const int INPUT0_REGISTER = 1;
const int UAV0_REGISTER = 17;
const int SRV0_REGISTER = 33;

enum CHUNK_TYPES {
    CONSTANTS,
    LAYOUT,
    CODE,
    EXTERNS
};


struct BUNDLE_NUMGROUPS
{
    uint32_t x;
    uint32_t y;
    uint32_t z;
};

struct BUNDLE_NUMTHREADS
{
    uint32_t x;
    uint32_t y;
    uint32_t z;
};


struct BUNDLE_CONSTANT 
{
    std::string name;
    uint32_t size;
    uint32_t offset;
    std::string semantic;
    std::string type;
};


struct BUNDLE_EXTERN
{
    int id;
    std::string name;
    Fx::TypeLayoutT ret;
    std::vector<Fx::TypeLayoutT> params;
};


struct RESOURCE_VIEW
{
    std::string name;
    uint32_t reg;            // user defined register like "b2", "t3"
    uint32_t index;          // reg + internal resource offset
};


class BUNDLE
{
public:
    using NCALL_T = void(const BUNDLE_EXTERN&, memory_view*, uint8_t*, uint8_t*);
    using NCALL_VECTOR_T = std::vector<std::function<BUNDLE::NCALL_T>>;
    using EXTERN_VECTOR_T = std::vector<BUNDLE_EXTERN>;
    using CONSTANT_VECTOR_T = std::vector<BUNDLE_CONSTANT>;
private:
    std::vector<uint32_t> m_instructions {};
    std::vector<uint32_t> m_constants {};

    CONSTANT_VECTOR_T m_layout {};
    EXTERN_VECTOR_T m_externs {};
    NCALL_VECTOR_T m_ncalls{};

    memory_view m_inputs[64] {};
    
    std::string m_debugName = "[noname]";
public:
    BUNDLE(std::string debugName, memory_view data);
    BUNDLE();

    int Play();
    void Dispatch(BUNDLE_NUMGROUPS numgroups, BUNDLE_NUMTHREADS numthreads);
    
    void SetInput(int slot, memory_view input);
    memory_view GetInput(int slot) const;

    bool SetConstant(std::string name, memory_view value);
    const CONSTANT_VECTOR_T& GetLayout() const;

    static BUNDLE_UAV CreateUAV(std::string name, uint32_t elementSize, uint32_t length, uint32_t reg);
    static void DestroyUAV(BUNDLE_UAV uav);

    static RESOURCE_VIEW CreateBufferView(std::string name, uint32_t reg);
    static RESOURCE_VIEW CreateTextureView(std::string name, uint32_t reg);

    const EXTERN_VECTOR_T& GetExterns() const;
    // const BUNDLE_EXTERN* GetExtern(std::string name) const;

    template<typename FN_T>
    void SetExtern(uint32_t id, FN_T Fn);
    void SetExtern(uint32_t id, NCALL_T Fn);

    void Load(memory_view data); 
}; 

#include "bundle.hpp"

}
