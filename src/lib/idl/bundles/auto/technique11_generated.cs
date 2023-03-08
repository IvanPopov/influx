// <auto-generated>
//  automatically generated by the FlatBuffers compiler, do not modify
// </auto-generated>

namespace Fx
{

using global::System;
using global::System.Collections.Generic;
using global::FlatBuffers;

public enum Shader : byte
{
  NONE = 0,
  VertexShader = 1,
  PixelShader = 2,
};

public class ShaderUnion {
  public Shader Type { get; set; }
  public object Value { get; set; }

  public ShaderUnion() {
    this.Type = Shader.NONE;
    this.Value = null;
  }

  public T As<T>() where T : class { return this.Value as T; }
  public Fx.VertexShaderT AsVertexShader() { return this.As<Fx.VertexShaderT>(); }
  public static ShaderUnion FromVertexShader(Fx.VertexShaderT _vertexshader) { return new ShaderUnion{ Type = Shader.VertexShader, Value = _vertexshader }; }
  public Fx.PixelShaderT AsPixelShader() { return this.As<Fx.PixelShaderT>(); }
  public static ShaderUnion FromPixelShader(Fx.PixelShaderT _pixelshader) { return new ShaderUnion{ Type = Shader.PixelShader, Value = _pixelshader }; }

  public static int Pack(FlatBuffers.FlatBufferBuilder builder, ShaderUnion _o) {
    switch (_o.Type) {
      default: return 0;
      case Shader.VertexShader: return Fx.VertexShader.Pack(builder, _o.AsVertexShader()).Value;
      case Shader.PixelShader: return Fx.PixelShader.Pack(builder, _o.AsPixelShader()).Value;
    }
  }
}

public struct VertexShader : IFlatbufferObject
{
  private Table __p;
  public ByteBuffer ByteBuffer { get { return __p.bb; } }
  public static void ValidateVersion() { FlatBufferConstants.FLATBUFFERS_2_0_0(); }
  public static VertexShader GetRootAsVertexShader(ByteBuffer _bb) { return GetRootAsVertexShader(_bb, new VertexShader()); }
  public static VertexShader GetRootAsVertexShader(ByteBuffer _bb, VertexShader obj) { return (obj.__assign(_bb.GetInt(_bb.Position) + _bb.Position, _bb)); }
  public void __init(int _i, ByteBuffer _bb) { __p = new Table(_i, _bb); }
  public VertexShader __assign(int _i, ByteBuffer _bb) { __init(_i, _bb); return this; }

  public string Code { get { int o = __p.__offset(4); return o != 0 ? __p.__string(o + __p.bb_pos) : null; } }
#if ENABLE_SPAN_T
  public Span<byte> GetCodeBytes() { return __p.__vector_as_span<byte>(4, 1); }
#else
  public ArraySegment<byte>? GetCodeBytes() { return __p.__vector_as_arraysegment(4); }
#endif
  public byte[] GetCodeArray() { return __p.__vector_as_array<byte>(4); }
  public string EntryName { get { int o = __p.__offset(6); return o != 0 ? __p.__string(o + __p.bb_pos) : null; } }
#if ENABLE_SPAN_T
  public Span<byte> GetEntryNameBytes() { return __p.__vector_as_span<byte>(6, 1); }
#else
  public ArraySegment<byte>? GetEntryNameBytes() { return __p.__vector_as_arraysegment(6); }
#endif
  public byte[] GetEntryNameArray() { return __p.__vector_as_array<byte>(6); }
  public TypeLayout? Input { get { int o = __p.__offset(8); return o != 0 ? (TypeLayout?)(new TypeLayout()).__assign(__p.__indirect(o + __p.bb_pos), __p.bb) : null; } }
  public CBBundle? Cbuffers(int j) { int o = __p.__offset(10); return o != 0 ? (CBBundle?)(new CBBundle()).__assign(__p.__indirect(__p.__vector(o) + j * 4), __p.bb) : null; }
  public int CbuffersLength { get { int o = __p.__offset(10); return o != 0 ? __p.__vector_len(o) : 0; } }

