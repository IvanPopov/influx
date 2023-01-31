#include <emscripten/bind.h>
#include "bundle.h"

#include "bundle.cpp"
#include "bundle_uav.cpp"

namespace em = emscripten;

template <typename T>
std::vector<T> vecFromJSArray(const em::val& v)
{
   std::vector<T> rv;

   const auto l = v["length"].as<unsigned>();
   rv.resize(l);

   em::val memoryView{em::typed_memory_view(l, rv.data())};
   memoryView.call<void>("set", v);

   return rv;
}

static em::val GetBundleFieldType(const VM::BUNDLE_FIELD_T& self)
{
   return em::val(*self.type);
}

static void SetBundleFieldType(const VM::BUNDLE_FIELD_T& self, const em::val& v)
{
   assert(false);
}


static em::val GetBundleTypeFields(const VM::BUNDLE_TYPE_T& self)
{
   auto& fields = self.fields;
   return em::val::array(fields.begin(), fields.end());
}

static void SetBundleTypeFields(const VM::BUNDLE_TYPE_T& self, const em::val& v)
{
   assert(false);
}

static em::val GetBundleExtermParams(const VM::BUNDLE_EXTERN& self)
{
   auto& params = self.params;
   return em::val::array(params.begin(), params.end());
}

static void SetBundleExtermParams(const VM::BUNDLE_EXTERN& self, const em::val& v)
{
   assert(false);
}

//--------------------

template <typename ELEMENT_T>
void FromNativeBase(em::val val, uint8_t* u8)
{
   *((ELEMENT_T*)u8) = val.as<ELEMENT_T>();
}

void FromNative(em::val val, uint8_t* u8, const VM::BUNDLE_TYPE_T& type)
{
   if (type.name == "bool")
      return FromNativeBase<bool>(val, u8);
   if (type.name == "int")
      return FromNativeBase<int32_t>(val, u8);
   if (type.name == "uint")
      return FromNativeBase<uint32_t>(val, u8);
   if (type.name == "float")
      return FromNativeBase<float>(val, u8);
   assert(false);
}

void FromNative(em::val val, uint8_t* u8, const VM::BUNDLE_TYPE_T& type, VM::memory_view* iinput)
{
   if (type.name == "string") {
      assert(false);
   }
   return FromNative(val, u8, type);
}

//--------------------

template <typename ELEMENT_T>
em::val AsNativeBase(uint8_t* u8)
{
   return em::val(*((ELEMENT_T*)u8));
}

template <typename ELEMENT_T>
em::val AsNativeVector(uint8_t* u8, const VM::BUNDLE_TYPE_T& type)
{
   em::val val = em::val::array();
   for (int i = 0, n = type.size / sizeof(ELEMENT_T); i < n; ++i) {
      val.call<void>("push", AsNativeBase<ELEMENT_T>(u8));
      u8 += sizeof(ELEMENT_T);
   }
   return val;
}

em::val AsNative(uint8_t* u8, const VM::BUNDLE_TYPE_T& type)
{
   if (type.name == "bool")
      return AsNativeBase<bool>(u8);
   if (type.name == "int")
      return AsNativeBase<int32_t>(u8);
   if (type.name == "uint")
      return AsNativeBase<uint32_t>(u8);
   if (type.name == "float")
      return AsNativeBase<float>(u8);
   if (type.name == "uint2")
      return AsNativeVector<uint32_t>(u8, type);
   if (type.name == "uint3")
      return AsNativeVector<uint32_t>(u8, type);
   if (type.name == "uint4")
      return AsNativeVector<uint32_t>(u8, type);
   if (type.name == "int2")
      return AsNativeVector<int32_t>(u8, type);
   if (type.name == "int3")
      return AsNativeVector<int32_t>(u8, type);
   if (type.name == "int4")
      return AsNativeVector<int32_t>(u8, type);
   if (type.name == "float2")
      return AsNativeVector<float>(u8, type);
   if (type.name == "float3")
      return AsNativeVector<float>(u8, type);
   if (type.name == "float4")
      return AsNativeVector<float>(u8, type);
   std::cout << "[ERROR] not implemented." << std::endl;
   return em::val::null();
}


