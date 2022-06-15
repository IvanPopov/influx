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

#include "lib/idl/bundles/FxBundle_generated.h"
#include "lib/fx/bytecode/VM/cpp/u32_array.h"

// fixme: hack to emulate unity build
#include "lib/fx/bytecode/VM/cpp/bundle.cpp"
#include "uniforms.cpp"
#include "bytecode_bundle.cpp"
#include "emitter.cpp"

using namespace emscripten;
using namespace glm;
using namespace std::chrono;

int main(void)
{
    std::cout << "Emscriptent \"Pipeline\" module........................[ LOADED ]" << std::endl;
    return 0;
}


EMITTER* loadFromBundle(u32_array_t data) 
{ 
    Fx::BundleT bundle;
    const Fx::Bundle *pBundle = Fx::GetBundle(&data[0]);
    pBundle->UnPackTo(&bundle);

    // std::cout << "==========================================" << std::endl;
    // std::cout << "   bundle name: " << bundle.name << std::endl;
    // std::cout << "bundle version: " << bundle.signature->version << std::endl;
    // std::cout << "==========================================" << std::endl;

    return new EMITTER(bundle); 
}


void destroyEmitter(EMITTER* pEmitter)
{
    delete pEmitter;
}

glm::vec3 vec3FromJSObject(const emscripten::val &v)
{
    glm::vec3 v3;
    v3.x = v["x"].as<float>();
    v3.y = v["y"].as<float>();
    v3.z = v["z"].as<float>();
    return v3;
}

UNIFORMS uniformsFromJSObject(const emscripten::val &v)
{
    UNIFORMS unis;
    emscripten::val keys = emscripten::val::global("Object").call<emscripten::val>("keys", v);
    int length = keys["length"].as<int>();
    for (int i = 0; i < length; ++i) 
    {
        const auto& key = keys[i].as<std::string>();
        unis[key] = v[key.c_str()].as<float>();
    }
    return unis;
}  

EMSCRIPTEN_BINDINGS(pipeline)
{
    // value_object<u32_array_t>("Memory") 
    //     .field("heap", &u32_array_t::ptr)
    //     .field("size", &u32_array_t::size);

    register_map<std::string, float>("Uniforms");

    //
    // implementation of interfaces described in:
    // @sandbox/containers/playground/idl/IEmitter.ts
    //

    value_object<SHADER_ATTR>("ShaderAttr")
        .field("size", &SHADER_ATTR::size)
        .field("offset", &SHADER_ATTR::offset)
        .field("name", &SHADER_ATTR::name);

    class_<EMITTER_PASS>("EmitterPass")
         .function("getData", &EMITTER_PASS::getData)
         .function("getDesc", optional_override([](EMITTER_PASS& self) {
            auto& desc = self.EMITTER_PASS::getDesc();
            emscripten::val jsDesc = emscripten::val::object();
            jsDesc.set("stride", desc.stride);
            jsDesc.set("sorting", desc.sorting);
            jsDesc.set("geometry", desc.geometry);
            jsDesc.set("instanceCount", desc.instanceCount);
            jsDesc.set("vertexShader", desc.vertexShader);
            jsDesc.set("pixelShader", desc.pixelShader);
            jsDesc.set("instanceLayout", emscripten::val::array(desc.instanceLayout));
            return jsDesc;
          }))
         .function("getNumRenderedParticles", &EMITTER_PASS::getNumRenderedParticles)
         .function("sort", optional_override([](EMITTER_PASS& self, emscripten::val val) {
            return self.EMITTER_PASS::sort(vec3FromJSObject(val));  
          }))
         .function("prerender", optional_override([](EMITTER_PASS& self, emscripten::val val) {
            return self.EMITTER_PASS::prerender(uniformsFromJSObject(val));
          }))
         .function("dump", &EMITTER_PASS::dump);

    class_<EMITTER>("Emitter")
         .function("getName", &EMITTER::getName) 
         .function("getCapacity", &EMITTER::getCapacity)
         .function("getPassCount", &EMITTER::getPassCount)
         .function("getPass", &EMITTER::getPass, allow_raw_pointers())
         .function("getNumParticles", &EMITTER::getNumParticles)

         .function("tick", optional_override([](EMITTER& self, emscripten::val val) {
            return self.EMITTER::tick(uniformsFromJSObject(val)); 
          }))
         .function("reset", &EMITTER::reset)
         .function("dump", &EMITTER::dump)
         .function("destroy", &EMITTER::destroy);
 
    function("loadFromBundle", &loadFromBundle, allow_raw_pointers());
    function("destroyEmitter", &destroyEmitter, allow_raw_pointers());
}
      