  public static Offset<Fx.VertexShader> CreateVertexShader(FlatBufferBuilder builder,
      StringOffset codeOffset = default(StringOffset),
      StringOffset entryNameOffset = default(StringOffset),
      Offset<TypeLayout> inputOffset = default(Offset<TypeLayout>),
      VectorOffset cbuffersOffset = default(VectorOffset)) {
    builder.StartTable(4);
    VertexShader.AddCbuffers(builder, cbuffersOffset);
    VertexShader.AddInput(builder, inputOffset);
    VertexShader.AddEntryName(builder, entryNameOffset);
    VertexShader.AddCode(builder, codeOffset);
    return VertexShader.EndVertexShader(builder);
  }

  public static void StartVertexShader(FlatBufferBuilder builder) { builder.StartTable(4); }
  public static void AddCode(FlatBufferBuilder builder, StringOffset codeOffset) { builder.AddOffset(0, codeOffset.Value, 0); }
  public static void AddEntryName(FlatBufferBuilder builder, StringOffset entryNameOffset) { builder.AddOffset(1, entryNameOffset.Value, 0); }
  public static void AddInput(FlatBufferBuilder builder, Offset<TypeLayout> inputOffset) { builder.AddOffset(2, inputOffset.Value, 0); }
  public static void AddCbuffers(FlatBufferBuilder builder, VectorOffset cbuffersOffset) { builder.AddOffset(3, cbuffersOffset.Value, 0); }
  public static VectorOffset CreateCbuffersVector(FlatBufferBuilder builder, Offset<CBBundle>[] data) { builder.StartVector(4, data.Length, 4); for (int i = data.Length - 1; i >= 0; i--) builder.AddOffset(data[i].Value); return builder.EndVector(); }
  public static VectorOffset CreateCbuffersVectorBlock(FlatBufferBuilder builder, Offset<CBBundle>[] data) { builder.StartVector(4, data.Length, 4); builder.Add(data); return builder.EndVector(); }
  public static VectorOffset CreateCbuffersVectorBlock(FlatBufferBuilder builder, ArraySegment<Offset<CBBundle>> data) { builder.StartVector(4, data.Count, 4); builder.Add(data); return builder.EndVector(); }
  public static VectorOffset CreateCbuffersVectorBlock(FlatBufferBuilder builder, IntPtr dataPtr, int sizeInBytes) { builder.StartVector(1, sizeInBytes, 1); builder.Add<Offset<CBBundle>>(dataPtr, sizeInBytes); return builder.EndVector(); }
  public static void StartCbuffersVector(FlatBufferBuilder builder, int numElems) { builder.StartVector(4, numElems, 4); }
  public static Offset<Fx.VertexShader> EndVertexShader(FlatBufferBuilder builder) {
    int o = builder.EndTable();
    return new Offset<Fx.VertexShader>(o);
  }
  public VertexShaderT UnPack() {
    var _o = new VertexShaderT();
    this.UnPackTo(_o);
    return _o;
  }
  public void UnPackTo(VertexShaderT _o) {
    _o.Code = this.Code;
    _o.EntryName = this.EntryName;
    _o.Input = this.Input.HasValue ? this.Input.Value.UnPack() : null;
    _o.Cbuffers = new List<CBBundleT>();
    for (var _j = 0; _j < this.CbuffersLength; ++_j) {_o.Cbuffers.Add(this.Cbuffers(_j).HasValue ? this.Cbuffers(_j).Value.UnPack() : null);}
  }
  public static Offset<Fx.VertexShader> Pack(FlatBufferBuilder builder, VertexShaderT _o) {
    if (_o == null) return default(Offset<Fx.VertexShader>);
    var _code = _o.Code == null ? default(StringOffset) : builder.CreateString(_o.Code);
    var _entryName = _o.EntryName == null ? default(StringOffset) : builder.CreateString(_o.EntryName);
    var _input = _o.Input == null ? default(Offset<TypeLayout>) : TypeLayout.Pack(builder, _o.Input);
    var _cbuffers = default(VectorOffset);
    if (_o.Cbuffers != null) {
      var __cbuffers = new Offset<CBBundle>[_o.Cbuffers.Count];
      for (var _j = 0; _j < __cbuffers.Length; ++_j) { __cbuffers[_j] = CBBundle.Pack(builder, _o.Cbuffers[_j]); }
      _cbuffers = CreateCbuffersVector(builder, __cbuffers);
    }
    return CreateVertexShader(
      builder,
      _code,
      _entryName,
      _input,
      _cbuffers);
  }
}

public class VertexShaderT
{
  public string Code { get; set; }
  public string EntryName { get; set; }
  public TypeLayoutT Input { get; set; }
  public List<CBBundleT> Cbuffers { get; set; }

