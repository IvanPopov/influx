#pragma once

#include <vector>
#include <map>

#include "lib/fx/bytecode/VM/cpp/u32_array.h"
#include "lib/fx/bytecode/VM/cpp/bundle_uav.h"
#include "lib/fx/bytecode/VM/cpp/bundle.h"

struct BYTECODE_BUNDLE
{
    std::vector<BUNDLE_UAV> uavs;
    BUNDLE vmBundle;
    BUNDLE_NUMTHREADS numthreads;

    void run(uint32_t count);
    void setConstants(std::map<std::string, float> data);
};
