#pragma once

#include <vector>

struct memory_view
{
    uintptr_t ptr = 0;
    uint32_t size = 0;

    memory_view(): ptr(0), size(0) {}
    explicit memory_view(uintptr_t ptr, uint32_t size): ptr(ptr), size(size) {};

    template <typename T>
    static memory_view fromVector(const std::vector<T>& v)
    {
        return memory_view((uintptr_t)v.data(), v.size() * sizeof(T) / sizeof(uint32_t));
    }

    // VM compartibility
    uint32_t& operator [] (uint32_t i) 
    { 
        assert(i < size);
        return *(as<uint32_t>() + i); 
    }
    const uint32_t& operator [] (uint32_t i) const 
    { 
        assert(i < size);
        return *(as<uint32_t>() + i); 
    }
    
    //
    template <typename T = void>
    T* begin() { return as<T>(); }
    template <typename T = void>
    T* end() { return (T*)(as<uint8_t>() + byteLength()); }
    template <typename T = void>
    const T* begin() const { return as<T>(); }
    template <typename T = void>
    const T* end() const { return (T*)(as<uint8_t>() + byteLength()); }

    template <typename T = void> 
    const T* as() const { return (T*)ptr; }
    template <typename T> 
    T* as() { return (T*)ptr; }

    uint32_t byteLength() const { return size * sizeof(uint32_t); }
};


