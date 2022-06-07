#pragma once

#include <vector>

struct u32_array_t
{
    uintptr_t ptr = 0;
    uint32_t size = 0;

    uint32_t& operator [] (uint32_t i)
    {
        return *(((uint32_t*)ptr) + i);
    }

    const uint32_t& operator [] (uint32_t i) const
    {
        return *(((uint32_t*)ptr) + i);
    }

    template <typename T>
    static u32_array_t fromVector(const std::vector<T>& v)
    {
        return { (uintptr_t)v.data(), v.size() * sizeof(T) / sizeof(uint32_t) };
    }

    uint32_t byteLength() const { return size * sizeof(uint32_t); }
};

uint32_t* begin(u32_array_t arr) { return (uint32_t*)arr.ptr; }
uint32_t* end(u32_array_t arr) { return ((uint32_t*)arr.ptr) + arr.size; }

