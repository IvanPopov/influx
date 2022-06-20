#pragma once

#include <vector>
#include <map>

#include "lib/fx/bytecode/VM/cpp/memory_view.h"
#include "lib/fx/bytecode/VM/cpp/bundle_uav.h"
#include "lib/fx/bytecode/VM/cpp/bundle.h"

#include "uniforms.h"

struct BYTECODE_BUNDLE
{
    std::vector<BUNDLE_UAV> uavs;
    BUNDLE vmBundle;
    BUNDLE_NUMTHREADS numthreads;

    void run(uint32_t count);
    void setConstants(const UNIFORMS& uniforms);
};
