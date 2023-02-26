// automatically generated by the FlatBuffers compiler, do not modify


#ifndef FLATBUFFERS_GENERATED_TECHNIQUE11_FX_H_
#define FLATBUFFERS_GENERATED_TECHNIQUE11_FX_H_

#include "flatbuffers/flatbuffers.h"

// Ensure the included flatbuffers.h is the same version as when this file was
// generated, otherwise it may not be compatible.
static_assert(FLATBUFFERS_VERSION_MAJOR == 2 &&
              FLATBUFFERS_VERSION_MINOR == 0 &&
              FLATBUFFERS_VERSION_REVISION == 7,
             "Non-compatible flatbuffers version included");

#include "cbuffer_generated.h"
#include "type_generated.h"

namespace Fx {

struct VertexShader;
struct VertexShaderBuilder;
struct VertexShaderT;

struct PixelShader;
struct PixelShaderBuilder;
struct PixelShaderT;

struct Technique11RenderPass;
struct Technique11RenderPassBuilder;
struct Technique11RenderPassT;

struct Technique11Bundle;
struct Technique11BundleBuilder;
struct Technique11BundleT;

enum Shader : uint8_t {
  Shader_NONE = 0,
  Shader_VertexShader = 1,
  Shader_PixelShader = 2,
  Shader_MIN = Shader_NONE,
  Shader_MAX = Shader_PixelShader
};

inline const Shader (&EnumValuesShader())[3] {
  static const Shader values[] = {
    Shader_NONE,
    Shader_VertexShader,
    Shader_PixelShader
  };
  return values;
}

inline const char * const *EnumNamesShader() {
  static const char * const names[4] = {
    "NONE",
    "VertexShader",
    "PixelShader",
    nullptr
  };
  return names;
}

inline const char *EnumNameShader(Shader e) {
  if (flatbuffers::IsOutRange(e, Shader_NONE, Shader_PixelShader)) return "";
  const size_t index = static_cast<size_t>(e);
  return EnumNamesShader()[index];
}

template<typename T> struct ShaderTraits {
  static const Shader enum_value = Shader_NONE;
};

template<> struct ShaderTraits<Fx::VertexShader> {
  static const Shader enum_value = Shader_VertexShader;
};

template<> struct ShaderTraits<Fx::PixelShader> {
  static const Shader enum_value = Shader_PixelShader;
};

template<typename T> struct ShaderUnionTraits {
  static const Shader enum_value = Shader_NONE;
};

template<> struct ShaderUnionTraits<Fx::VertexShaderT> {
  static const Shader enum_value = Shader_VertexShader;
};

template<> struct ShaderUnionTraits<Fx::PixelShaderT> {
  static const Shader enum_value = Shader_PixelShader;
};

struct ShaderUnion {
  Shader type;
  void *value;

  ShaderUnion() : type(Shader_NONE), value(nullptr) {}
  ShaderUnion(ShaderUnion&& u) FLATBUFFERS_NOEXCEPT :
    type(Shader_NONE), value(nullptr)
    { std::swap(type, u.type); std::swap(value, u.value); }
  ShaderUnion(const ShaderUnion &);
  ShaderUnion &operator=(const ShaderUnion &u)
    { ShaderUnion t(u); std::swap(type, t.type); std::swap(value, t.value); return *this; }
  ShaderUnion &operator=(ShaderUnion &&u) FLATBUFFERS_NOEXCEPT
    { std::swap(type, u.type); std::swap(value, u.value); return *this; }
  ~ShaderUnion() { Reset(); }

  void Reset();

  template <typename T>
  void Set(T&& val) {
    typedef typename std::remove_reference<T>::type RT;
    Reset();
    type = ShaderUnionTraits<RT>::enum_value;
    if (type != Shader_NONE) {
      value = new RT(std::forward<T>(val));
    }
  }

  static void *UnPack(const void *obj, Shader type, const flatbuffers::resolver_function_t *resolver);
  flatbuffers::Offset<void> Pack(flatbuffers::FlatBufferBuilder &_fbb, const flatbuffers::rehasher_function_t *_rehasher = nullptr) const;

