#pragma once

#include <vector>
#include <string>
#include <sstream>

#include "memory_view.h"
#include "bundle_uav.h"
#include "../../../../idl/bundles/FxBundle_generated.h"

namespace VM
{

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
private:
    std::vector<uint32_t> m_instructions {};
    std::vector<BUNDLE_CONSTANT> m_layout {};
    std::vector<BUNDLE_EXTERN> m_externs {};
    std::vector<uint32_t> m_constants {};
    std::vector<std::function<void(const BUNDLE_EXTERN&, uint8_t*)>> m_ncalls{};
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
    void SetExtern(uint32_t id, std::function<void()> callback);
    const std::vector<BUNDLE_CONSTANT>& GetLayout() const;
    const std::vector<BUNDLE_EXTERN>& GetExterns() const;

    static BUNDLE_UAV CreateUAV(std::string name, uint32_t elementSize, uint32_t length, uint32_t reg);
    static void DestroyUAV(BUNDLE_UAV uav);

    static RESOURCE_VIEW CreateBufferView(std::string name, uint32_t reg);
    static RESOURCE_VIEW CreateTextureView(std::string name, uint32_t reg);

    // static 

    void Load(memory_view data);

    ////
    void AsNative(uint8_t* u8, const Fx::TypeLayoutT& layout, std::stringstream& dest) const;

    /////
    void i32ExternalCall(uint32_t* regs, memory_view* iinput, uint32_t a, uint32_t b, uint32_t c, uint32_t d) const;
}; 

}
