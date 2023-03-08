// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';



export class BundleMeta {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):BundleMeta {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsBundleMeta(bb:flatbuffers.ByteBuffer, obj?:BundleMeta):BundleMeta {
  return (obj || new BundleMeta()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsBundleMeta(bb:flatbuffers.ByteBuffer, obj?:BundleMeta):BundleMeta {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new BundleMeta()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

author():string|null
author(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
author(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

source():string|null
source(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
source(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startBundleMeta(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addAuthor(builder:flatbuffers.Builder, authorOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, authorOffset, 0);
}

static addSource(builder:flatbuffers.Builder, sourceOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, sourceOffset, 0);
}

static endBundleMeta(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createBundleMeta(builder:flatbuffers.Builder, authorOffset:flatbuffers.Offset, sourceOffset:flatbuffers.Offset):flatbuffers.Offset {
  BundleMeta.startBundleMeta(builder);
  BundleMeta.addAuthor(builder, authorOffset);
  BundleMeta.addSource(builder, sourceOffset);
  return BundleMeta.endBundleMeta(builder);
}

unpack(): BundleMetaT {
  return new BundleMetaT(
    this.author(),
    this.source()
  );
}


unpackTo(_o: BundleMetaT): void {
  _o.author = this.author();
  _o.source = this.source();
}
}

export class BundleMetaT {
constructor(
  public author: string|Uint8Array|null = null,
  public source: string|Uint8Array|null = null
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const author = (this.author !== null ? builder.createString(this.author!) : 0);
  const source = (this.source !== null ? builder.createString(this.source!) : 0);

  return BundleMeta.createBundleMeta(builder,
    author,
    source
  );
}
}