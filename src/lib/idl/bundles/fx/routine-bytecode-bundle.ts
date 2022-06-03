// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

import { RoutineBytecodeBundleResources, RoutineBytecodeBundleResourcesT } from '../fx/routine-bytecode-bundle-resources';


export class RoutineBytecodeBundle {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):RoutineBytecodeBundle {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsRoutineBytecodeBundle(bb:flatbuffers.ByteBuffer, obj?:RoutineBytecodeBundle):RoutineBytecodeBundle {
  return (obj || new RoutineBytecodeBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsRoutineBytecodeBundle(bb:flatbuffers.ByteBuffer, obj?:RoutineBytecodeBundle):RoutineBytecodeBundle {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new RoutineBytecodeBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

code():string|null
code(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
code(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

resources(obj?:RoutineBytecodeBundleResources):RoutineBytecodeBundleResources|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? (obj || new RoutineBytecodeBundleResources()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

numthreads(index: number):number|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.readUint32(this.bb!.__vector(this.bb_pos + offset) + index * 4) : 0;
}

numthreadsLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

numthreadsArray():Uint32Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? new Uint32Array(this.bb!.bytes().buffer, this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset), this.bb!.__vector_len(this.bb_pos + offset)) : null;
}

static startRoutineBytecodeBundle(builder:flatbuffers.Builder) {
  builder.startObject(3);
}

static addCode(builder:flatbuffers.Builder, codeOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, codeOffset, 0);
}

static addResources(builder:flatbuffers.Builder, resourcesOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, resourcesOffset, 0);
}

static addNumthreads(builder:flatbuffers.Builder, numthreadsOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, numthreadsOffset, 0);
}

static createNumthreadsVector(builder:flatbuffers.Builder, data:number[]|Uint32Array):flatbuffers.Offset;
/**
 * @deprecated This Uint8Array overload will be removed in the future.
 */
static createNumthreadsVector(builder:flatbuffers.Builder, data:number[]|Uint8Array):flatbuffers.Offset;
static createNumthreadsVector(builder:flatbuffers.Builder, data:number[]|Uint32Array|Uint8Array):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addInt32(data[i]!);
  }
  return builder.endVector();
}

static startNumthreadsVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endRoutineBytecodeBundle(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}


unpack(): RoutineBytecodeBundleT {
  return new RoutineBytecodeBundleT(
    this.code(),
    (this.resources() !== null ? this.resources()!.unpack() : null),
    this.bb!.createScalarList(this.numthreads.bind(this), this.numthreadsLength())
  );
}


unpackTo(_o: RoutineBytecodeBundleT): void {
  _o.code = this.code();
  _o.resources = (this.resources() !== null ? this.resources()!.unpack() : null);
  _o.numthreads = this.bb!.createScalarList(this.numthreads.bind(this), this.numthreadsLength());
}
}

export class RoutineBytecodeBundleT {
constructor(
  public code: string|Uint8Array|null = null,
  public resources: RoutineBytecodeBundleResourcesT|null = null,
  public numthreads: (number)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const code = (this.code !== null ? builder.createString(this.code!) : 0);
  const resources = (this.resources !== null ? this.resources!.pack(builder) : 0);
  const numthreads = RoutineBytecodeBundle.createNumthreadsVector(builder, this.numthreads);

  RoutineBytecodeBundle.startRoutineBytecodeBundle(builder);
  RoutineBytecodeBundle.addCode(builder, code);
  RoutineBytecodeBundle.addResources(builder, resources);
  RoutineBytecodeBundle.addNumthreads(builder, numthreads);

  return RoutineBytecodeBundle.endRoutineBytecodeBundle(builder);
}
}
