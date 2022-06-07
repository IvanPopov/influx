#pragma once

#include <memory>

#include "lib/idl/bundles/FxBundle_generated.h"
#include "lib/fx/bytecode/VM/cpp/u32_array.h"

#include "timeline.h"
#include "emitter.h"

class PIPELINE
{
private:
    std::shared_ptr<EMITTER> m_emitter;
    std::shared_ptr<TIMELINE> m_timeline;

public:
    PIPELINE(u32_array_t data);

    void tick();
    void reset();

    // test
    const EMITTER* emitter() const { return m_emitter.get(); }

private:
    void load(u32_array_t data);
};