  public VertexShaderT() {
    this.Code = null;
    this.EntryName = null;
    this.Input = null;
    this.Cbuffers = null;
  }
}

public struct PixelShader : IFlatbufferObject
{
  private Table __p;
  public ByteBuffer ByteBuffer { get { return __p.bb; } }
  public static void ValidateVersion() { FlatBufferConstants.FLATBUFFERS_2_0_0(); }
  public static PixelShader GetRootAsPixelShader(ByteBuffer _bb) { return GetRootAsPixelShader(_bb, new PixelShader()); }
  public static PixelShader GetRootAsPixelShader(ByteBuffer _bb, PixelShader obj) { return (obj.__assign(_bb.GetInt(_bb.Position) + _bb.Position, _bb)); }
  public void __init(int _i, ByteBuffer _bb) { __p = new Table(_i, _bb); }
  public PixelShader __assign(int _i, ByteBuffer _bb) { __init(_i, _bb); return this; }

  public string Code { get { int o = __p.__offset(4); return o != 0 ? __p.__string(o + __p.bb_pos) : null; } }
#if ENABLE_SPAN_T
  public Span<byte> GetCodeBytes() { return __p.__vector_as_span<byte>(4, 1); }
#else
  public ArraySegment<byte>? GetCodeBytes() { return __p.__vector_as_arraysegment(4); }
#endif
  public byte[] GetCodeArray() { return __p.__vector_as_array<byte>(4); }
  public string EntryName { get { int o = __p.__offset(6); return o != 0 ? __p.__string(o + __p.bb_pos) : null; } }
#if ENABLE_SPAN_T
  public Span<byte> GetEntryNameBytes() { return __p.__vector_as_span<byte>(6, 1); }
#else
  public ArraySegment<byte>? GetEntryNameBytes() { return __p.__vector_as_arraysegment(6); }
#endif
  public byte[] GetEntryNameArray() { return __p.__vector_as_array<byte>(6); }
  public CBBundle? Cbuffers(int j) { int o = __p.__offset(8); return o != 0 ? (CBBundle?)(new CBBundle()).__assign(__p.__indirect(__p.__vector(o) + j * 4), __p.bb) : null; }
  public int CbuffersLength { get { int o = __p.__offset(8); return o != 0 ? __p.__vector_len(o) : 0; } }

  public static Offset<Fx.PixelShader> CreatePixelShader(FlatBufferBuilder builder,
      StringOffset codeOffset = default(StringOffset),
      StringOffset entryNameOffset = default(StringOffset),
      VectorOffset cbuffersOffset = default(VectorOffset)) {
    builder.StartTable(3);
    PixelShader.AddCbuffers(builder, cbuffersOffset);
    PixelShader.AddEntryName(builder, entryNameOffset);
    PixelShader.AddCode(builder, codeOffset);
    return PixelShader.EndPixelShader(builder);
  }