  Fx::VertexShaderT *AsVertexShader() {
    return type == Shader_VertexShader ?
      reinterpret_cast<Fx::VertexShaderT *>(value) : nullptr;
  }
  const Fx::VertexShaderT *AsVertexShader() const {
    return type == Shader_VertexShader ?
      reinterpret_cast<const Fx::VertexShaderT *>(value) : nullptr;
  }
  Fx::PixelShaderT *AsPixelShader() {
    return type == Shader_PixelShader ?
      reinterpret_cast<Fx::PixelShaderT *>(value) : nullptr;
  }
  const Fx::PixelShaderT *AsPixelShader() const {
    return type == Shader_PixelShader ?
      reinterpret_cast<const Fx::PixelShaderT *>(value) : nullptr;
  }
};

bool VerifyShader(flatbuffers::Verifier &verifier, const void *obj, Shader type);
bool VerifyShaderVector(flatbuffers::Verifier &verifier, const flatbuffers::Vector<flatbuffers::Offset<void>> *values, const flatbuffers::Vector<uint8_t> *types);

struct VertexShaderT : public flatbuffers::NativeTable {
  typedef VertexShader TableType;
  std::string code{};
  std::string entryName{};
  std::unique_ptr<TypeLayoutT> input{};
  std::vector<std::unique_ptr<CBBundleT>> cbuffers{};
  VertexShaderT() = default;
  VertexShaderT(const VertexShaderT &o);
  VertexShaderT(VertexShaderT&&) FLATBUFFERS_NOEXCEPT = default;
  VertexShaderT &operator=(VertexShaderT o) FLATBUFFERS_NOEXCEPT;
};

struct VertexShader FLATBUFFERS_FINAL_CLASS : private flatbuffers::Table {
  typedef VertexShaderT NativeTableType;
  typedef VertexShaderBuilder Builder;
  enum FlatBuffersVTableOffset FLATBUFFERS_VTABLE_UNDERLYING_TYPE {
    VT_CODE = 4,
    VT_ENTRYNAME = 6,
    VT_INPUT = 8,
    VT_CBUFFERS = 10
  };
  const flatbuffers::String *code() const {
    return GetPointer<const flatbuffers::String *>(VT_CODE);
  }
  const flatbuffers::String *entryName() const {
    return GetPointer<const flatbuffers::String *>(VT_ENTRYNAME);
  }
  const TypeLayout *input() const {
    return GetPointer<const TypeLayout *>(VT_INPUT);
  }
  const flatbuffers::Vector<flatbuffers::Offset<CBBundle>> *cbuffers() const {
    return GetPointer<const flatbuffers::Vector<flatbuffers::Offset<CBBundle>> *>(VT_CBUFFERS);
  }
  bool Verify(flatbuffers::Verifier &verifier) const {
    return VerifyTableStart(verifier) &&
           VerifyOffset(verifier, VT_CODE) &&
           verifier.VerifyString(code()) &&
           VerifyOffset(verifier, VT_ENTRYNAME) &&
           verifier.VerifyString(entryName()) &&
           VerifyOffset(verifier, VT_INPUT) &&
           verifier.VerifyTable(input()) &&
           VerifyOffset(verifier, VT_CBUFFERS) &&
           verifier.VerifyVector(cbuffers()) &&
           verifier.VerifyVectorOfTables(cbuffers()) &&
           verifier.EndTable();
  }
  VertexShaderT *UnPack(const flatbuffers::resolver_function_t *_resolver = nullptr) const;
  void UnPackTo(VertexShaderT *_o, const flatbuffers::resolver_function_t *_resolver = nullptr) const;
  static flatbuffers::Offset<VertexShader> Pack(flatbuffers::FlatBufferBuilder &_fbb, const VertexShaderT* _o, const flatbuffers::rehasher_function_t *_rehasher = nullptr);
};

struct VertexShaderBuilder {
  typedef VertexShader Table;
  flatbuffers::FlatBufferBuilder &fbb_;
  flatbuffers::uoffset_t start_;
  void add_code(flatbuffers::Offset<flatbuffers::String> code) {
    fbb_.AddOffset(VertexShader::VT_CODE, code);
  }
  void add_entryName(flatbuffers::Offset<flatbuffers::String> entryName) {
    fbb_.AddOffset(VertexShader::VT_ENTRYNAME, entryName);
  }
  void add_input(flatbuffers::Offset<TypeLayout> input) {
    fbb_.AddOffset(VertexShader::VT_INPUT, input);
  }
  void add_cbuffers(flatbuffers::Offset<flatbuffers::Vector<flatbuffers::Offset<CBBundle>>> cbuffers) {
    fbb_.AddOffset(VertexShader::VT_CBUFFERS, cbuffers);
  }
  explicit VertexShaderBuilder(flatbuffers::FlatBufferBuilder &_fbb)
        : fbb_(_fbb) {
    start_ = fbb_.StartTable();
  }
  flatbuffers::Offset<VertexShader> Finish() {
    const auto end = fbb_.EndTable(start_);
    auto o = flatbuffers::Offset<VertexShader>(end);
    return o;
  }
};

inline flatbuffers::Offset<VertexShader> CreateVertexShader(
    flatbuffers::FlatBufferBuilder &_fbb,
    flatbuffers::Offset<flatbuffers::String> code = 0,
    flatbuffers::Offset<flatbuffers::String> entryName = 0,
    flatbuffers::Offset<TypeLayout> input = 0,
    flatbuffers::Offset<flatbuffers::Vector<flatbuffers::Offset<CBBundle>>> cbuffers = 0) {
  VertexShaderBuilder builder_(_fbb);
  builder_.add_cbuffers(cbuffers);
  builder_.add_input(input);
  builder_.add_entryName(entryName);
  builder_.add_code(code);
  return builder_.Finish();
}

inline flatbuffers::Offset<VertexShader> CreateVertexShaderDirect(
    flatbuffers::FlatBufferBuilder &_fbb,
    const char *code = nullptr,
    const char *entryName = nullptr,
    flatbuffers::Offset<TypeLayout> input = 0,
    const std::vector<flatbuffers::Offset<CBBundle>> *cbuffers = nullptr) {
  auto code__ = code ? _fbb.CreateString(code) : 0;
  auto entryName__ = entryName ? _fbb.CreateString(entryName) : 0;
  auto cbuffers__ = cbuffers ? _fbb.CreateVector<flatbuffers::Offset<CBBundle>>(*cbuffers) : 0;
  return Fx::CreateVertexShader(
      _fbb,
      code__,
      entryName__,
      input,
      cbuffers__);
}

flatbuffers::Offset<VertexShader> CreateVertexShader(flatbuffers::FlatBufferBuilder &_fbb, const VertexShaderT *_o, const flatbuffers::rehasher_function_t *_rehasher = nullptr);

struct PixelShaderT : public flatbuffers::NativeTable {
  typedef PixelShader TableType;
  std::string code{};
  std::string entryName{};
  std::vector<std::unique_ptr<CBBundleT>> cbuffers{};
  PixelShaderT() = default;
  PixelShaderT(const PixelShaderT &o);
  PixelShaderT(PixelShaderT&&) FLATBUFFERS_NOEXCEPT = default;
  PixelShaderT &operator=(PixelShaderT o) FLATBUFFERS_NOEXCEPT;
};

struct PixelShader FLATBUFFERS_FINAL_CLASS : private flatbuffers::Table {
  typedef PixelShaderT NativeTableType;
  typedef PixelShaderBuilder Builder;
  enum FlatBuffersVTableOffset FLATBUFFERS_VTABLE_UNDERLYING_TYPE {
    VT_CODE = 4,
    VT_ENTRYNAME = 6,
    VT_CBUFFERS = 8
  };
  const flatbuffers::String *code() const {
    return GetPointer<const flatbuffers::String *>(VT_CODE);
  }
  const flatbuffers::String *entryName() const {
    return GetPointer<const flatbuffers::String *>(VT_ENTRYNAME);
  }
  const flatbuffers::Vector<flatbuffers::Offset<CBBundle>> *cbuffers() const {
    return GetPointer<const flatbuffers::Vector<flatbuffers::Offset<CBBundle>> *>(VT_CBUFFERS);
  }
  bool Verify(flatbuffers::Verifier &verifier) const {
    return VerifyTableStart(verifier) &&
           VerifyOffset(verifier, VT_CODE) &&
           verifier.VerifyString(code()) &&
           VerifyOffset(verifier, VT_ENTRYNAME) &&
           verifier.VerifyString(entryName()) &&
           VerifyOffset(verifier, VT_CBUFFERS) &&
           verifier.VerifyVector(cbuffers()) &&
           verifier.VerifyVectorOfTables(cbuffers()) &&
           verifier.EndTable();
  }
  PixelShaderT *UnPack(const flatbuffers::resolver_function_t *_resolver = nullptr) const;
  void UnPackTo(PixelShaderT *_o, const flatbuffers::resolver_function_t *_resolver = nullptr) const;
  static flatbuffers::Offset<PixelShader> Pack(flatbuffers::FlatBufferBuilder &_fbb, const PixelShaderT* _o, const flatbuffers::rehasher_function_t *_rehasher = nullptr);
};

struct PixelShaderBuilder {
  typedef PixelShader Table;
  flatbuffers::FlatBufferBuilder &fbb_;
  flatbuffers::uoffset_t start_;
  void add_code(flatbuffers::Offset<flatbuffers::String> code) {
    fbb_.AddOffset(PixelShader::VT_CODE, code);
  }
  void add_entryName(flatbuffers::Offset<flatbuffers::String> entryName) {
    fbb_.AddOffset(PixelShader::VT_ENTRYNAME, entryName);
  }
  void add_cbuffers(flatbuffers::Offset<flatbuffers::Vector<flatbuffers::Offset<CBBundle>>> cbuffers) {
    fbb_.AddOffset(PixelShader::VT_CBUFFERS, cbuffers);
  }
  explicit PixelShaderBuilder(flatbuffers::FlatBufferBuilder &_fbb)
        : fbb_(_fbb) {
    start_ = fbb_.StartTable();
  }
  flatbuffers::Offset<PixelShader> Finish() {
    const auto end = fbb_.EndTable(start_);
    auto o = flatbuffers::Offset<PixelShader>(end);
    return o;
  }
};

inline flatbuffers::Offset<PixelShader> CreatePixelShader(
    flatbuffers::FlatBufferBuilder &_fbb,
    flatbuffers::Offset<flatbuffers::String> code = 0,
    flatbuffers::Offset<flatbuffers::String> entryName = 0,
    flatbuffers::Offset<flatbuffers::Vector<flatbuffers::Offset<CBBundle>>> cbuffers = 0) {
  PixelShaderBuilder builder_(_fbb);
  builder_.add_cbuffers(cbuffers);
  builder_.add_entryName(entryName);
  builder_.add_code(code);
  return builder_.Finish();
}

inline flatbuffers::Offset<PixelShader> CreatePixelShaderDirect(
    flatbuffers::FlatBufferBuilder &_fbb,
    const char *code = nullptr,
    const char *entryName = nullptr,
    const std::vector<flatbuffers::Offset<CBBundle>> *cbuffers = nullptr) {
  auto code__ = code ? _fbb.CreateString(code) : 0;
  auto entryName__ = entryName ? _fbb.CreateString(entryName) : 0;
  auto cbuffers__ = cbuffers ? _fbb.CreateVector<flatbuffers::Offset<CBBundle>>(*cbuffers) : 0;
  return Fx::CreatePixelShader(
      _fbb,
      code__,
      entryName__,
      cbuffers__);
}

flatbuffers::Offset<PixelShader> CreatePixelShader(flatbuffers::FlatBufferBuilder &_fbb, const PixelShaderT *_o, const flatbuffers::rehasher_function_t *_rehasher = nullptr);

struct Technique11RenderPassT : public flatbuffers::NativeTable {
  typedef Technique11RenderPass TableType;
  std::vector<uint8_t> code{};
  std::vector<Fx::ShaderUnion> shaders{};
};

struct Technique11RenderPass FLATBUFFERS_FINAL_CLASS : private flatbuffers::Table {
  typedef Technique11RenderPassT NativeTableType;
  typedef Technique11RenderPassBuilder Builder;
  enum FlatBuffersVTableOffset FLATBUFFERS_VTABLE_UNDERLYING_TYPE {
    VT_CODE = 4,
    VT_SHADERS_TYPE = 6,
    VT_SHADERS = 8
  };
  const flatbuffers::Vector<uint8_t> *code() const {
    return GetPointer<const flatbuffers::Vector<uint8_t> *>(VT_CODE);
  }
  const flatbuffers::Vector<uint8_t> *shaders_type() const {
    return GetPointer<const flatbuffers::Vector<uint8_t> *>(VT_SHADERS_TYPE);
  }
  const flatbuffers::Vector<flatbuffers::Offset<void>> *shaders() const {
    return GetPointer<const flatbuffers::Vector<flatbuffers::Offset<void>> *>(VT_SHADERS);
  }
  bool Verify(flatbuffers::Verifier &verifier) const {
    return VerifyTableStart(verifier) &&
           VerifyOffset(verifier, VT_CODE) &&
           verifier.VerifyVector(code()) &&
           VerifyOffset(verifier, VT_SHADERS_TYPE) &&
           verifier.VerifyVector(shaders_type()) &&
           VerifyOffset(verifier, VT_SHADERS) &&
           verifier.VerifyVector(shaders()) &&
           VerifyShaderVector(verifier, shaders(), shaders_type()) &&
           verifier.EndTable();
  }
  Technique11RenderPassT *UnPack(const flatbuffers::resolver_function_t *_resolver = nullptr) const;
  void UnPackTo(Technique11RenderPassT *_o, const flatbuffers::resolver_function_t *_resolver = nullptr) const;
  static flatbuffers::Offset<Technique11RenderPass> Pack(flatbuffers::FlatBufferBuilder &_fbb, const Technique11RenderPassT* _o, const flatbuffers::rehasher_function_t *_rehasher = nullptr);
};

struct Technique11RenderPassBuilder {
  typedef Technique11RenderPass Table;
  flatbuffers::FlatBufferBuilder &fbb_;
  flatbuffers::uoffset_t start_;
  void add_code(flatbuffers::Offset<flatbuffers::Vector<uint8_t>> code) {
    fbb_.AddOffset(Technique11RenderPass::VT_CODE, code);
  }
  void add_shaders_type(flatbuffers::Offset<flatbuffers::Vector<uint8_t>> shaders_type) {
    fbb_.AddOffset(Technique11RenderPass::VT_SHADERS_TYPE, shaders_type);
  }
  void add_shaders(flatbuffers::Offset<flatbuffers::Vector<flatbuffers::Offset<void>>> shaders) {
    fbb_.AddOffset(Technique11RenderPass::VT_SHADERS, shaders);
  }
  explicit Technique11RenderPassBuilder(flatbuffers::FlatBufferBuilder &_fbb)
        : fbb_(_fbb) {
    start_ = fbb_.StartTable();
  }
  flatbuffers::Offset<Technique11RenderPass> Finish() {
    const auto end = fbb_.EndTable(start_);
    auto o = flatbuffers::Offset<Technique11RenderPass>(end);
    return o;
  }
};

inline flatbuffers::Offset<Technique11RenderPass> CreateTechnique11RenderPass(
    flatbuffers::FlatBufferBuilder &_fbb,
    flatbuffers::Offset<flatbuffers::Vector<uint8_t>> code = 0,
    flatbuffers::Offset<flatbuffers::Vector<uint8_t>> shaders_type = 0,
    flatbuffers::Offset<flatbuffers::Vector<flatbuffers::Offset<void>>> shaders = 0) {
  Technique11RenderPassBuilder builder_(_fbb);
  builder_.add_shaders(shaders);
  builder_.add_shaders_type(shaders_type);
  builder_.add_code(code);
  return builder_.Finish();
}

inline flatbuffers::Offset<Technique11RenderPass> CreateTechnique11RenderPassDirect(
    flatbuffers::FlatBufferBuilder &_fbb,
    const std::vector<uint8_t> *code = nullptr,
    const std::vector<uint8_t> *shaders_type = nullptr,
    const std::vector<flatbuffers::Offset<void>> *shaders = nullptr) {
  auto code__ = code ? _fbb.CreateVector<uint8_t>(*code) : 0;
  auto shaders_type__ = shaders_type ? _fbb.CreateVector<uint8_t>(*shaders_type) : 0;
  auto shaders__ = shaders ? _fbb.CreateVector<flatbuffers::Offset<void>>(*shaders) : 0;
  return Fx::CreateTechnique11RenderPass(
      _fbb,
      code__,
      shaders_type__,
      shaders__);
}

flatbuffers::Offset<Technique11RenderPass> CreateTechnique11RenderPass(flatbuffers::FlatBufferBuilder &_fbb, const Technique11RenderPassT *_o, const flatbuffers::rehasher_function_t *_rehasher = nullptr);

struct Technique11BundleT : public flatbuffers::NativeTable {
  typedef Technique11Bundle TableType;
  std::vector<std::unique_ptr<Fx::Technique11RenderPassT>> passes{};
  Technique11BundleT() = default;
  Technique11BundleT(const Technique11BundleT &o);
  Technique11BundleT(Technique11BundleT&&) FLATBUFFERS_NOEXCEPT = default;
  Technique11BundleT &operator=(Technique11BundleT o) FLATBUFFERS_NOEXCEPT;
};

struct Technique11Bundle FLATBUFFERS_FINAL_CLASS : private flatbuffers::Table {
  typedef Technique11BundleT NativeTableType;
  typedef Technique11BundleBuilder Builder;
  enum FlatBuffersVTableOffset FLATBUFFERS_VTABLE_UNDERLYING_TYPE {
    VT_PASSES = 4
  };
  const flatbuffers::Vector<flatbuffers::Offset<Fx::Technique11RenderPass>> *passes() const {
    return GetPointer<const flatbuffers::Vector<flatbuffers::Offset<Fx::Technique11RenderPass>> *>(VT_PASSES);
  }
  bool Verify(flatbuffers::Verifier &verifier) const {
    return VerifyTableStart(verifier) &&
           VerifyOffset(verifier, VT_PASSES) &&
           verifier.VerifyVector(passes()) &&
           verifier.VerifyVectorOfTables(passes()) &&
           verifier.EndTable();
  }
  Technique11BundleT *UnPack(const flatbuffers::resolver_function_t *_resolver = nullptr) const;
  void UnPackTo(Technique11BundleT *_o, const flatbuffers::resolver_function_t *_resolver = nullptr) const;
  static flatbuffers::Offset<Technique11Bundle> Pack(flatbuffers::FlatBufferBuilder &_fbb, const Technique11BundleT* _o, const flatbuffers::rehasher_function_t *_rehasher = nullptr);
};

struct Technique11BundleBuilder {
  typedef Technique11Bundle Table;
  flatbuffers::FlatBufferBuilder &fbb_;
  flatbuffers::uoffset_t start_;
  void add_passes(flatbuffers::Offset<flatbuffers::Vector<flatbuffers::Offset<Fx::Technique11RenderPass>>> passes) {
    fbb_.AddOffset(Technique11Bundle::VT_PASSES, passes);
  }
  explicit Technique11BundleBuilder(flatbuffers::FlatBufferBuilder &_fbb)
        : fbb_(_fbb) {
    start_ = fbb_.StartTable();
  }
  flatbuffers::Offset<Technique11Bundle> Finish() {
    const auto end = fbb_.EndTable(start_);
    auto o = flatbuffers::Offset<Technique11Bundle>(end);
    return o;
  }
};

inline flatbuffers::Offset<Technique11Bundle> CreateTechnique11Bundle(
    flatbuffers::FlatBufferBuilder &_fbb,
    flatbuffers::Offset<flatbuffers::Vector<flatbuffers::Offset<Fx::Technique11RenderPass>>> passes = 0) {
  Technique11BundleBuilder builder_(_fbb);
  builder_.add_passes(passes);
  return builder_.Finish();
}

inline flatbuffers::Offset<Technique11Bundle> CreateTechnique11BundleDirect(
    flatbuffers::FlatBufferBuilder &_fbb,
    const std::vector<flatbuffers::Offset<Fx::Technique11RenderPass>> *passes = nullptr) {
  auto passes__ = passes ? _fbb.CreateVector<flatbuffers::Offset<Fx::Technique11RenderPass>>(*passes) : 0;
  return Fx::CreateTechnique11Bundle(
      _fbb,
      passes__);
}

flatbuffers::Offset<Technique11Bundle> CreateTechnique11Bundle(flatbuffers::FlatBufferBuilder &_fbb, const Technique11BundleT *_o, const flatbuffers::rehasher_function_t *_rehasher = nullptr);

inline VertexShaderT::VertexShaderT(const VertexShaderT &o)
      : code(o.code),
        entryName(o.entryName),
        input((o.input) ? new TypeLayoutT(*o.input) : nullptr) {
  cbuffers.reserve(o.cbuffers.size());
  for (const auto &cbuffers_ : o.cbuffers) { cbuffers.emplace_back((cbuffers_) ? new CBBundleT(*cbuffers_) : nullptr); }
}

inline VertexShaderT &VertexShaderT::operator=(VertexShaderT o) FLATBUFFERS_NOEXCEPT {
  std::swap(code, o.code);
  std::swap(entryName, o.entryName);
  std::swap(input, o.input);
  std::swap(cbuffers, o.cbuffers);
  return *this;
}

inline VertexShaderT *VertexShader::UnPack(const flatbuffers::resolver_function_t *_resolver) const {
  auto _o = std::unique_ptr<VertexShaderT>(new VertexShaderT());
  UnPackTo(_o.get(), _resolver);
  return _o.release();
}

inline void VertexShader::UnPackTo(VertexShaderT *_o, const flatbuffers::resolver_function_t *_resolver) const {
  (void)_o;
  (void)_resolver;
  { auto _e = code(); if (_e) _o->code = _e->str(); }
  { auto _e = entryName(); if (_e) _o->entryName = _e->str(); }
  { auto _e = input(); if (_e) _o->input = std::unique_ptr<TypeLayoutT>(_e->UnPack(_resolver)); }
  { auto _e = cbuffers(); if (_e) { _o->cbuffers.resize(_e->size()); for (flatbuffers::uoffset_t _i = 0; _i < _e->size(); _i++) { _o->cbuffers[_i] = std::unique_ptr<CBBundleT>(_e->Get(_i)->UnPack(_resolver)); } } }
}

inline flatbuffers::Offset<VertexShader> VertexShader::Pack(flatbuffers::FlatBufferBuilder &_fbb, const VertexShaderT* _o, const flatbuffers::rehasher_function_t *_rehasher) {
  return CreateVertexShader(_fbb, _o, _rehasher);
}

inline flatbuffers::Offset<VertexShader> CreateVertexShader(flatbuffers::FlatBufferBuilder &_fbb, const VertexShaderT *_o, const flatbuffers::rehasher_function_t *_rehasher) {
  (void)_rehasher;
  (void)_o;
  struct _VectorArgs { flatbuffers::FlatBufferBuilder *__fbb; const VertexShaderT* __o; const flatbuffers::rehasher_function_t *__rehasher; } _va = { &_fbb, _o, _rehasher}; (void)_va;
  auto _code = _o->code.empty() ? 0 : _fbb.CreateString(_o->code);
  auto _entryName = _o->entryName.empty() ? 0 : _fbb.CreateString(_o->entryName);
  auto _input = _o->input ? CreateTypeLayout(_fbb, _o->input.get(), _rehasher) : 0;
  auto _cbuffers = _o->cbuffers.size() ? _fbb.CreateVector<flatbuffers::Offset<CBBundle>> (_o->cbuffers.size(), [](size_t i, _VectorArgs *__va) { return CreateCBBundle(*__va->__fbb, __va->__o->cbuffers[i].get(), __va->__rehasher); }, &_va ) : 0;
  return Fx::CreateVertexShader(
      _fbb,
      _code,
      _entryName,
      _input,
      _cbuffers);
}

inline PixelShaderT::PixelShaderT(const PixelShaderT &o)
      : code(o.code),
        entryName(o.entryName) {
  cbuffers.reserve(o.cbuffers.size());
  for (const auto &cbuffers_ : o.cbuffers) { cbuffers.emplace_back((cbuffers_) ? new CBBundleT(*cbuffers_) : nullptr); }
}

inline PixelShaderT &PixelShaderT::operator=(PixelShaderT o) FLATBUFFERS_NOEXCEPT {
  std::swap(code, o.code);
  std::swap(entryName, o.entryName);
  std::swap(cbuffers, o.cbuffers);
  return *this;
}

inline PixelShaderT *PixelShader::UnPack(const flatbuffers::resolver_function_t *_resolver) const {
  auto _o = std::unique_ptr<PixelShaderT>(new PixelShaderT());
  UnPackTo(_o.get(), _resolver);
  return _o.release();
}

inline void PixelShader::UnPackTo(PixelShaderT *_o, const flatbuffers::resolver_function_t *_resolver) const {
  (void)_o;
  (void)_resolver;
  { auto _e = code(); if (_e) _o->code = _e->str(); }
  { auto _e = entryName(); if (_e) _o->entryName = _e->str(); }
  { auto _e = cbuffers(); if (_e) { _o->cbuffers.resize(_e->size()); for (flatbuffers::uoffset_t _i = 0; _i < _e->size(); _i++) { _o->cbuffers[_i] = std::unique_ptr<CBBundleT>(_e->Get(_i)->UnPack(_resolver)); } } }
}

inline flatbuffers::Offset<PixelShader> PixelShader::Pack(flatbuffers::FlatBufferBuilder &_fbb, const PixelShaderT* _o, const flatbuffers::rehasher_function_t *_rehasher) {
  return CreatePixelShader(_fbb, _o, _rehasher);
}

inline flatbuffers::Offset<PixelShader> CreatePixelShader(flatbuffers::FlatBufferBuilder &_fbb, const PixelShaderT *_o, const flatbuffers::rehasher_function_t *_rehasher) {
  (void)_rehasher;
  (void)_o;
  struct _VectorArgs { flatbuffers::FlatBufferBuilder *__fbb; const PixelShaderT* __o; const flatbuffers::rehasher_function_t *__rehasher; } _va = { &_fbb, _o, _rehasher}; (void)_va;
  auto _code = _o->code.empty() ? 0 : _fbb.CreateString(_o->code);
  auto _entryName = _o->entryName.empty() ? 0 : _fbb.CreateString(_o->entryName);
  auto _cbuffers = _o->cbuffers.size() ? _fbb.CreateVector<flatbuffers::Offset<CBBundle>> (_o->cbuffers.size(), [](size_t i, _VectorArgs *__va) { return CreateCBBundle(*__va->__fbb, __va->__o->cbuffers[i].get(), __va->__rehasher); }, &_va ) : 0;
  return Fx::CreatePixelShader(
      _fbb,
      _code,
      _entryName,
      _cbuffers);
}

inline Technique11RenderPassT *Technique11RenderPass::UnPack(const flatbuffers::resolver_function_t *_resolver) const {
  auto _o = std::unique_ptr<Technique11RenderPassT>(new Technique11RenderPassT());
  UnPackTo(_o.get(), _resolver);
  return _o.release();
}

inline void Technique11RenderPass::UnPackTo(Technique11RenderPassT *_o, const flatbuffers::resolver_function_t *_resolver) const {
  (void)_o;
  (void)_resolver;
  { auto _e = code(); if (_e) { _o->code.resize(_e->size()); std::copy(_e->begin(), _e->end(), _o->code.begin()); } }
  { auto _e = shaders_type(); if (_e) { _o->shaders.resize(_e->size()); for (flatbuffers::uoffset_t _i = 0; _i < _e->size(); _i++) { _o->shaders[_i].type = static_cast<Fx::Shader>(_e->Get(_i)); } } }
  { auto _e = shaders(); if (_e) { _o->shaders.resize(_e->size()); for (flatbuffers::uoffset_t _i = 0; _i < _e->size(); _i++) { _o->shaders[_i].value = Fx::ShaderUnion::UnPack(_e->Get(_i), shaders_type()->GetEnum<Shader>(_i), _resolver); } } }
}

inline flatbuffers::Offset<Technique11RenderPass> Technique11RenderPass::Pack(flatbuffers::FlatBufferBuilder &_fbb, const Technique11RenderPassT* _o, const flatbuffers::rehasher_function_t *_rehasher) {
  return CreateTechnique11RenderPass(_fbb, _o, _rehasher);
}

inline flatbuffers::Offset<Technique11RenderPass> CreateTechnique11RenderPass(flatbuffers::FlatBufferBuilder &_fbb, const Technique11RenderPassT *_o, const flatbuffers::rehasher_function_t *_rehasher) {
  (void)_rehasher;
  (void)_o;
  struct _VectorArgs { flatbuffers::FlatBufferBuilder *__fbb; const Technique11RenderPassT* __o; const flatbuffers::rehasher_function_t *__rehasher; } _va = { &_fbb, _o, _rehasher}; (void)_va;
  auto _code = _o->code.size() ? _fbb.CreateVector(_o->code) : 0;
  auto _shaders_type = _o->shaders.size() ? _fbb.CreateVector<uint8_t>(_o->shaders.size(), [](size_t i, _VectorArgs *__va) { return static_cast<uint8_t>(__va->__o->shaders[i].type); }, &_va) : 0;
  auto _shaders = _o->shaders.size() ? _fbb.CreateVector<flatbuffers::Offset<void>>(_o->shaders.size(), [](size_t i, _VectorArgs *__va) { return __va->__o->shaders[i].Pack(*__va->__fbb, __va->__rehasher); }, &_va) : 0;
  return Fx::CreateTechnique11RenderPass(
      _fbb,
      _code,
      _shaders_type,
      _shaders);
}

inline Technique11BundleT::Technique11BundleT(const Technique11BundleT &o) {
  passes.reserve(o.passes.size());
  for (const auto &passes_ : o.passes) { passes.emplace_back((passes_) ? new Fx::Technique11RenderPassT(*passes_) : nullptr); }
}

inline Technique11BundleT &Technique11BundleT::operator=(Technique11BundleT o) FLATBUFFERS_NOEXCEPT {
  std::swap(passes, o.passes);
  return *this;
}

inline Technique11BundleT *Technique11Bundle::UnPack(const flatbuffers::resolver_function_t *_resolver) const {
  auto _o = std::unique_ptr<Technique11BundleT>(new Technique11BundleT());
  UnPackTo(_o.get(), _resolver);
  return _o.release();
}

inline void Technique11Bundle::UnPackTo(Technique11BundleT *_o, const flatbuffers::resolver_function_t *_resolver) const {
  (void)_o;
  (void)_resolver;
  { auto _e = passes(); if (_e) { _o->passes.resize(_e->size()); for (flatbuffers::uoffset_t _i = 0; _i < _e->size(); _i++) { _o->passes[_i] = std::unique_ptr<Fx::Technique11RenderPassT>(_e->Get(_i)->UnPack(_resolver)); } } }
}

inline flatbuffers::Offset<Technique11Bundle> Technique11Bundle::Pack(flatbuffers::FlatBufferBuilder &_fbb, const Technique11BundleT* _o, const flatbuffers::rehasher_function_t *_rehasher) {
  return CreateTechnique11Bundle(_fbb, _o, _rehasher);
}

inline flatbuffers::Offset<Technique11Bundle> CreateTechnique11Bundle(flatbuffers::FlatBufferBuilder &_fbb, const Technique11BundleT *_o, const flatbuffers::rehasher_function_t *_rehasher) {
  (void)_rehasher;
  (void)_o;
  struct _VectorArgs { flatbuffers::FlatBufferBuilder *__fbb; const Technique11BundleT* __o; const flatbuffers::rehasher_function_t *__rehasher; } _va = { &_fbb, _o, _rehasher}; (void)_va;
  auto _passes = _o->passes.size() ? _fbb.CreateVector<flatbuffers::Offset<Fx::Technique11RenderPass>> (_o->passes.size(), [](size_t i, _VectorArgs *__va) { return CreateTechnique11RenderPass(*__va->__fbb, __va->__o->passes[i].get(), __va->__rehasher); }, &_va ) : 0;
  return Fx::CreateTechnique11Bundle(
      _fbb,
      _passes);
}

inline bool VerifyShader(flatbuffers::Verifier &verifier, const void *obj, Shader type) {
  switch (type) {
    case Shader_NONE: {
      return true;
    }
    case Shader_VertexShader: {
      auto ptr = reinterpret_cast<const Fx::VertexShader *>(obj);
      return verifier.VerifyTable(ptr);
    }
    case Shader_PixelShader: {
      auto ptr = reinterpret_cast<const Fx::PixelShader *>(obj);
      return verifier.VerifyTable(ptr);
    }
    default: return true;
  }
}

inline bool VerifyShaderVector(flatbuffers::Verifier &verifier, const flatbuffers::Vector<flatbuffers::Offset<void>> *values, const flatbuffers::Vector<uint8_t> *types) {
  if (!values || !types) return !values && !types;
  if (values->size() != types->size()) return false;
  for (flatbuffers::uoffset_t i = 0; i < values->size(); ++i) {
    if (!VerifyShader(
        verifier,  values->Get(i), types->GetEnum<Shader>(i))) {
      return false;
    }
  }
  return true;
}

inline void *ShaderUnion::UnPack(const void *obj, Shader type, const flatbuffers::resolver_function_t *resolver) {
  (void)resolver;
  switch (type) {
    case Shader_VertexShader: {
      auto ptr = reinterpret_cast<const Fx::VertexShader *>(obj);
      return ptr->UnPack(resolver);
    }
    case Shader_PixelShader: {
      auto ptr = reinterpret_cast<const Fx::PixelShader *>(obj);
      return ptr->UnPack(resolver);
    }
    default: return nullptr;
  }
}

inline flatbuffers::Offset<void> ShaderUnion::Pack(flatbuffers::FlatBufferBuilder &_fbb, const flatbuffers::rehasher_function_t *_rehasher) const {
  (void)_rehasher;
  switch (type) {
    case Shader_VertexShader: {
      auto ptr = reinterpret_cast<const Fx::VertexShaderT *>(value);
      return CreateVertexShader(_fbb, ptr, _rehasher).Union();
    }
    case Shader_PixelShader: {
      auto ptr = reinterpret_cast<const Fx::PixelShaderT *>(value);
      return CreatePixelShader(_fbb, ptr, _rehasher).Union();
    }
    default: return 0;
  }
}

inline ShaderUnion::ShaderUnion(const ShaderUnion &u) : type(u.type), value(nullptr) {
  switch (type) {
    case Shader_VertexShader: {
      value = new Fx::VertexShaderT(*reinterpret_cast<Fx::VertexShaderT *>(u.value));
      break;
    }
    case Shader_PixelShader: {
      value = new Fx::PixelShaderT(*reinterpret_cast<Fx::PixelShaderT *>(u.value));
      break;
    }
    default:
      break;
  }
}

inline void ShaderUnion::Reset() {
  switch (type) {
    case Shader_VertexShader: {
      auto ptr = reinterpret_cast<Fx::VertexShaderT *>(value);
      delete ptr;
      break;
    }
    case Shader_PixelShader: {
      auto ptr = reinterpret_cast<Fx::PixelShaderT *>(value);
      delete ptr;
      break;
    }
    default: break;
  }
  value = nullptr;
  type = Shader_NONE;
}

}  // namespace Fx

#endif  // FLATBUFFERS_GENERATED_TECHNIQUE11_FX_H_
