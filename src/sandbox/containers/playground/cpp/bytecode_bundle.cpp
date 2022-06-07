#pragma once

#include "bytecode_bundle.h"

using namespace std;

void BYTECODE_BUNDLE::run(uint32_t count)
{
    BUNDLE_NUMGROUPS numgroups{count, 1u, 1u};
    vmBundle.dispatch(numgroups, numthreads);
}

void BYTECODE_BUNDLE::setConstants(map<string, float> data)
{
    for (const auto &[name, value] : data)
    {
        vmBundle.setConstant(name, value);
    }
}