  public static void StartPixelShader(FlatBufferBuilder builder) { builder.StartTable(3); }
  public static void AddCode(FlatBufferBuilder builder, StringOffset codeOffset) { builder.AddOffset(0, codeOffset.Value, 0); }
  public static void AddEntryName(FlatBufferBuilder builder, StringOffset entryNameOffset) { builder.AddOffset(1, entryNameOffset.Value, 0); }
  public static void AddCbuffers(FlatBufferBuilder builder, VectorOffset cbuffersOffset) { builder.AddOffset(2, cbuffersOffset.Value, 0); }
  public static VectorOffset CreateCbuffersVector(FlatBufferBuilder builder, Offset<CBBundle>[] data) { builder.StartVector(4, data.Length, 4); for (int i = data.Length - 1; i >= 0; i--) builder.AddOffset(data[i].Value); return builder.EndVector(); }
  public static VectorOffset CreateCbuffersVectorBlock(FlatBufferBuilder builder, Offset<CBBundle>[] data) { builder.StartVector(4, data.Length, 4); builder.Add(data); return builder.EndVector(); }
  public static VectorOffset CreateCbuffersVectorBlock(FlatBufferBuilder builder, ArraySegment<Offset<CBBundle>> data) { builder.StartVector(4, data.Count, 4); builder.Add(data); return builder.EndVector(); }
  public static VectorOffset CreateCbuffersVectorBlock(FlatBufferBuilder builder, IntPtr dataPtr, int sizeInBytes) { builder.StartVector(1, sizeInBytes, 1); builder.Add<Offset<CBBundle>>(dataPtr, sizeInBytes); return builder.EndVector(); }
  public static void StartCbuffersVector(FlatBufferBuilder builder, int numElems) { builder.StartVector(4, numElems, 4); }
  public static Offset<Fx.PixelShader> EndPixelShader(FlatBufferBuilder builder) {
    int o = builder.EndTable();
    return new Offset<Fx.PixelShader>(o);
  }
  public PixelShaderT UnPack() {
    var _o = new PixelShaderT();
    this.UnPackTo(_o);
    return _o;
  }
  public void UnPackTo(PixelShaderT _o) {
    _o.Code = this.Code;
    _o.EntryName = this.EntryName;
    _o.Cbuffers = new List<CBBundleT>();
    for (var _j = 0; _j < this.CbuffersLength; ++_j) {_o.Cbuffers.Add(this.Cbuffers(_j).HasValue ? this.Cbuffers(_j).Value.UnPack() : null);}
  }
  public static Offset<Fx.PixelShader> Pack(FlatBufferBuilder builder, PixelShaderT _o) {
    if (_o == null) return default(Offset<Fx.PixelShader>);
    var _code = _o.Code == null ? default(StringOffset) : builder.CreateString(_o.Code);
    var _entryName = _o.EntryName == null ? default(StringOffset) : builder.CreateString(_o.EntryName);
    var _cbuffers = default(VectorOffset);
    if (_o.Cbuffers != null) {
      var __cbuffers = new Offset<CBBundle>[_o.Cbuffers.Count];
      for (var _j = 0; _j < __cbuffers.Length; ++_j) { __cbuffers[_j] = CBBundle.Pack(builder, _o.Cbuffers[_j]); }
      _cbuffers = CreateCbuffersVector(builder, __cbuffers);
    }
    return CreatePixelShader(
      builder,
      _code,
      _entryName,
      _cbuffers);
  }
}

public class PixelShaderT
{
  public string Code { get; set; }
  public string EntryName { get; set; }
  public List<CBBundleT> Cbuffers { get; set; }

  public PixelShaderT() {
    this.Code = null;
    this.EntryName = null;
    this.Cbuffers = null;
  }
}

public struct Technique11RenderPass : IFlatbufferObject
{
  private Table __p;
  public ByteBuffer ByteBuffer { get { return __p.bb; } }
  public static void ValidateVersion() { FlatBufferConstants.FLATBUFFERS_2_0_0(); }
  public static Technique11RenderPass GetRootAsTechnique11RenderPass(ByteBuffer _bb) { return GetRootAsTechnique11RenderPass(_bb, new Technique11RenderPass()); }
  public static Technique11RenderPass GetRootAsTechnique11RenderPass(ByteBuffer _bb, Technique11RenderPass obj) { return (obj.__assign(_bb.GetInt(_bb.Position) + _bb.Position, _bb)); }
  public void __init(int _i, ByteBuffer _bb) { __p = new Table(_i, _bb); }
  public Technique11RenderPass __assign(int _i, ByteBuffer _bb) { __init(_i, _bb); return this; }

  public byte Code(int j) { int o = __p.__offset(4); return o != 0 ? __p.bb.Get(__p.__vector(o) + j * 1) : (byte)0; }
  public int CodeLength { get { int o = __p.__offset(4); return o != 0 ? __p.__vector_len(o) : 0; } }
#if ENABLE_SPAN_T
  public Span<byte> GetCodeBytes() { return __p.__vector_as_span<byte>(4, 1); }
#else
  public ArraySegment<byte>? GetCodeBytes() { return __p.__vector_as_arraysegment(4); }
#endif
  public byte[] GetCodeArray() { return __p.__vector_as_array<byte>(4); }
  public Fx.Shader ShadersType(int j) { int o = __p.__offset(6); return o != 0 ? (Fx.Shader)__p.bb.Get(__p.__vector(o) + j * 1) : (Fx.Shader)0; }
  public int ShadersTypeLength { get { int o = __p.__offset(6); return o != 0 ? __p.__vector_len(o) : 0; } }
#if ENABLE_SPAN_T
  public Span<Fx.Shader> GetShadersTypeBytes() { return __p.__vector_as_span<Fx.Shader>(6, 1); }
#else
  public ArraySegment<byte>? GetShadersTypeBytes() { return __p.__vector_as_arraysegment(6); }
#endif
  public Fx.Shader[] GetShadersTypeArray() { int o = __p.__offset(6); if (o == 0) return null; int p = __p.__vector(o); int l = __p.__vector_len(o); Fx.Shader[] a = new Fx.Shader[l]; for (int i = 0; i < l; i++) { a[i] = (Fx.Shader)__p.bb.Get(p + i * 1); } return a; }
  public TTable? Shaders<TTable>(int j) where TTable : struct, IFlatbufferObject { int o = __p.__offset(8); return o != 0 ? (TTable?)__p.__union<TTable>(__p.__vector(o) + j * 4) : null; }
  public int ShadersLength { get { int o = __p.__offset(8); return o != 0 ? __p.__vector_len(o) : 0; } }

