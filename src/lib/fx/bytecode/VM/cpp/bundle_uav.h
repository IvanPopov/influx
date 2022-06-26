#pragma once

#include <cstdio>
#include "memory_view.h"

namespace VM
{

struct BUNDLE_UAV
{
    std::string name;
    uint32_t elementSize;   // byte length of a single element
    uint32_t length;        // number of elements
    uint32_t reg;           // register specified in the shader
    memory_view data;       // [ elements ]
    memory_view buffer;     // raw data [ counter, ...elements ]
    uint32_t index;         // input index for VM         // << todo: remove (index = register + internal_uav_offset)

    memory_view At(uint32_t i) const
    {
        return memory_view((uintptr_t)(data.As<uint8_t>() + i * elementSize), (elementSize + 3) >> 2);
    }
    
    //
    // parity with UAV api at emitter.ts
    //

    memory_view ReadElement(uint32_t i) const
    {
        return At(i);
    }

    uint32_t ReadCounter() const
    {
        return *(buffer.As<uint32_t>());
    }

    void OverwriteCounter(uint32_t value)
    {
        *(buffer.As<uint32_t>()) = value;
    }

    //
    // auxilary
    //

    void Minidump() const;
};

}
