#pragma once

#include <vector>
#include <string>

#include "u32_array.h"
#include "bundle_uav.h"

const int CBUFFER0_REGISTER = 0;
const int INPUT0_REGISTER = 1;
const int UAV0_REGISTER = 17;


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
    u32_array_t m_inputs[64] {};
    
    std::string m_debugName = "[noname]";
public:
    BUNDLE(std::string debugName, u32_array_t data);
    BUNDLE();

    u32_array_t play();
    void dispatch(BUNDLE_NUMGROUPS numgroups, BUNDLE_NUMTHREADS numthreads);
    void setInput(int slot, u32_array_t input);
    u32_array_t getInput(int slot);
    bool setConstant(std::string name, float value);
    const std::vector<BUNDLE_CONSTANT>& getLayout();

    static void resetRegisters();
    static BUNDLE_UAV createUAV(std::string name, uint32_t elementSize, uint32_t length, uint32_t reg);
    static void destroyUAV(BUNDLE_UAV uav);

    void load(u32_array_t data);
}; 