  public static Offset<Fx.Technique11RenderPass> CreateTechnique11RenderPass(FlatBufferBuilder builder,
      VectorOffset codeOffset = default(VectorOffset),
      VectorOffset shaders_typeOffset = default(VectorOffset),
      VectorOffset shadersOffset = default(VectorOffset)) {
    builder.StartTable(3);
    Technique11RenderPass.AddShaders(builder, shadersOffset);
    Technique11RenderPass.AddShadersType(builder, shaders_typeOffset);
    Technique11RenderPass.AddCode(builder, codeOffset);
    return Technique11RenderPass.EndTechnique11RenderPass(builder);
  }

  public static void StartTechnique11RenderPass(FlatBufferBuilder builder) { builder.StartTable(3); }
  public static void AddCode(FlatBufferBuilder builder, VectorOffset codeOffset) { builder.AddOffset(0, codeOffset.Value, 0); }
  public static VectorOffset CreateCodeVector(FlatBufferBuilder builder, byte[] data) { builder.StartVector(1, data.Length, 1); for (int i = data.Length - 1; i >= 0; i--) builder.AddByte(data[i]); return builder.EndVector(); }
  public static VectorOffset CreateCodeVectorBlock(FlatBufferBuilder builder, byte[] data) { builder.StartVector(1, data.Length, 1); builder.Add(data); return builder.EndVector(); }
  public static VectorOffset CreateCodeVectorBlock(FlatBufferBuilder builder, ArraySegment<byte> data) { builder.StartVector(1, data.Count, 1); builder.Add(data); return builder.EndVector(); }
  public static VectorOffset CreateCodeVectorBlock(FlatBufferBuilder builder, IntPtr dataPtr, int sizeInBytes) { builder.StartVector(1, sizeInBytes, 1); builder.Add<byte>(dataPtr, sizeInBytes); return builder.EndVector(); }
  public static void StartCodeVector(FlatBufferBuilder builder, int numElems) { builder.StartVector(1, numElems, 1); }
  public static void AddShadersType(FlatBufferBuilder builder, VectorOffset shadersTypeOffset) { builder.AddOffset(1, shadersTypeOffset.Value, 0); }
  public static VectorOffset CreateShadersTypeVector(FlatBufferBuilder builder, Fx.Shader[] data) { builder.StartVector(1, data.Length, 1); for (int i = data.Length - 1; i >= 0; i--) builder.AddByte((byte)data[i]); return builder.EndVector(); }
  public static VectorOffset CreateShadersTypeVectorBlock(FlatBufferBuilder builder, Fx.Shader[] data) { builder.StartVector(1, data.Length, 1); builder.Add(data); return builder.EndVector(); }
  public static VectorOffset CreateShadersTypeVectorBlock(FlatBufferBuilder builder, ArraySegment<Fx.Shader> data) { builder.StartVector(1, data.Count, 1); builder.Add(data); return builder.EndVector(); }
  public static VectorOffset CreateShadersTypeVectorBlock(FlatBufferBuilder builder, IntPtr dataPtr, int sizeInBytes) { builder.StartVector(1, sizeInBytes, 1); builder.Add<Fx.Shader>(dataPtr, sizeInBytes); return builder.EndVector(); }
  public static void StartShadersTypeVector(FlatBufferBuilder builder, int numElems) { builder.StartVector(1, numElems, 1); }
  public static void AddShaders(FlatBufferBuilder builder, VectorOffset shadersOffset) { builder.AddOffset(2, shadersOffset.Value, 0); }
  public static VectorOffset CreateShadersVector(FlatBufferBuilder builder, int[] data) { builder.StartVector(4, data.Length, 4); for (int i = data.Length - 1; i >= 0; i--) builder.AddOffset(data[i]); return builder.EndVector(); }
  public static VectorOffset CreateShadersVectorBlock(FlatBufferBuilder builder, int[] data) { builder.StartVector(4, data.Length, 4); builder.Add(data); return builder.EndVector(); }
  public static VectorOffset CreateShadersVectorBlock(FlatBufferBuilder builder, ArraySegment<int> data) { builder.StartVector(4, data.Count, 4); builder.Add(data); return builder.EndVector(); }
  public static VectorOffset CreateShadersVectorBlock(FlatBufferBuilder builder, IntPtr dataPtr, int sizeInBytes) { builder.StartVector(1, sizeInBytes, 1); builder.Add<int>(dataPtr, sizeInBytes); return builder.EndVector(); }
  public static void StartShadersVector(FlatBufferBuilder builder, int numElems) { builder.StartVector(4, numElems, 4); }
  public static Offset<Fx.Technique11RenderPass> EndTechnique11RenderPass(FlatBufferBuilder builder) {
    int o = builder.EndTable();
    return new Offset<Fx.Technique11RenderPass>(o);
  }
  public Technique11RenderPassT UnPack() {
    var _o = new Technique11RenderPassT();
    this.UnPackTo(_o);
    return _o;
  }
  public void UnPackTo(Technique11RenderPassT _o) {
    _o.Code = new List<byte>();
    for (var _j = 0; _j < this.CodeLength; ++_j) {_o.Code.Add(this.Code(_j));}
    _o.Shaders = new List<Fx.ShaderUnion>();
    for (var _j = 0; _j < this.ShadersLength; ++_j) {
      var _o_Shaders = new Fx.ShaderUnion();
      _o_Shaders.Type = this.ShadersType(_j);
      switch (this.ShadersType(_j)) {
        default: break;
        case Fx.Shader.VertexShader:
          _o_Shaders.Value = this.Shaders<Fx.VertexShader>(_j).HasValue ? this.Shaders<Fx.VertexShader>(_j).Value.UnPack() : null;
          break;
        case Fx.Shader.PixelShader:
          _o_Shaders.Value = this.Shaders<Fx.PixelShader>(_j).HasValue ? this.Shaders<Fx.PixelShader>(_j).Value.UnPack() : null;
          break;
      }
      _o.Shaders.Add(_o_Shaders);
    }
  }
  public static Offset<Fx.Technique11RenderPass> Pack(FlatBufferBuilder builder, Technique11RenderPassT _o) {
    if (_o == null) return default(Offset<Fx.Technique11RenderPass>);
    var _code = default(VectorOffset);
    if (_o.Code != null) {
      var __code = _o.Code.ToArray();
      _code = CreateCodeVector(builder, __code);
    }
    var _shaders_type = default(VectorOffset);
    if (_o.Shaders != null) {
      var __shaders_type = new Fx.Shader[_o.Shaders.Count];
      for (var _j = 0; _j < __shaders_type.Length; ++_j) { __shaders_type[_j] = _o.Shaders[_j].Type; }
      _shaders_type = CreateShadersTypeVector(builder, __shaders_type);
    }
    var _shaders = default(VectorOffset);
    if (_o.Shaders != null) {
      var __shaders = new int[_o.Shaders.Count];
      for (var _j = 0; _j < __shaders.Length; ++_j) { __shaders[_j] = Fx.ShaderUnion.Pack(builder,  _o.Shaders[_j]); }
      _shaders = CreateShadersVector(builder, __shaders);
    }
    return CreateTechnique11RenderPass(
      builder,
      _code,
      _shaders_type,
      _shaders);
  }
}

public class Technique11RenderPassT
{
  public List<byte> Code { get; set; }
  public List<Fx.ShaderUnion> Shaders { get; set; }

