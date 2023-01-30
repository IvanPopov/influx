#include <emscripten/bind.h>
#include "bundle.h"

#include "bundle.cpp"
#include "bundle_uav.cpp"

namespace em = emscripten;

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

EMSCRIPTEN_BINDINGS(bundle)
{
    em::value_object<VM::memory_view>("Memory")
        .field("size", &VM::memory_view::size)
        .field("heap", &VM::memory_view::ptr);
    em::value_object<VM::BUNDLE_NUMGROUPS>("Numgroups")
        .field("x", &VM::BUNDLE_NUMGROUPS::x)
        .field("y", &VM::BUNDLE_NUMGROUPS::y)
        .field("z", &VM::BUNDLE_NUMGROUPS::z);
    em::value_object<VM::BUNDLE_NUMTHREADS>("Numthreads")
        .field("x", &VM::BUNDLE_NUMTHREADS::x)
        .field("y", &VM::BUNDLE_NUMTHREADS::y)
        .field("z", &VM::BUNDLE_NUMTHREADS::z);
    em::value_object<VM::BUNDLE_CONSTANT>("Constant")
        .field("name", &VM::BUNDLE_CONSTANT::name)
        .field("size", &VM::BUNDLE_CONSTANT::size)
        .field("offset", &VM::BUNDLE_CONSTANT::offset)
        .field("semantic", &VM::BUNDLE_CONSTANT::semantic)
        .field("type", &VM::BUNDLE_CONSTANT::type);
    em::value_object<VM::BUNDLE_UAV>("Uav")
        .field("name", &VM::BUNDLE_UAV::name)
        .field("elementSize", &VM::BUNDLE_UAV::elementSize)
        .field("length", &VM::BUNDLE_UAV::length)
        .field("register", &VM::BUNDLE_UAV::reg)
        .field("data", &VM::BUNDLE_UAV::data)
        .field("buffer", &VM::BUNDLE_UAV::buffer)
        .field("index", &VM::BUNDLE_UAV::index);

    em::register_vector<VM::BUNDLE_CONSTANT>("vector<BUNDLE_CONSTANT>");

    em::class_<VM::BUNDLE>("Bundle")
        .constructor<std::string, VM::memory_view>()
        .function("play", em::optional_override([](VM::BUNDLE &self)
                                                {
            int res = self.BUNDLE::Play();
            return em::val(em::typed_memory_view(4, (uint8_t*)&res)); }))
        .function("dispatch", &VM::BUNDLE::Dispatch)
        .function("getInput", &VM::BUNDLE::GetInput)
        .function("setConstant", em::optional_override([](VM::BUNDLE &self, std::string name, em::val val)
                                                       {
            std::vector<uint8_t> data = vecFromJSArray<uint8_t>(val);
            return self.BUNDLE::SetConstant(name, VM::memory_view::FromVector(data)); }))
        .function("getExterns", em::optional_override([](VM::BUNDLE &self)
                                                      {
            // todo: implement!!!
            return em::val::array(); }))
        .function("setExtern", em::optional_override([](VM::BUNDLE &self, uint32_t id, em::val callback)
                                                     {
            // todo: implement!!!
            return; }))
        .function("setInput", &VM::BUNDLE::SetInput)
        // .function("getLayout", &VM::BUNDLE::getLayout)
        .function("getLayout", em::optional_override([](VM::BUNDLE &self)
                                                     { return em::val::array(self.BUNDLE::GetLayout()); }))
        .class_function("createUAV", &VM::BUNDLE::CreateUAV)
        .class_function("destroyUAV", &VM::BUNDLE::DestroyUAV);
}
