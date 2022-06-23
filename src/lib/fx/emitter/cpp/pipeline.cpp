#include <stdio.h> 

#include <cassert>
#include <vector>
#include <iostream>
#include <algorithm>
#include <sstream>
#include <memory>
#include <utility>

#include <emscripten/bind.h>
#include "lib/fx/bytecode/VM/cpp/memory_view.h"

// fixme: hack to emulate unity build       
#include "lib/fx/bytecode/VM/cpp/bundle.cpp"
#include "uniforms.cpp"
#include "bytecode_bundle.cpp"
#include "emitter.cpp"
  
using namespace glm; 
namespace em = emscripten;    

int main(void)  
{
    std::cout << "Emscriptent \"Pipeline\" module........................[ LOADED ]" << std::endl;
    return 0;
}

 
IFX::EMITTER* createFromBundle(memory_view data) 
{ 
    return new IFX::EMITTER(data.as<void>());     
}
     
bool copyEmitter(IFX::EMITTER* dst, IFX::EMITTER* src)  
{
    return dst->copy(*src); 
}
 
void destroyEmitter(IFX::EMITTER* pEmitter)
{ 
    if (pEmitter)
    {  
        delete pEmitter;   
    }
}

IFX::VECTOR3 vec3FromJSObject(const em::val &v)
{ 
    IFX::VECTOR3 v3;
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

    em::value_object<IFX::SHADER_ATTR>("ShaderAttr") 
        .field("size", &IFX::SHADER_ATTR::size)
        .field("offset", &IFX::SHADER_ATTR::offset)
        .field("name", &IFX::SHADER_ATTR::name);  

    em::class_<IFX::EMITTER_PASS>("EmitterPass")   
         .function("getData", &IFX::EMITTER_PASS::getData)
         .function("getDesc", em::optional_override([](IFX::EMITTER_PASS& self) {
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
         .function("getNumRenderedParticles", &IFX::EMITTER_PASS::getNumRenderedParticles)
         .function("sort", em::optional_override([](IFX::EMITTER_PASS& self, em::val val) {
            return self.EMITTER_PASS::sort(vec3FromJSObject(val));  
          }))
         .function("prerender", em::optional_override([](IFX::EMITTER_PASS& self, em::val val) {
            return self.EMITTER_PASS::prerender(uniformsFromJSObject(val));
          }))
         .function("dump", &IFX::EMITTER_PASS::dump);
 
    em::class_<IFX::EMITTER>("Emitter") 
         .function("getName", &IFX::EMITTER::getName) 
         .function("getCapacity", &IFX::EMITTER::getCapacity)
         .function("getPassCount", &IFX::EMITTER::getPassCount)
         .function("getPass", &IFX::EMITTER::getPass, em::allow_raw_pointers())
         .function("getNumParticles", &IFX::EMITTER::getNumParticles)  

         .function("tick", em::optional_override([](IFX::EMITTER& self, em::val val) {
            return self.EMITTER::tick(uniformsFromJSObject(val)); 
          }))
         .function("reset", &IFX::EMITTER::reset) 
         .function("dump", &IFX::EMITTER::dump);
 
    em::function("createFromBundle", &createFromBundle, em::allow_raw_pointers());
    em::function("destroyEmitter", &destroyEmitter, em::allow_raw_pointers());
    em::function("copyEmitter", &copyEmitter, em::allow_raw_pointers());
}
      