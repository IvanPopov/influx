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
#include "lib/fx/bytecode/VM/cpp/memory_view.h"

// fixme: hack to emulate unity build       
#include "lib/fx/bytecode/VM/cpp/bundle.cpp"
#include "uniforms.cpp"
#include "bytecode_bundle.cpp"
#include "emitter.cpp"

using namespace glm;
using namespace std::chrono;

namespace em = emscripten; 

int main(void)
{
    std::cout << "Emscriptent \"Pipeline\" module........................[ LOADED ]" << std::endl;
    return 0;
}

 
EMITTER* loadFromBundle(memory_view data) 
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

glm::vec3 vec3FromJSObject(const em::val &v)
{ 
    glm::vec3 v3;
    v3.x = v["x"].as<float>();
    v3.y = v["y"].as<float>();
    v3.z = v["z"].as<float>();
    return v3;    
} 

UNIFORMS uniformsFromJSObject(const em::val &v)
{
    UNIFORMS unis;       
    em::val keys = em::val::global("Object").call<em::val>("keys", v);
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
    // memory view is already exported in bundle.cpp
    // value_object<memory_view>("Memory") 
    //     .field("size", &memory_view::size);
    //     .field("heap", &memory_view::ptr)      

    em::register_map<std::string, float>("Uniforms");  
    
    //
    // implementation of interfaces described in:
    // @sandbox/containers/playground/idl/IEmitter.ts
    //

    em::value_object<SHADER_ATTR>("ShaderAttr") 
        .field("size", &SHADER_ATTR::size)
        .field("offset", &SHADER_ATTR::offset)
        .field("name", &SHADER_ATTR::name);  

    em::class_<EMITTER_PASS>("EmitterPass")   
         .function("getData", &EMITTER_PASS::getData)
         .function("getDesc", em::optional_override([](EMITTER_PASS& self) {
            auto& desc = self.EMITTER_PASS::getDesc();
            em::val jsDesc = em::val::object();
            jsDesc.set("stride", desc.stride);
            jsDesc.set("sorting", desc.sorting);
            jsDesc.set("geometry", desc.geometry);
            jsDesc.set("instanceCount", desc.instanceCount);
            jsDesc.set("vertexShader", desc.vertexShader);
            jsDesc.set("pixelShader", desc.pixelShader);
            jsDesc.set("instanceLayout", em::val::array(desc.instanceLayout));
            return jsDesc; 
          }))
         .function("getNumRenderedParticles", &EMITTER_PASS::getNumRenderedParticles)
         .function("sort", em::optional_override([](EMITTER_PASS& self, em::val val) {
            return self.EMITTER_PASS::sort(vec3FromJSObject(val));  
          }))
         .function("prerender", em::optional_override([](EMITTER_PASS& self, em::val val) {
            return self.EMITTER_PASS::prerender(uniformsFromJSObject(val));
          }))
         .function("dump", &EMITTER_PASS::dump);
 
    em::class_<EMITTER>("Emitter") 
         .function("getName", &EMITTER::getName) 
         .function("getCapacity", &EMITTER::getCapacity)
         .function("getPassCount", &EMITTER::getPassCount)
         .function("getPass", &EMITTER::getPass, em::allow_raw_pointers())
         .function("getNumParticles", &EMITTER::getNumParticles)  

         .function("tick", em::optional_override([](EMITTER& self, em::val val) {
            return self.EMITTER::tick(uniformsFromJSObject(val)); 
          }))
         .function("reset", &EMITTER::reset) 
         .function("dump", &EMITTER::dump)
         .function("destroy", &EMITTER::destroy);
 
    em::function("loadFromBundle", &loadFromBundle, em::allow_raw_pointers());
    em::function("destroyEmitter", &destroyEmitter, em::allow_raw_pointers());
}
      