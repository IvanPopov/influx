// #pragma once 

#include <stdio.h>

#include <cassert>
#include <vector>
#include <iostream>
#include <algorithm>
#include <sstream>
#include <memory>
#include <utility>

#include <emscripten/bind.h>
#include <glm/glm.hpp> 

#include "pipeline.h"  

// fixme: hack to emulate unity build
#include "lib/fx/bytecode/VM/cpp/bundle.cpp"
#include "timeline.cpp"
#include "bytecode_bundle.cpp"
#include "emitter.cpp"

using namespace emscripten;
using namespace std;
using namespace glm;
using namespace std::chrono;

int main(void)
{
    cout << "Emscriptent \"Pipeline\" module........................[ LOADED ]" << endl;
    return 0;
}


PIPELINE::PIPELINE(u32_array_t data)
{
    load(data);
}

void PIPELINE::tick()
{
}


void PIPELINE::load(u32_array_t data)
{ 
    Fx::BundleT bundle;
    const Fx::Bundle *pBundle = Fx::GetBundle(&data[0]);
    pBundle->UnPackTo(&bundle);

    cout << "==========================================" << endl;
    cout << "   bundle name: " << bundle.name << endl;
    cout << "bundle version: " << bundle.signature->version << endl;
    cout << "==========================================" << endl;

    m_emitter = make_shared<EMITTER>(bundle);
    m_timeline = make_shared<TIMELINE>();
}


void PIPELINE::reset()
{
    m_emitter->reset();
}


EMSCRIPTEN_BINDINGS(pipeline)
{
    // value_object<u32_array_t>("Memory")
    //     .field("heap", &u32_array_t::ptr)
    //     .field("size", &u32_array_t::size);

    class_<EMITTER>("Emitter") 
        .function("name", &EMITTER::name);

    class_<PIPELINE>("Pipeline")
        .constructor<u32_array_t>()
        .function("tick", &PIPELINE::tick)
        .function("emitter", &PIPELINE::emitter, allow_raw_pointers());
}