em::val AsNative(uint8_t* u8, const VM::BUNDLE_TYPE_T& type, VM::memory_view* iinput)
{
   if (type.name == "string") {
      std::string val = ReadString(u8, iinput[VM::CBUFFER0_REGISTER]);
      return em::val(val);
   }
   return AsNative(u8, type);
}

//--------------------

std::function<VM::BUNDLE::NCALL_T> JSNativeCall(VM::BUNDLE& self, uint32_t id, em::val callback)
{
   std::cout << "set extern <JSNativeCall> = " << id << std::endl;

   return [callback](const VM::BUNDLE_EXTERN& ex, VM::memory_view* iinput, uint8_t* args, uint8_t* ret) -> void {
      em::val nargs = em::val::array();
      for (uint32_t i = 0, n = ex.params.size(); i < n; ++i) {
         auto& p = ex.params[i];
         // constants are required to read strings
         nargs.call<void>("push", AsNative(args, p, iinput));
         args += p.size;
      }

      em::val res = callback.call<em::val>("apply", em::val::null(), nargs);
      FromNative(res, ret, ex.ret, iinput);
   };
   // todo: implement!!!
   // int res = callback(10).as<int>();
   // std::cout << res << std::endl;
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
      .function("play", em::optional_override([](VM::BUNDLE& self) {
            int res = self.BUNDLE::Play();
            return em::val(em::typed_memory_view(4, (uint8_t*)&res)); }))
      .function("dispatch", &VM::BUNDLE::Dispatch)
      .function("getInput", &VM::BUNDLE::GetInput)
      .function("setConstant", em::optional_override([](VM::BUNDLE& self, std::string name, em::val val) {
            std::vector<uint8_t> data = vecFromJSArray<uint8_t>(val);
            return self.BUNDLE::SetConstant(name, VM::memory_view::FromVector(data)); }))
      .function("getExterns", em::optional_override([](VM::BUNDLE& self) { 
            auto& externs = self.GetExterns();
            return em::val::array(externs.begin(), externs.end()); }))
      .function("setExtern", em::optional_override([](VM::BUNDLE& self, uint32_t id, em::val callback) {
                   self.SetExtern(id, JSNativeCall(self, id, callback));
                }))
      .function("setInput", &VM::BUNDLE::SetInput)
      // .function("getLayout", &VM::BUNDLE::getLayout)
      .function("getLayout", em::optional_override([](VM::BUNDLE& self) { return em::val::array(self.BUNDLE::GetLayout()); }))
      .class_function("createUAV", &VM::BUNDLE::CreateUAV)
      .class_function("destroyUAV", &VM::BUNDLE::DestroyUAV);

   em::register_vector<VM::BUNDLE_FIELD_T>("vector<BUNDLE_FIELD_T>");
   em::register_vector<VM::BUNDLE_TYPE_T>("vector<BUNDLE_TYPE_T>");

   em::value_object<VM::BUNDLE_FIELD_T>("BUNDLE_FIELD_T")
      .field("name", &VM::BUNDLE_FIELD_T::name)
      .field("semantic", &VM::BUNDLE_FIELD_T::semantic)
      .field("size", &VM::BUNDLE_FIELD_T::size)
      .field("padding", &VM::BUNDLE_FIELD_T::padding)
      .field("type", &GetBundleFieldType, &SetBundleFieldType);

   em::value_object<VM::BUNDLE_TYPE_T>("BUNDLE_TYPE_T")
      .field("name", &VM::BUNDLE_TYPE_T::name)
      .field("length", &VM::BUNDLE_TYPE_T::length)
      .field("size", &VM::BUNDLE_TYPE_T::size)
      .field("fields", &GetBundleTypeFields, &SetBundleTypeFields);

   em::value_object<VM::BUNDLE_EXTERN>("BUNDLE_EXTERN")
      .field("id", &VM::BUNDLE_EXTERN::id)
      .field("name", &VM::BUNDLE_EXTERN::name)
      .field("ret", &VM::BUNDLE_EXTERN::ret)
      .field("params", &GetBundleExtermParams, &SetBundleExtermParams);
}