  public Technique11RenderPassT() {
    this.Code = null;
    this.Shaders = null;
  }
}

public struct Technique11Bundle : IFlatbufferObject
{
  private Table __p;
  public ByteBuffer ByteBuffer { get { return __p.bb; } }
  public static void ValidateVersion() { FlatBufferConstants.FLATBUFFERS_2_0_0(); }
  public static Technique11Bundle GetRootAsTechnique11Bundle(ByteBuffer _bb) { return GetRootAsTechnique11Bundle(_bb, new Technique11Bundle()); }
  public static Technique11Bundle GetRootAsTechnique11Bundle(ByteBuffer _bb, Technique11Bundle obj) { return (obj.__assign(_bb.GetInt(_bb.Position) + _bb.Position, _bb)); }
  public void __init(int _i, ByteBuffer _bb) { __p = new Table(_i, _bb); }
  public Technique11Bundle __assign(int _i, ByteBuffer _bb) { __init(_i, _bb); return this; }

  public Fx.Technique11RenderPass? Passes(int j) { int o = __p.__offset(4); return o != 0 ? (Fx.Technique11RenderPass?)(new Fx.Technique11RenderPass()).__assign(__p.__indirect(__p.__vector(o) + j * 4), __p.bb) : null; }
  public int PassesLength { get { int o = __p.__offset(4); return o != 0 ? __p.__vector_len(o) : 0; } }

