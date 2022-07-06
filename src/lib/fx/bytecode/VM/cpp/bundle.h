#pragma once

#include <vector>
#include <string>

#include "memory_view.h"
#include "bundle_uav.h"

namespace VM
{

enum CHUNK_TYPES {
    CONSTANTS,
    LAYOUT,
    CODE,
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


class BUNDLE
{
private:
    std::vector<BUNDLE_CONSTANT> m_layout {};
    std::vector<uint32_t> m_instructions {};
    std::vector<uint32_t> m_constants {};
    memory_view m_inputs[64] {};
    
    std::string m_debugName = "[noname]";
public:
    BUNDLE(std::string debugName, memory_view data);
    BUNDLE();

    memory_view Play();
    void Dispatch(BUNDLE_NUMGROUPS numgroups, BUNDLE_NUMTHREADS numthreads);
    void SetInput(int slot, memory_view input);
    memory_view GetInput(int slot);
    bool SetConstant(std::string name, memory_view value);
    const std::vector<BUNDLE_CONSTANT>& GetLayout() const;

    static void ResetRegisters();
    static BUNDLE_UAV CreateUAV(std::string name, uint32_t elementSize, uint32_t length, uint32_t reg);
    static void DestroyUAV(BUNDLE_UAV uav);

    void Load(memory_view data);
}; 

}
