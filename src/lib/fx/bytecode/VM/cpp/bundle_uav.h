#pragma once
#include <string>
#include "u32_array.h"

struct BUNDLE_UAV
{
    std::string name;
    uint32_t elementSize;   // byte length of a single element
    uint32_t length;        // number of elements
    uint32_t reg;           // register specified in the shader
    u32_array_t data;       // [ elements ]
    u32_array_t buffer;     // raw data [ counter, ...elements ]
    uint32_t index;         // input index for VM         // << todo: remove (index = register + internal_uav_offset)

    u32_array_t readElement(uint32_t i) const
    {
        return { (uintptr_t)((uint8_t*)data.ptr + i * elementSize), (elementSize + 3) >> 2 };
    }

    uint32_t readCounter() const
    {
        return *((uint32_t*)buffer.ptr);
    }

    void overwriteCounter(uint32_t value)
    {
        *((uint32_t*)buffer.ptr) = value;
    }
};


// emscripten::val getBUAVData(const BUNDLE_UAV& self) 
// {
//     return emscripten::val(
//         emscripten::typed_memory_view(self.data.byteLength(), (uint8_t*)self.data.ptr));
// }

// void setBUAVData(const BUNDLE_UAV& self, emscripten::val val) 
// {
//     assert(false);
// }

// emscripten::val getBUAVBuffer(const BUNDLE_UAV& self) 
// {
//     return emscripten::val(
//         emscripten::typed_memory_view(self.buffer.byteLength(), (uint8_t*)self.buffer.ptr));
// }

// void setBUAVBuffer(const BUNDLE_UAV& self, emscripten::val val) 
// {
//     assert(false);
// }