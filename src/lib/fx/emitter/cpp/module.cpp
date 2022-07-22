#include <emscripten/bind.h>
#include "../../bytecode/VM/cpp/memory_view.h"

// fixme: hack to emulate unity build       
#include "../../bytecode/VM/cpp/bundle.cpp"
#include "../../bytecode/VM/cpp/bundle_uav.cpp"
#include "uniforms.cpp" 
#include "bytecode_bundle.cpp"
#include "emitter.cpp" 
   
namespace em = emscripten;    

int main(void)  
{
    std::cout << "Emscriptent \"Pipeline\" module........................[ LOADED ]" << std::endl;
    return 0;
} 

 
IFX::EMITTER* CreateFromBundle(VM::memory_view data) 
{ 
    return new IFX::EMITTER(data.As<void>());     
}
     
bool CopyEmitter(IFX::EMITTER* dst, IFX::EMITTER* src)  
{
    return dst->Copy(*src); 
}
 
void DestroyEmitter(IFX::EMITTER* pEmitter)
{ 
    if (pEmitter)
    {  
        delete pEmitter;   
    }
}

IFX::VECTOR3 Vec3FromJSObject(const em::val &v)
{ 
    IFX::VECTOR3 v3; 
    v3.x = v["x"].as<float>();
    v3.y = v["y"].as<float>();
    v3.z = v["z"].as<float>();
    return v3;    
}     
  
template <typename T> 
std::vector<T> vecFromJSArray(const em::val &v)
{
    std::vector<T> rv;

    const auto l = v["length"].as<unsigned>();
    rv.resize(l);

    em::val memoryView{em::typed_memory_view(l, rv.data())};
    memoryView.call<void>("set", v);

    return rv;
}

IFX::UNIFORMS UniformsFromJSObject(const em::val &v)   
{
    IFX::UNIFORMS unis;       
    em::val keys = em::val::global("Object").call<em::val>("keys", v);
    int length = keys["length"].as<int>();
    for (int i = 0; i < length; ++i) 
    {
        const auto& key = keys[i].as<std::string>();
        unis[key] = vecFromJSArray<uint8_t>(v[key.c_str()]);
    }
    return unis; 
} 
            
EMSCRIPTEN_BINDINGS(pipeline) 
{  
    em::value_object<VM::memory_view>("Memory") 
        .field("size", &VM::memory_view::size)
        .field("heap", &VM::memory_view::ptr);     

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
         .function("getData", &IFX::EMITTER_PASS::GetData)
         .function("getDesc", em::optional_override([](IFX::EMITTER_PASS& self) {
            auto& desc = self.EMITTER_PASS::GetDesc();
            em::val jsDesc = em::val::object();
            jsDesc.set("stride", desc.stride);
            jsDesc.set("sorting", desc.sorting);
            jsDesc.set("geometry", desc.geometry);
            jsDesc.set("instanceCount", desc.instanceCount);
            jsDesc.set("vertexShader", desc.vertexShader);
            jsDesc.set("pixelShader", desc.pixelShader);
            jsDesc.set("instanceLayout", em::val::array(desc.instanceLayout)); 
            jsDesc.set("instanceName", desc.renderInstance.name);
            return jsDesc;  
          }))
         .function("getNumRenderedParticles", &IFX::EMITTER_PASS::GetNumRenderedParticles)
         .function("serialize", &IFX::EMITTER_PASS::Serialize)
         .function("prerender", em::optional_override([](IFX::EMITTER_PASS& self, em::val val) {
            return self.EMITTER_PASS::Prerender(UniformsFromJSObject(val));
          }))
         .function("dump", &IFX::EMITTER_PASS::Dump);
   
    em::class_<IFX::EMITTER>("Emitter")
         .function("getName", &IFX::EMITTER::GetName)
         .function("getCapacity", &IFX::EMITTER::GetCapacity)
         .function("getPassCount", &IFX::EMITTER::GetPassCount)
         .function("getPass", em::select_overload<IFX::EMITTER_PASS*(uint32_t)>(&IFX::EMITTER::GetPass), em::allow_raw_pointers())
         .function("getNumParticles", &IFX::EMITTER::GetNumParticles)

         .function("simulate", em::optional_override([](IFX::EMITTER& self, em::val val) {
            return self.EMITTER::Simulate(UniformsFromJSObject(val)); 
          }))
        .function("prerender", em::optional_override([](IFX::EMITTER& self, em::val val) {
            return self.EMITTER::Prerender(UniformsFromJSObject(val)); 
          }))
         .function("serialize", &IFX::EMITTER::Serialize)
         .function("reset", &IFX::EMITTER::Reset) 
         .function("dump", &IFX::EMITTER::Dump);
 
    em::function("createFromBundle", &CreateFromBundle, em::allow_raw_pointers());
    em::function("destroyEmitter", &DestroyEmitter, em::allow_raw_pointers());
    em::function("copyEmitter", &CopyEmitter, em::allow_raw_pointers());
}      
