#pragma once

#include "bytecode_bundle.h"

namespace IFX
{

void BYTECODE_BUNDLE::Run(uint32_t count)
{
    VM::BUNDLE_NUMGROUPS numgroups{count, 1u, 1u};
    vmBundle.Dispatch(numgroups, numthreads);
}

void BYTECODE_BUNDLE::SetConstants(const UNIFORMS& unis)
{
    for (const auto &[name, value] : unis)
    {
        vmBundle.SetConstant(name, value);
    }
}

}
