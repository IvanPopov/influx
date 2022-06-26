#pragma once

#include <vector>
#include <map>

#include "../../bytecode/VM/cpp/memory_view.h"
#include "../../bytecode/VM/cpp/bundle_uav.h"
#include "../../bytecode/VM/cpp/bundle.h"

#include "uniforms.h"
namespace IFX
{

struct BYTECODE_BUNDLE
{
    std::vector<VM::BUNDLE_UAV> uavs;
    VM::BUNDLE vmBundle;
    VM::BUNDLE_NUMTHREADS numthreads;

    void Run(uint32_t count);
    void SetConstants(const UNIFORMS& uniforms);
};

}
