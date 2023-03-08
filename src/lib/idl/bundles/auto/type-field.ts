// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

import { TypeLayout, TypeLayoutT } from './type-layout';


export class TypeField {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):TypeField {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsTypeField(bb:flatbuffers.ByteBuffer, obj?:TypeField):TypeField {
  return (obj || new TypeField()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsTypeField(bb:flatbuffers.ByteBuffer, obj?:TypeField):TypeField {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new TypeField()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

type(obj?:TypeLayout):TypeLayout|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? (obj || new TypeLayout()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

semantic():string|null
semantic(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
semantic(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

size():number {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

padding():number {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

static startTypeField(builder:flatbuffers.Builder) {
  builder.startObject(5);
}

static addType(builder:flatbuffers.Builder, typeOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, typeOffset, 0);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, nameOffset, 0);
}

static addSemantic(builder:flatbuffers.Builder, semanticOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, semanticOffset, 0);
}

static addSize(builder:flatbuffers.Builder, size:number) {
  builder.addFieldInt32(3, size, 0);
}

static addPadding(builder:flatbuffers.Builder, padding:number) {
  builder.addFieldInt32(4, padding, 0);
}

static endTypeField(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createTypeField(builder:flatbuffers.Builder, typeOffset:flatbuffers.Offset, nameOffset:flatbuffers.Offset, semanticOffset:flatbuffers.Offset, size:number, padding:number):flatbuffers.Offset {
  TypeField.startTypeField(builder);
  TypeField.addType(builder, typeOffset);
  TypeField.addName(builder, nameOffset);
  TypeField.addSemantic(builder, semanticOffset);
  TypeField.addSize(builder, size);
  TypeField.addPadding(builder, padding);
  return TypeField.endTypeField(builder);
}

unpack(): TypeFieldT {
  return new TypeFieldT(
    (this.type() !== null ? this.type()!.unpack() : null),
    this.name(),
    this.semantic(),
    this.size(),
    this.padding()
  );
}


unpackTo(_o: TypeFieldT): void {
  _o.type = (this.type() !== null ? this.type()!.unpack() : null);
  _o.name = this.name();
  _o.semantic = this.semantic();
  _o.size = this.size();
  _o.padding = this.padding();
}
}

export class TypeFieldT {
constructor(
  public type: TypeLayoutT|null = null,
  public name: string|Uint8Array|null = null,
  public semantic: string|Uint8Array|null = null,
  public size: number = 0,
  public padding: number = 0
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const type = (this.type !== null ? this.type!.pack(builder) : 0);
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const semantic = (this.semantic !== null ? builder.createString(this.semantic!) : 0);

  return TypeField.createTypeField(builder,
    type,
    name,
    semantic,
    this.size,
    this.padding
  );
}
}