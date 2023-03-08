// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';



export class FloatValue {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):FloatValue {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

value():number {
  return this.bb!.readFloat32(this.bb_pos);
}

static sizeOf():number {
  return 4;
}

static createFloatValue(builder:flatbuffers.Builder, value: number):flatbuffers.Offset {
  builder.prep(4, 4);
  builder.writeFloat32(value);
  return builder.offset();
}


unpack(): FloatValueT {
  return new FloatValueT(
    this.value()
  );
}


unpackTo(_o: FloatValueT): void {
  _o.value = this.value();
}
}

export class FloatValueT {
constructor(
  public value: number = 0.0
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  return FloatValue.createFloatValue(builder,
    this.value
  );
}
}