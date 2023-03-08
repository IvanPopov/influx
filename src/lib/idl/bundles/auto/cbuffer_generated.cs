// <auto-generated>
//  automatically generated by the FlatBuffers compiler, do not modify
// </auto-generated>

using global::System;
using global::System.Collections.Generic;
using global::FlatBuffers;

public struct CBBundle : IFlatbufferObject
{
  private Table __p;
  public ByteBuffer ByteBuffer { get { return __p.bb; } }
  public static void ValidateVersion() { FlatBufferConstants.FLATBUFFERS_2_0_0(); }
  public static CBBundle GetRootAsCBBundle(ByteBuffer _bb) { return GetRootAsCBBundle(_bb, new CBBundle()); }
  public static CBBundle GetRootAsCBBundle(ByteBuffer _bb, CBBundle obj) { return (obj.__assign(_bb.GetInt(_bb.Position) + _bb.Position, _bb)); }
  public void __init(int _i, ByteBuffer _bb) { __p = new Table(_i, _bb); }
  public CBBundle __assign(int _i, ByteBuffer _bb) { __init(_i, _bb); return this; }

  public string Name { get { int o = __p.__offset(4); return o != 0 ? __p.__string(o + __p.bb_pos) : null; } }
#if ENABLE_SPAN_T
  public Span<byte> GetNameBytes() { return __p.__vector_as_span<byte>(4, 1); }
#else
  public ArraySegment<byte>? GetNameBytes() { return __p.__vector_as_arraysegment(4); }
#endif
  public byte[] GetNameArray() { return __p.__vector_as_array<byte>(4); }
  public uint Slot { get { int o = __p.__offset(6); return o != 0 ? __p.bb.GetUint(o + __p.bb_pos) : (uint)0; } }
  public uint Size { get { int o = __p.__offset(8); return o != 0 ? __p.bb.GetUint(o + __p.bb_pos) : (uint)0; } }
  public TypeField? Fields(int j) { int o = __p.__offset(10); return o != 0 ? (TypeField?)(new TypeField()).__assign(__p.__indirect(__p.__vector(o) + j * 4), __p.bb) : null; }
  public int FieldsLength { get { int o = __p.__offset(10); return o != 0 ? __p.__vector_len(o) : 0; } }

  public static Offset<CBBundle> CreateCBBundle(FlatBufferBuilder builder,
      StringOffset nameOffset = default(StringOffset),
      uint slot = 0,
      uint size = 0,
      VectorOffset fieldsOffset = default(VectorOffset)) {
    builder.StartTable(4);
    CBBundle.AddFields(builder, fieldsOffset);
    CBBundle.AddSize(builder, size);
    CBBundle.AddSlot(builder, slot);
    CBBundle.AddName(builder, nameOffset);
    return CBBundle.EndCBBundle(builder);
  }

  public static void StartCBBundle(FlatBufferBuilder builder) { builder.StartTable(4); }
  public static void AddName(FlatBufferBuilder builder, StringOffset nameOffset) { builder.AddOffset(0, nameOffset.Value, 0); }
  public static void AddSlot(FlatBufferBuilder builder, uint slot) { builder.AddUint(1, slot, 0); }
  public static void AddSize(FlatBufferBuilder builder, uint size) { builder.AddUint(2, size, 0); }
  public static void AddFields(FlatBufferBuilder builder, VectorOffset fieldsOffset) { builder.AddOffset(3, fieldsOffset.Value, 0); }
  public static VectorOffset CreateFieldsVector(FlatBufferBuilder builder, Offset<TypeField>[] data) { builder.StartVector(4, data.Length, 4); for (int i = data.Length - 1; i >= 0; i--) builder.AddOffset(data[i].Value); return builder.EndVector(); }
  public static VectorOffset CreateFieldsVectorBlock(FlatBufferBuilder builder, Offset<TypeField>[] data) { builder.StartVector(4, data.Length, 4); builder.Add(data); return builder.EndVector(); }
  public static VectorOffset CreateFieldsVectorBlock(FlatBufferBuilder builder, ArraySegment<Offset<TypeField>> data) { builder.StartVector(4, data.Count, 4); builder.Add(data); return builder.EndVector(); }
  public static VectorOffset CreateFieldsVectorBlock(FlatBufferBuilder builder, IntPtr dataPtr, int sizeInBytes) { builder.StartVector(1, sizeInBytes, 1); builder.Add<Offset<TypeField>>(dataPtr, sizeInBytes); return builder.EndVector(); }
  public static void StartFieldsVector(FlatBufferBuilder builder, int numElems) { builder.StartVector(4, numElems, 4); }
  public static Offset<CBBundle> EndCBBundle(FlatBufferBuilder builder) {
    int o = builder.EndTable();
    return new Offset<CBBundle>(o);
  }
  public CBBundleT UnPack() {
    var _o = new CBBundleT();
    this.UnPackTo(_o);
    return _o;
  }
  public void UnPackTo(CBBundleT _o) {
    _o.Name = this.Name;
    _o.Slot = this.Slot;
    _o.Size = this.Size;
    _o.Fields = new List<TypeFieldT>();
    for (var _j = 0; _j < this.FieldsLength; ++_j) {_o.Fields.Add(this.Fields(_j).HasValue ? this.Fields(_j).Value.UnPack() : null);}
  }
  public static Offset<CBBundle> Pack(FlatBufferBuilder builder, CBBundleT _o) {
    if (_o == null) return default(Offset<CBBundle>);
    var _name = _o.Name == null ? default(StringOffset) : builder.CreateString(_o.Name);
    var _fields = default(VectorOffset);
    if (_o.Fields != null) {
      var __fields = new Offset<TypeField>[_o.Fields.Count];
      for (var _j = 0; _j < __fields.Length; ++_j) { __fields[_j] = TypeField.Pack(builder, _o.Fields[_j]); }
      _fields = CreateFieldsVector(builder, __fields);
    }
    return CreateCBBundle(
      builder,
      _name,
      _o.Slot,
      _o.Size,
      _fields);
  }
}

public class CBBundleT
{
  public string Name { get; set; }
  public uint Slot { get; set; }
  public uint Size { get; set; }
  public List<TypeFieldT> Fields { get; set; }

  public CBBundleT() {
    this.Name = null;
    this.Slot = 0;
    this.Size = 0;
    this.Fields = null;
  }
}
