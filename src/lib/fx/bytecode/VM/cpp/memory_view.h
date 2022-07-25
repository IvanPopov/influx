#pragma once

#include <cassert>
#include <vector>

namespace VM
{

struct memory_view
{
    uintptr_t ptr = 0;
    uint32_t size = 0;

    memory_view(): ptr(0), size(0) {}
    explicit memory_view(uintptr_t ptr, uint32_t size): ptr(ptr), size(size) {};

    template <typename T>
    static memory_view FromVector(const std::vector<T>& v)
    {
        return memory_view((uintptr_t)v.data(), v.size() * sizeof(T) / sizeof(uint32_t));
    }

    // VM compartibility
    uint32_t& operator [] (uint32_t i) 
    { 
        assert(i < size);
        return *(As<uint32_t>() + i); 
    }
    const uint32_t& operator [] (uint32_t i) const 
    { 
        assert(i < size);
        return *(As<uint32_t>() + i); 
    }
    
    //
    template <typename T = void>
    T* Begin() { return As<T>(); }
    template <typename T = void>
    T* End() { return (T*)(As<uint8_t>() + ByteLength()); }
    template <typename T = void>
    const T* Begin() const { return As<T>(); }
    template <typename T = void>
    const T* End() const { return (T*)(As<uint8_t>() + ByteLength()); }

    template <typename T = void> 
    const T* As() const { return (T*)ptr; }
    template <typename T> 
    T* As() { return (T*)ptr; }

    uint32_t ByteLength() const { return size * sizeof(uint32_t); }
};

}