  public static Offset<Fx.Technique11Bundle> CreateTechnique11Bundle(FlatBufferBuilder builder,
      VectorOffset passesOffset = default(VectorOffset)) {
    builder.StartTable(1);
    Technique11Bundle.AddPasses(builder, passesOffset);
    return Technique11Bundle.EndTechnique11Bundle(builder);
  }

  public static void StartTechnique11Bundle(FlatBufferBuilder builder) { builder.StartTable(1); }
  public static void AddPasses(FlatBufferBuilder builder, VectorOffset passesOffset) { builder.AddOffset(0, passesOffset.Value, 0); }
  public static VectorOffset CreatePassesVector(FlatBufferBuilder builder, Offset<Fx.Technique11RenderPass>[] data) { builder.StartVector(4, data.Length, 4); for (int i = data.Length - 1; i >= 0; i--) builder.AddOffset(data[i].Value); return builder.EndVector(); }
  public static VectorOffset CreatePassesVectorBlock(FlatBufferBuilder builder, Offset<Fx.Technique11RenderPass>[] data) { builder.StartVector(4, data.Length, 4); builder.Add(data); return builder.EndVector(); }
  public static VectorOffset CreatePassesVectorBlock(FlatBufferBuilder builder, ArraySegment<Offset<Fx.Technique11RenderPass>> data) { builder.StartVector(4, data.Count, 4); builder.Add(data); return builder.EndVector(); }
  public static VectorOffset CreatePassesVectorBlock(FlatBufferBuilder builder, IntPtr dataPtr, int sizeInBytes) { builder.StartVector(1, sizeInBytes, 1); builder.Add<Offset<Fx.Technique11RenderPass>>(dataPtr, sizeInBytes); return builder.EndVector(); }
  public static void StartPassesVector(FlatBufferBuilder builder, int numElems) { builder.StartVector(4, numElems, 4); }
  public static Offset<Fx.Technique11Bundle> EndTechnique11Bundle(FlatBufferBuilder builder) {
    int o = builder.EndTable();
    return new Offset<Fx.Technique11Bundle>(o);
  }
  public Technique11BundleT UnPack() {
    var _o = new Technique11BundleT();
    this.UnPackTo(_o);
    return _o;
  }
  public void UnPackTo(Technique11BundleT _o) {
    _o.Passes = new List<Fx.Technique11RenderPassT>();
    for (var _j = 0; _j < this.PassesLength; ++_j) {_o.Passes.Add(this.Passes(_j).HasValue ? this.Passes(_j).Value.UnPack() : null);}
  }
  public static Offset<Fx.Technique11Bundle> Pack(FlatBufferBuilder builder, Technique11BundleT _o) {
    if (_o == null) return default(Offset<Fx.Technique11Bundle>);
    var _passes = default(VectorOffset);
    if (_o.Passes != null) {
      var __passes = new Offset<Fx.Technique11RenderPass>[_o.Passes.Count];
      for (var _j = 0; _j < __passes.Length; ++_j) { __passes[_j] = Fx.Technique11RenderPass.Pack(builder, _o.Passes[_j]); }
      _passes = CreatePassesVector(builder, __passes);
    }
    return CreateTechnique11Bundle(
      builder,
      _passes);
  }
}

public class Technique11BundleT
{
  public List<Fx.Technique11RenderPassT> Passes { get; set; }

  public Technique11BundleT() {
    this.Passes = null;
  }
}


}