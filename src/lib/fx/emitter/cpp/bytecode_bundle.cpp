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
        auto mem = VM::memory_view::FromVector<uint8_t>(value);
        vmBundle.SetConstant(name, mem);
    }
}

}
