#pragma once
#include <cstdio>
#include <string>
#include <algorithm>
#include "memory_view.h"

struct BUNDLE_UAV
{
    std::string name;
    uint32_t elementSize;   // byte length of a single element
    uint32_t length;        // number of elements
    uint32_t reg;           // register specified in the shader
    memory_view data;       // [ elements ]
    memory_view buffer;     // raw data [ counter, ...elements ]
    uint32_t index;         // input index for VM         // << todo: remove (index = register + internal_uav_offset)

    memory_view at(uint32_t i) const
    {
        return memory_view((uintptr_t)(data.as<uint8_t>() + i * elementSize), (elementSize + 3) >> 2);
    }
    
    //
    // parity with UAV api at emitter.ts
    //

    memory_view readElement(uint32_t i) const
    {
        return at(i);
    }

    uint32_t readCounter() const
    {
        return *(buffer.as<uint32_t>());
    }

    void overwriteCounter(uint32_t value)
    {
        *(buffer.as<uint32_t>()) = value;
    }

    //
    // auxilary
    //

    void minidump() const
    {
        std::cout 
            << "uav " 
            << name << "[" 
            << length << "x" << elementSize << ":"
            << "r" << reg << ":"
            << "cnt(" << readCounter() << ")" 
            << "]" << std::endl;
        
        uint32_t n = std::min(64u, length * elementSize);
        char temp[512]{};
        int l = 0;
        for (uint32_t i = 0; i < n; ++ i)
        {
            l += sprintf(temp + l, "%X ", (uint32_t)(data.as<uint8_t>()[i]));
        }
        std::cout << temp << "..." << std::endl;
    }
};

