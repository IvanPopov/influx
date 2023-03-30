// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

import { BoolValue, BoolValueT } from '../fx/bool-value';
import { FloatValue, FloatValueT } from '../fx/float-value';
import { IntValue, IntValueT } from '../fx/int-value';
import { PropertyValue, unionToPropertyValue, unionListToPropertyValue } from '../fx/property-value';
import { StringValue, StringValueT } from '../fx/string-value';
import { UintValue, UintValueT } from '../fx/uint-value';


export class ViewTypeProperty {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):ViewTypeProperty {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsViewTypeProperty(bb:flatbuffers.ByteBuffer, obj?:ViewTypeProperty):ViewTypeProperty {
  return (obj || new ViewTypeProperty()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsViewTypeProperty(bb:flatbuffers.ByteBuffer, obj?:ViewTypeProperty):ViewTypeProperty {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new ViewTypeProperty()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

valueType():PropertyValue {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint8(this.bb_pos + offset) : PropertyValue.NONE;
}

value<T extends flatbuffers.Table>(obj:any):any|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__union(obj, this.bb_pos + offset) : null;
}

static startViewTypeProperty(builder:flatbuffers.Builder) {
  builder.startObject(3);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static addValueType(builder:flatbuffers.Builder, valueType:PropertyValue) {
  builder.addFieldInt8(1, valueType, PropertyValue.NONE);
}

static addValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, valueOffset, 0);
}

static endViewTypeProperty(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createViewTypeProperty(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset, valueType:PropertyValue, valueOffset:flatbuffers.Offset):flatbuffers.Offset {
  ViewTypeProperty.startViewTypeProperty(builder);
  ViewTypeProperty.addName(builder, nameOffset);
  ViewTypeProperty.addValueType(builder, valueType);
  ViewTypeProperty.addValue(builder, valueOffset);
  return ViewTypeProperty.endViewTypeProperty(builder);
}

unpack(): ViewTypePropertyT {
  return new ViewTypePropertyT(
    this.name(),
    this.valueType(),
    (() => {
      let temp = unionToPropertyValue(this.valueType(), this.value.bind(this));
      if(temp === null) { return null; }
      return temp.unpack()
  })()
  );
}


unpackTo(_o: ViewTypePropertyT): void {
  _o.name = this.name();
  _o.valueType = this.valueType();
  _o.value = (() => {
      let temp = unionToPropertyValue(this.valueType(), this.value.bind(this));
      if(temp === null) { return null; }
      return temp.unpack()
  })();
}
}

export class ViewTypePropertyT {
constructor(
  public name: string|Uint8Array|null = null,
  public valueType: PropertyValue = PropertyValue.NONE,
  public value: BoolValueT|FloatValueT|IntValueT|StringValueT|UintValueT|null = null
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const value = builder.createObjectOffset(this.value);

  return ViewTypeProperty.createViewTypeProperty(builder,
    name,
    this.valueType,
    value
  );
}
}
