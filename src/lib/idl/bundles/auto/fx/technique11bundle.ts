// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

import { Technique11RenderPass, Technique11RenderPassT } from '../fx/technique11render-pass';


export class Technique11Bundle {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):Technique11Bundle {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsTechnique11Bundle(bb:flatbuffers.ByteBuffer, obj?:Technique11Bundle):Technique11Bundle {
  return (obj || new Technique11Bundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsTechnique11Bundle(bb:flatbuffers.ByteBuffer, obj?:Technique11Bundle):Technique11Bundle {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new Technique11Bundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

passes(index: number, obj?:Technique11RenderPass):Technique11RenderPass|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? (obj || new Technique11RenderPass()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

passesLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startTechnique11Bundle(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addPasses(builder:flatbuffers.Builder, passesOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, passesOffset, 0);
}

static createPassesVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startPassesVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endTechnique11Bundle(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createTechnique11Bundle(builder:flatbuffers.Builder, passesOffset:flatbuffers.Offset):flatbuffers.Offset {
  Technique11Bundle.startTechnique11Bundle(builder);
  Technique11Bundle.addPasses(builder, passesOffset);
  return Technique11Bundle.endTechnique11Bundle(builder);
}

unpack(): Technique11BundleT {
  return new Technique11BundleT(
    this.bb!.createObjList(this.passes.bind(this), this.passesLength())
  );
}


unpackTo(_o: Technique11BundleT): void {
  _o.passes = this.bb!.createObjList(this.passes.bind(this), this.passesLength());
}
}

export class Technique11BundleT {
constructor(
  public passes: (Technique11RenderPassT)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const passes = Technique11Bundle.createPassesVector(builder, builder.createObjectOffsetList(this.passes));

  return Technique11Bundle.createTechnique11Bundle(builder,
    passes
  );
}
}