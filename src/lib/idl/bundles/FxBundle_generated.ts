import * as flatbuffers from 'flatbuffers';
import {Bundle as FxBundle, BundleCollection as FxBundleCollection, BundleCollectionT as FxBundleCollectionT, BundleContent as FxBundleContent, BundleMeta as FxBundleMeta, BundleMetaT as FxBundleMetaT, BundleSignature as FxBundleSignature, BundleSignatureT as FxBundleSignatureT, BundleT as FxBundleT, GLSLAttribute as FxGLSLAttribute, GLSLAttributeT as FxGLSLAttributeT, PartBundle as FxPartBundle, PartBundleT as FxPartBundleT, PartRenderPass as FxPartRenderPass, PartRenderPassT as FxPartRenderPassT, RoutineBundle as FxRoutineBundle, RoutineBytecodeBundle as FxRoutineBytecodeBundle, RoutineBytecodeBundleResources as FxRoutineBytecodeBundleResources, RoutineBytecodeBundleResourcesT as FxRoutineBytecodeBundleResourcesT, RoutineBytecodeBundleT as FxRoutineBytecodeBundleT, RoutineGLSLBundle as FxRoutineGLSLBundle, RoutineGLSLBundleT as FxRoutineGLSLBundleT, TypeField as FxTypeField, TypeFieldT as FxTypeFieldT, TypeLayout as FxTypeLayout, TypeLayoutT as FxTypeLayoutT, UAVBundle as FxUAVBundle, UAVBundleT as FxUAVBundleT} from  './FxBundle_generated';


export enum RoutineBundle{
  NONE = 0,
  RoutineBytecodeBundle = 1,
  RoutineGLSLBundle = 2
}

export function unionToRoutineBundle(
  type: RoutineBundle,
  accessor: (obj:FxRoutineBytecodeBundle|FxRoutineGLSLBundle) => FxRoutineBytecodeBundle|FxRoutineGLSLBundle|null
): FxRoutineBytecodeBundle|FxRoutineGLSLBundle|null {
  switch(FxRoutineBundle[type]) {
    case 'NONE': return null; 
    case 'RoutineBytecodeBundle': return accessor(new FxRoutineBytecodeBundle())! as FxRoutineBytecodeBundle;
    case 'RoutineGLSLBundle': return accessor(new FxRoutineGLSLBundle())! as FxRoutineGLSLBundle;
    default: return null;
  }
}

export function unionListToRoutineBundle(
  type: RoutineBundle, 
  accessor: (index: number, obj:FxRoutineBytecodeBundle|FxRoutineGLSLBundle) => FxRoutineBytecodeBundle|FxRoutineGLSLBundle|null, 
  index: number
): FxRoutineBytecodeBundle|FxRoutineGLSLBundle|null {
  switch(FxRoutineBundle[type]) {
    case 'NONE': return null; 
    case 'RoutineBytecodeBundle': return accessor(index, new FxRoutineBytecodeBundle())! as FxRoutineBytecodeBundle;
    case 'RoutineGLSLBundle': return accessor(index, new FxRoutineGLSLBundle())! as FxRoutineGLSLBundle;
    default: return null;
  }
}

export enum EPartSimRoutines{
  k_Reset = 0,
  k_Spawn = 1,
  k_Init = 2,
  k_Update = 3,
  k_Last = 4
}

export enum EPartRenderRoutines{
  k_Prerender = 0,
  k_Vertex = 1,
  k_Pixel = 2,
  k_Last = 3
}

export enum BundleContent{
  NONE = 0,
  PartBundle = 1
}

export function unionToBundleContent(
  type: BundleContent,
  accessor: (obj:FxPartBundle) => FxPartBundle|null
): FxPartBundle|null {
  switch(FxBundleContent[type]) {
    case 'NONE': return null; 
    case 'PartBundle': return accessor(new FxPartBundle())! as FxPartBundle;
    default: return null;
  }
}

export function unionListToBundleContent(
  type: BundleContent, 
  accessor: (index: number, obj:FxPartBundle) => FxPartBundle|null, 
  index: number
): FxPartBundle|null {
  switch(FxBundleContent[type]) {
    case 'NONE': return null; 
    case 'PartBundle': return accessor(index, new FxPartBundle())! as FxPartBundle;
    default: return null;
  }
}

export class BundleSignature {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):BundleSignature {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsBundleSignature(bb:flatbuffers.ByteBuffer, obj?:BundleSignature):BundleSignature {
  return (obj || new BundleSignature()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsBundleSignature(bb:flatbuffers.ByteBuffer, obj?:BundleSignature):BundleSignature {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new BundleSignature()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

mode():string|null
mode(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
mode(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

version():string|null
version(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
version(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

commithash():string|null
commithash(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
commithash(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

branch():string|null
branch(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
branch(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

timestamp():string|null
timestamp(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
timestamp(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startBundleSignature(builder:flatbuffers.Builder) {
  builder.startObject(5);
}

static addMode(builder:flatbuffers.Builder, modeOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, modeOffset, 0);
}

static addVersion(builder:flatbuffers.Builder, versionOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, versionOffset, 0);
}

static addCommithash(builder:flatbuffers.Builder, commithashOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, commithashOffset, 0);
}

static addBranch(builder:flatbuffers.Builder, branchOffset:flatbuffers.Offset) {
  builder.addFieldOffset(3, branchOffset, 0);
}

static addTimestamp(builder:flatbuffers.Builder, timestampOffset:flatbuffers.Offset) {
  builder.addFieldOffset(4, timestampOffset, 0);
}

static endBundleSignature(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createBundleSignature(builder:flatbuffers.Builder, modeOffset:flatbuffers.Offset, versionOffset:flatbuffers.Offset, commithashOffset:flatbuffers.Offset, branchOffset:flatbuffers.Offset, timestampOffset:flatbuffers.Offset):flatbuffers.Offset {
  BundleSignature.startBundleSignature(builder);
  BundleSignature.addMode(builder, modeOffset);
  BundleSignature.addVersion(builder, versionOffset);
  BundleSignature.addCommithash(builder, commithashOffset);
  BundleSignature.addBranch(builder, branchOffset);
  BundleSignature.addTimestamp(builder, timestampOffset);
  return BundleSignature.endBundleSignature(builder);
}

unpack(): BundleSignatureT {
  return new BundleSignatureT(
    this.mode(),
    this.version(),
    this.commithash(),
    this.branch(),
    this.timestamp()
  );
}


unpackTo(_o: BundleSignatureT): void {
  _o.mode = this.mode();
  _o.version = this.version();
  _o.commithash = this.commithash();
  _o.branch = this.branch();
  _o.timestamp = this.timestamp();
}
}

export class BundleSignatureT {
constructor(
  public mode: string|Uint8Array|null = null,
  public version: string|Uint8Array|null = null,
  public commithash: string|Uint8Array|null = null,
  public branch: string|Uint8Array|null = null,
  public timestamp: string|Uint8Array|null = null
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const mode = (this.mode !== null ? builder.createString(this.mode!) : 0);
  const version = (this.version !== null ? builder.createString(this.version!) : 0);
  const commithash = (this.commithash !== null ? builder.createString(this.commithash!) : 0);
  const branch = (this.branch !== null ? builder.createString(this.branch!) : 0);
  const timestamp = (this.timestamp !== null ? builder.createString(this.timestamp!) : 0);

  return FxBundleSignature.createBundleSignature(builder,
    mode,
    version,
    commithash,
    branch,
    timestamp
  );
}
}
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

  return FxBundleMeta.createBundleMeta(builder,
    author,
    source
  );
}
}
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

type(obj?:FxTypeLayout):FxTypeLayout|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? (obj || new FxTypeLayout()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

size():number {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

padding():number {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

static startTypeField(builder:flatbuffers.Builder) {
  builder.startObject(4);
}

static addType(builder:flatbuffers.Builder, typeOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, typeOffset, 0);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, nameOffset, 0);
}

static addSize(builder:flatbuffers.Builder, size:number) {
  builder.addFieldInt32(2, size, 0);
}

static addPadding(builder:flatbuffers.Builder, padding:number) {
  builder.addFieldInt32(3, padding, 0);
}

static endTypeField(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createTypeField(builder:flatbuffers.Builder, typeOffset:flatbuffers.Offset, nameOffset:flatbuffers.Offset, size:number, padding:number):flatbuffers.Offset {
  TypeField.startTypeField(builder);
  TypeField.addType(builder, typeOffset);
  TypeField.addName(builder, nameOffset);
  TypeField.addSize(builder, size);
  TypeField.addPadding(builder, padding);
  return TypeField.endTypeField(builder);
}

unpack(): TypeFieldT {
  return new TypeFieldT(
    (this.type() !== null ? this.type()!.unpack() : null),
    this.name(),
    this.size(),
    this.padding()
  );
}


unpackTo(_o: TypeFieldT): void {
  _o.type = (this.type() !== null ? this.type()!.unpack() : null);
  _o.name = this.name();
  _o.size = this.size();
  _o.padding = this.padding();
}
}

export class TypeFieldT {
constructor(
  public type: FxTypeLayoutT|null = null,
  public name: string|Uint8Array|null = null,
  public size: number = 0,
  public padding: number = 0
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const type = (this.type !== null ? this.type!.pack(builder) : 0);
  const name = (this.name !== null ? builder.createString(this.name!) : 0);

  return FxTypeField.createTypeField(builder,
    type,
    name,
    this.size,
    this.padding
  );
}
}
export class TypeLayout {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):TypeLayout {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsTypeLayout(bb:flatbuffers.ByteBuffer, obj?:TypeLayout):TypeLayout {
  return (obj || new TypeLayout()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsTypeLayout(bb:flatbuffers.ByteBuffer, obj?:TypeLayout):TypeLayout {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new TypeLayout()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

fields(index: number, obj?:FxTypeField):FxTypeField|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? (obj || new FxTypeField()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

fieldsLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

length():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readInt32(this.bb_pos + offset) : 0;
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

size():number {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

static startTypeLayout(builder:flatbuffers.Builder) {
  builder.startObject(4);
}

static addFields(builder:flatbuffers.Builder, fieldsOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, fieldsOffset, 0);
}

static createFieldsVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startFieldsVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static addLength(builder:flatbuffers.Builder, length:number) {
  builder.addFieldInt32(1, length, 0);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, nameOffset, 0);
}

static addSize(builder:flatbuffers.Builder, size:number) {
  builder.addFieldInt32(3, size, 0);
}

static endTypeLayout(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createTypeLayout(builder:flatbuffers.Builder, fieldsOffset:flatbuffers.Offset, length:number, nameOffset:flatbuffers.Offset, size:number):flatbuffers.Offset {
  TypeLayout.startTypeLayout(builder);
  TypeLayout.addFields(builder, fieldsOffset);
  TypeLayout.addLength(builder, length);
  TypeLayout.addName(builder, nameOffset);
  TypeLayout.addSize(builder, size);
  return TypeLayout.endTypeLayout(builder);
}

unpack(): TypeLayoutT {
  return new TypeLayoutT(
    this.bb!.createObjList(this.fields.bind(this), this.fieldsLength()),
    this.length(),
    this.name(),
    this.size()
  );
}


unpackTo(_o: TypeLayoutT): void {
  _o.fields = this.bb!.createObjList(this.fields.bind(this), this.fieldsLength());
  _o.length = this.length();
  _o.name = this.name();
  _o.size = this.size();
}
}

export class TypeLayoutT {
constructor(
  public fields: (TypeFieldT)[] = [],
  public length: number = 0,
  public name: string|Uint8Array|null = null,
  public size: number = 0
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const fields = FxTypeLayout.createFieldsVector(builder, builder.createObjectOffsetList(this.fields));
  const name = (this.name !== null ? builder.createString(this.name!) : 0);

  return FxTypeLayout.createTypeLayout(builder,
    fields,
    this.length,
    name,
    this.size
  );
}
}
export class UAVBundle {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):UAVBundle {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsUAVBundle(bb:flatbuffers.ByteBuffer, obj?:UAVBundle):UAVBundle {
  return (obj || new UAVBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsUAVBundle(bb:flatbuffers.ByteBuffer, obj?:UAVBundle):UAVBundle {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new UAVBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

slot():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

stride():number {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

type(obj?:FxTypeLayout):FxTypeLayout|null {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? (obj || new FxTypeLayout()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

static startUAVBundle(builder:flatbuffers.Builder) {
  builder.startObject(4);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static addSlot(builder:flatbuffers.Builder, slot:number) {
  builder.addFieldInt32(1, slot, 0);
}

static addStride(builder:flatbuffers.Builder, stride:number) {
  builder.addFieldInt32(2, stride, 0);
}

static addType(builder:flatbuffers.Builder, typeOffset:flatbuffers.Offset) {
  builder.addFieldOffset(3, typeOffset, 0);
}

static endUAVBundle(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}


unpack(): UAVBundleT {
  return new UAVBundleT(
    this.name(),
    this.slot(),
    this.stride(),
    (this.type() !== null ? this.type()!.unpack() : null)
  );
}


unpackTo(_o: UAVBundleT): void {
  _o.name = this.name();
  _o.slot = this.slot();
  _o.stride = this.stride();
  _o.type = (this.type() !== null ? this.type()!.unpack() : null);
}
}

export class UAVBundleT {
constructor(
  public name: string|Uint8Array|null = null,
  public slot: number = 0,
  public stride: number = 0,
  public type: FxTypeLayoutT|null = null
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const type = (this.type !== null ? this.type!.pack(builder) : 0);

  FxUAVBundle.startUAVBundle(builder);
  FxUAVBundle.addName(builder, name);
  FxUAVBundle.addSlot(builder, this.slot);
  FxUAVBundle.addStride(builder, this.stride);
  FxUAVBundle.addType(builder, type);

  return FxUAVBundle.endUAVBundle(builder);
}
}
export class GLSLAttribute {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):GLSLAttribute {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsGLSLAttribute(bb:flatbuffers.ByteBuffer, obj?:GLSLAttribute):GLSLAttribute {
  return (obj || new GLSLAttribute()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsGLSLAttribute(bb:flatbuffers.ByteBuffer, obj?:GLSLAttribute):GLSLAttribute {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new GLSLAttribute()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

size():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

offset():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startGLSLAttribute(builder:flatbuffers.Builder) {
  builder.startObject(3);
}

static addSize(builder:flatbuffers.Builder, size:number) {
  builder.addFieldInt32(0, size, 0);
}

static addOffset(builder:flatbuffers.Builder, offset:number) {
  builder.addFieldInt32(1, offset, 0);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, nameOffset, 0);
}

static endGLSLAttribute(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createGLSLAttribute(builder:flatbuffers.Builder, size:number, offset:number, nameOffset:flatbuffers.Offset):flatbuffers.Offset {
  GLSLAttribute.startGLSLAttribute(builder);
  GLSLAttribute.addSize(builder, size);
  GLSLAttribute.addOffset(builder, offset);
  GLSLAttribute.addName(builder, nameOffset);
  return GLSLAttribute.endGLSLAttribute(builder);
}

unpack(): GLSLAttributeT {
  return new GLSLAttributeT(
    this.size(),
    this.offset(),
    this.name()
  );
}


unpackTo(_o: GLSLAttributeT): void {
  _o.size = this.size();
  _o.offset = this.offset();
  _o.name = this.name();
}
}

export class GLSLAttributeT {
constructor(
  public size: number = 0,
  public offset: number = 0,
  public name: string|Uint8Array|null = null
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);

  return FxGLSLAttribute.createGLSLAttribute(builder,
    this.size,
    this.offset,
    name
  );
}
}
export class RoutineBytecodeBundleResources {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):RoutineBytecodeBundleResources {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsRoutineBytecodeBundleResources(bb:flatbuffers.ByteBuffer, obj?:RoutineBytecodeBundleResources):RoutineBytecodeBundleResources {
  return (obj || new RoutineBytecodeBundleResources()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsRoutineBytecodeBundleResources(bb:flatbuffers.ByteBuffer, obj?:RoutineBytecodeBundleResources):RoutineBytecodeBundleResources {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new RoutineBytecodeBundleResources()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

uavs(index: number, obj?:FxUAVBundle):FxUAVBundle|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? (obj || new FxUAVBundle()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

uavsLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startRoutineBytecodeBundleResources(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addUavs(builder:flatbuffers.Builder, uavsOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, uavsOffset, 0);
}

static createUavsVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startUavsVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endRoutineBytecodeBundleResources(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createRoutineBytecodeBundleResources(builder:flatbuffers.Builder, uavsOffset:flatbuffers.Offset):flatbuffers.Offset {
  RoutineBytecodeBundleResources.startRoutineBytecodeBundleResources(builder);
  RoutineBytecodeBundleResources.addUavs(builder, uavsOffset);
  return RoutineBytecodeBundleResources.endRoutineBytecodeBundleResources(builder);
}

unpack(): RoutineBytecodeBundleResourcesT {
  return new RoutineBytecodeBundleResourcesT(
    this.bb!.createObjList(this.uavs.bind(this), this.uavsLength())
  );
}


unpackTo(_o: RoutineBytecodeBundleResourcesT): void {
  _o.uavs = this.bb!.createObjList(this.uavs.bind(this), this.uavsLength());
}
}

export class RoutineBytecodeBundleResourcesT {
constructor(
  public uavs: (UAVBundleT)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const uavs = FxRoutineBytecodeBundleResources.createUavsVector(builder, builder.createObjectOffsetList(this.uavs));

  return FxRoutineBytecodeBundleResources.createRoutineBytecodeBundleResources(builder,
    uavs
  );
}
}
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

code(index: number):number|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint8(this.bb!.__vector(this.bb_pos + offset) + index) : 0;
}

codeLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

codeArray():Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? new Uint8Array(this.bb!.bytes().buffer, this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset), this.bb!.__vector_len(this.bb_pos + offset)) : null;
}

resources(obj?:FxRoutineBytecodeBundleResources):FxRoutineBytecodeBundleResources|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? (obj || new FxRoutineBytecodeBundleResources()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
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

static createCodeVector(builder:flatbuffers.Builder, data:number[]|Uint8Array):flatbuffers.Offset {
  builder.startVector(1, data.length, 1);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addInt8(data[i]!);
  }
  return builder.endVector();
}

static startCodeVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(1, numElems, 1);
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
    this.bb!.createScalarList(this.code.bind(this), this.codeLength()),
    (this.resources() !== null ? this.resources()!.unpack() : null),
    this.bb!.createScalarList(this.numthreads.bind(this), this.numthreadsLength())
  );
}


unpackTo(_o: RoutineBytecodeBundleT): void {
  _o.code = this.bb!.createScalarList(this.code.bind(this), this.codeLength());
  _o.resources = (this.resources() !== null ? this.resources()!.unpack() : null);
  _o.numthreads = this.bb!.createScalarList(this.numthreads.bind(this), this.numthreadsLength());
}
}

export class RoutineBytecodeBundleT {
constructor(
  public code: (number)[] = [],
  public resources: FxRoutineBytecodeBundleResourcesT|null = null,
  public numthreads: (number)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const code = FxRoutineBytecodeBundle.createCodeVector(builder, this.code);
  const resources = (this.resources !== null ? this.resources!.pack(builder) : 0);
  const numthreads = FxRoutineBytecodeBundle.createNumthreadsVector(builder, this.numthreads);

  FxRoutineBytecodeBundle.startRoutineBytecodeBundle(builder);
  FxRoutineBytecodeBundle.addCode(builder, code);
  FxRoutineBytecodeBundle.addResources(builder, resources);
  FxRoutineBytecodeBundle.addNumthreads(builder, numthreads);

  return FxRoutineBytecodeBundle.endRoutineBytecodeBundle(builder);
}
}
export class RoutineGLSLBundle {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):RoutineGLSLBundle {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsRoutineGLSLBundle(bb:flatbuffers.ByteBuffer, obj?:RoutineGLSLBundle):RoutineGLSLBundle {
  return (obj || new RoutineGLSLBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsRoutineGLSLBundle(bb:flatbuffers.ByteBuffer, obj?:RoutineGLSLBundle):RoutineGLSLBundle {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new RoutineGLSLBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

code():string|null
code(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
code(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

attributes(index: number, obj?:FxGLSLAttribute):FxGLSLAttribute|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? (obj || new FxGLSLAttribute()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

attributesLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startRoutineGLSLBundle(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addCode(builder:flatbuffers.Builder, codeOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, codeOffset, 0);
}

static addAttributes(builder:flatbuffers.Builder, attributesOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, attributesOffset, 0);
}

static createAttributesVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startAttributesVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endRoutineGLSLBundle(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createRoutineGLSLBundle(builder:flatbuffers.Builder, codeOffset:flatbuffers.Offset, attributesOffset:flatbuffers.Offset):flatbuffers.Offset {
  RoutineGLSLBundle.startRoutineGLSLBundle(builder);
  RoutineGLSLBundle.addCode(builder, codeOffset);
  RoutineGLSLBundle.addAttributes(builder, attributesOffset);
  return RoutineGLSLBundle.endRoutineGLSLBundle(builder);
}

unpack(): RoutineGLSLBundleT {
  return new RoutineGLSLBundleT(
    this.code(),
    this.bb!.createObjList(this.attributes.bind(this), this.attributesLength())
  );
}


unpackTo(_o: RoutineGLSLBundleT): void {
  _o.code = this.code();
  _o.attributes = this.bb!.createObjList(this.attributes.bind(this), this.attributesLength());
}
}

export class RoutineGLSLBundleT {
constructor(
  public code: string|Uint8Array|null = null,
  public attributes: (GLSLAttributeT)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const code = (this.code !== null ? builder.createString(this.code!) : 0);
  const attributes = FxRoutineGLSLBundle.createAttributesVector(builder, builder.createObjectOffsetList(this.attributes));

  return FxRoutineGLSLBundle.createRoutineGLSLBundle(builder,
    code,
    attributes
  );
}
}
export class PartRenderPass {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):PartRenderPass {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsPartRenderPass(bb:flatbuffers.ByteBuffer, obj?:PartRenderPass):PartRenderPass {
  return (obj || new PartRenderPass()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsPartRenderPass(bb:flatbuffers.ByteBuffer, obj?:PartRenderPass):PartRenderPass {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new PartRenderPass()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

routinesType(index: number):FxRoutineBundle|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint8(this.bb!.__vector(this.bb_pos + offset) + index) : 0;
}

routinesTypeLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

routinesTypeArray():Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? new Uint8Array(this.bb!.bytes().buffer, this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset), this.bb!.__vector_len(this.bb_pos + offset)) : null;
}

routines(index: number, obj:any):any|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__union(obj, this.bb!.__vector(this.bb_pos + offset) + index * 4) : null;
}

routinesLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

geometry():string|null
geometry(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
geometry(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

sorting():boolean {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? !!this.bb!.readInt8(this.bb_pos + offset) : false;
}

instanceCount():number {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

stride():number {
  const offset = this.bb!.__offset(this.bb_pos, 14);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

instance(obj?:FxTypeLayout):FxTypeLayout|null {
  const offset = this.bb!.__offset(this.bb_pos, 16);
  return offset ? (obj || new FxTypeLayout()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

static startPartRenderPass(builder:flatbuffers.Builder) {
  builder.startObject(7);
}

static addRoutinesType(builder:flatbuffers.Builder, routinesTypeOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, routinesTypeOffset, 0);
}

static createRoutinesTypeVector(builder:flatbuffers.Builder, data:FxRoutineBundle[]):flatbuffers.Offset {
  builder.startVector(1, data.length, 1);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addInt8(data[i]!);
  }
  return builder.endVector();
}

static startRoutinesTypeVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(1, numElems, 1);
}

static addRoutines(builder:flatbuffers.Builder, routinesOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, routinesOffset, 0);
}

static createRoutinesVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startRoutinesVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static addGeometry(builder:flatbuffers.Builder, geometryOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, geometryOffset, 0);
}

static addSorting(builder:flatbuffers.Builder, sorting:boolean) {
  builder.addFieldInt8(3, +sorting, +false);
}

static addInstanceCount(builder:flatbuffers.Builder, instanceCount:number) {
  builder.addFieldInt32(4, instanceCount, 0);
}

static addStride(builder:flatbuffers.Builder, stride:number) {
  builder.addFieldInt32(5, stride, 0);
}

static addInstance(builder:flatbuffers.Builder, instanceOffset:flatbuffers.Offset) {
  builder.addFieldOffset(6, instanceOffset, 0);
}

static endPartRenderPass(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}


unpack(): PartRenderPassT {
  return new PartRenderPassT(
    this.bb!.createScalarList(this.routinesType.bind(this), this.routinesTypeLength()),
    (() => {
    let ret = [];
    for(let targetEnumIndex = 0; targetEnumIndex < this.routinesTypeLength(); ++targetEnumIndex) {
      let targetEnum = this.routinesType(targetEnumIndex);
      if(targetEnum === null || FxRoutineBundle[targetEnum!] === 'NONE') { continue; }

      let temp = unionListToRoutineBundle(targetEnum, this.routines.bind(this), targetEnumIndex);
      if(temp === null) { continue; }
      ret.push(temp.unpack());
    }
    return ret;
  })(),
    this.geometry(),
    this.sorting(),
    this.instanceCount(),
    this.stride(),
    (this.instance() !== null ? this.instance()!.unpack() : null)
  );
}


unpackTo(_o: PartRenderPassT): void {
  _o.routinesType = this.bb!.createScalarList(this.routinesType.bind(this), this.routinesTypeLength());
  _o.routines = (() => {
    let ret = [];
    for(let targetEnumIndex = 0; targetEnumIndex < this.routinesTypeLength(); ++targetEnumIndex) {
      let targetEnum = this.routinesType(targetEnumIndex);
      if(targetEnum === null || FxRoutineBundle[targetEnum!] === 'NONE') { continue; }

      let temp = unionListToRoutineBundle(targetEnum, this.routines.bind(this), targetEnumIndex);
      if(temp === null) { continue; }
      ret.push(temp.unpack());
    }
    return ret;
  })();
  _o.geometry = this.geometry();
  _o.sorting = this.sorting();
  _o.instanceCount = this.instanceCount();
  _o.stride = this.stride();
  _o.instance = (this.instance() !== null ? this.instance()!.unpack() : null);
}
}

export class PartRenderPassT {
constructor(
  public routinesType: (FxRoutineBundle)[] = [],
  public routines: (FxRoutineBytecodeBundleT|FxRoutineGLSLBundleT)[] = [],
  public geometry: string|Uint8Array|null = null,
  public sorting: boolean = false,
  public instanceCount: number = 0,
  public stride: number = 0,
  public instance: FxTypeLayoutT|null = null
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const routinesType = FxPartRenderPass.createRoutinesTypeVector(builder, this.routinesType);
  const routines = FxPartRenderPass.createRoutinesVector(builder, builder.createObjectOffsetList(this.routines));
  const geometry = (this.geometry !== null ? builder.createString(this.geometry!) : 0);
  const instance = (this.instance !== null ? this.instance!.pack(builder) : 0);

  FxPartRenderPass.startPartRenderPass(builder);
  FxPartRenderPass.addRoutinesType(builder, routinesType);
  FxPartRenderPass.addRoutines(builder, routines);
  FxPartRenderPass.addGeometry(builder, geometry);
  FxPartRenderPass.addSorting(builder, this.sorting);
  FxPartRenderPass.addInstanceCount(builder, this.instanceCount);
  FxPartRenderPass.addStride(builder, this.stride);
  FxPartRenderPass.addInstance(builder, instance);

  return FxPartRenderPass.endPartRenderPass(builder);
}
}
export class PartBundle {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):PartBundle {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsPartBundle(bb:flatbuffers.ByteBuffer, obj?:PartBundle):PartBundle {
  return (obj || new PartBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsPartBundle(bb:flatbuffers.ByteBuffer, obj?:PartBundle):PartBundle {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new PartBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

capacity():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

simulationRoutinesType(index: number):FxRoutineBundle|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint8(this.bb!.__vector(this.bb_pos + offset) + index) : 0;
}

simulationRoutinesTypeLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

simulationRoutinesTypeArray():Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? new Uint8Array(this.bb!.bytes().buffer, this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset), this.bb!.__vector_len(this.bb_pos + offset)) : null;
}

simulationRoutines(index: number, obj:any):any|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__union(obj, this.bb!.__vector(this.bb_pos + offset) + index * 4) : null;
}

simulationRoutinesLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

renderPasses(index: number, obj?:FxPartRenderPass):FxPartRenderPass|null {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? (obj || new FxPartRenderPass()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

renderPassesLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

particle(obj?:FxTypeLayout):FxTypeLayout|null {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? (obj || new FxTypeLayout()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

static startPartBundle(builder:flatbuffers.Builder) {
  builder.startObject(5);
}

static addCapacity(builder:flatbuffers.Builder, capacity:number) {
  builder.addFieldInt32(0, capacity, 0);
}

static addSimulationRoutinesType(builder:flatbuffers.Builder, simulationRoutinesTypeOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, simulationRoutinesTypeOffset, 0);
}

static createSimulationRoutinesTypeVector(builder:flatbuffers.Builder, data:FxRoutineBundle[]):flatbuffers.Offset {
  builder.startVector(1, data.length, 1);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addInt8(data[i]!);
  }
  return builder.endVector();
}

static startSimulationRoutinesTypeVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(1, numElems, 1);
}

static addSimulationRoutines(builder:flatbuffers.Builder, simulationRoutinesOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, simulationRoutinesOffset, 0);
}

static createSimulationRoutinesVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startSimulationRoutinesVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static addRenderPasses(builder:flatbuffers.Builder, renderPassesOffset:flatbuffers.Offset) {
  builder.addFieldOffset(3, renderPassesOffset, 0);
}

static createRenderPassesVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startRenderPassesVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static addParticle(builder:flatbuffers.Builder, particleOffset:flatbuffers.Offset) {
  builder.addFieldOffset(4, particleOffset, 0);
}

static endPartBundle(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}


unpack(): PartBundleT {
  return new PartBundleT(
    this.capacity(),
    this.bb!.createScalarList(this.simulationRoutinesType.bind(this), this.simulationRoutinesTypeLength()),
    (() => {
    let ret = [];
    for(let targetEnumIndex = 0; targetEnumIndex < this.simulationRoutinesTypeLength(); ++targetEnumIndex) {
      let targetEnum = this.simulationRoutinesType(targetEnumIndex);
      if(targetEnum === null || FxRoutineBundle[targetEnum!] === 'NONE') { continue; }

      let temp = unionListToRoutineBundle(targetEnum, this.simulationRoutines.bind(this), targetEnumIndex);
      if(temp === null) { continue; }
      ret.push(temp.unpack());
    }
    return ret;
  })(),
    this.bb!.createObjList(this.renderPasses.bind(this), this.renderPassesLength()),
    (this.particle() !== null ? this.particle()!.unpack() : null)
  );
}


unpackTo(_o: PartBundleT): void {
  _o.capacity = this.capacity();
  _o.simulationRoutinesType = this.bb!.createScalarList(this.simulationRoutinesType.bind(this), this.simulationRoutinesTypeLength());
  _o.simulationRoutines = (() => {
    let ret = [];
    for(let targetEnumIndex = 0; targetEnumIndex < this.simulationRoutinesTypeLength(); ++targetEnumIndex) {
      let targetEnum = this.simulationRoutinesType(targetEnumIndex);
      if(targetEnum === null || FxRoutineBundle[targetEnum!] === 'NONE') { continue; }

      let temp = unionListToRoutineBundle(targetEnum, this.simulationRoutines.bind(this), targetEnumIndex);
      if(temp === null) { continue; }
      ret.push(temp.unpack());
    }
    return ret;
  })();
  _o.renderPasses = this.bb!.createObjList(this.renderPasses.bind(this), this.renderPassesLength());
  _o.particle = (this.particle() !== null ? this.particle()!.unpack() : null);
}
}

export class PartBundleT {
constructor(
  public capacity: number = 0,
  public simulationRoutinesType: (FxRoutineBundle)[] = [],
  public simulationRoutines: (FxRoutineBytecodeBundleT|FxRoutineGLSLBundleT)[] = [],
  public renderPasses: (PartRenderPassT)[] = [],
  public particle: FxTypeLayoutT|null = null
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const simulationRoutinesType = FxPartBundle.createSimulationRoutinesTypeVector(builder, this.simulationRoutinesType);
  const simulationRoutines = FxPartBundle.createSimulationRoutinesVector(builder, builder.createObjectOffsetList(this.simulationRoutines));
  const renderPasses = FxPartBundle.createRenderPassesVector(builder, builder.createObjectOffsetList(this.renderPasses));
  const particle = (this.particle !== null ? this.particle!.pack(builder) : 0);

  FxPartBundle.startPartBundle(builder);
  FxPartBundle.addCapacity(builder, this.capacity);
  FxPartBundle.addSimulationRoutinesType(builder, simulationRoutinesType);
  FxPartBundle.addSimulationRoutines(builder, simulationRoutines);
  FxPartBundle.addRenderPasses(builder, renderPasses);
  FxPartBundle.addParticle(builder, particle);

  return FxPartBundle.endPartBundle(builder);
}
}
export class Bundle {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):Bundle {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsBundle(bb:flatbuffers.ByteBuffer, obj?:Bundle):Bundle {
  return (obj || new Bundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsBundle(bb:flatbuffers.ByteBuffer, obj?:Bundle):Bundle {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new Bundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

signature(obj?:FxBundleSignature):FxBundleSignature|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? (obj || new FxBundleSignature()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

meta(obj?:FxBundleMeta):FxBundleMeta|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? (obj || new FxBundleMeta()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

contentType():FxBundleContent {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.readUint8(this.bb_pos + offset) : FxBundleContent.NONE;
}

content<T extends flatbuffers.Table>(obj:any):any|null {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? this.bb!.__union(obj, this.bb_pos + offset) : null;
}

static startBundle(builder:flatbuffers.Builder) {
  builder.startObject(5);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static addSignature(builder:flatbuffers.Builder, signatureOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, signatureOffset, 0);
}

static addMeta(builder:flatbuffers.Builder, metaOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, metaOffset, 0);
}

static addContentType(builder:flatbuffers.Builder, contentType:FxBundleContent) {
  builder.addFieldInt8(3, contentType, FxBundleContent.NONE);
}

static addContent(builder:flatbuffers.Builder, contentOffset:flatbuffers.Offset) {
  builder.addFieldOffset(4, contentOffset, 0);
}

static endBundle(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static finishBundleBuffer(builder:flatbuffers.Builder, offset:flatbuffers.Offset) {
  builder.finish(offset);
}

static finishSizePrefixedBundleBuffer(builder:flatbuffers.Builder, offset:flatbuffers.Offset) {
  builder.finish(offset, undefined, true);
}


unpack(): BundleT {
  return new BundleT(
    this.name(),
    (this.signature() !== null ? this.signature()!.unpack() : null),
    (this.meta() !== null ? this.meta()!.unpack() : null),
    this.contentType(),
    (() => {
      let temp = unionToBundleContent(this.contentType(), this.content.bind(this));
      if(temp === null) { return null; }
      return temp.unpack()
  })()
  );
}


unpackTo(_o: BundleT): void {
  _o.name = this.name();
  _o.signature = (this.signature() !== null ? this.signature()!.unpack() : null);
  _o.meta = (this.meta() !== null ? this.meta()!.unpack() : null);
  _o.contentType = this.contentType();
  _o.content = (() => {
      let temp = unionToBundleContent(this.contentType(), this.content.bind(this));
      if(temp === null) { return null; }
      return temp.unpack()
  })();
}
}

export class BundleT {
constructor(
  public name: string|Uint8Array|null = null,
  public signature: FxBundleSignatureT|null = null,
  public meta: FxBundleMetaT|null = null,
  public contentType: FxBundleContent = FxBundleContent.NONE,
  public content: FxPartBundleT|null = null
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const signature = (this.signature !== null ? this.signature!.pack(builder) : 0);
  const meta = (this.meta !== null ? this.meta!.pack(builder) : 0);
  const content = builder.createObjectOffset(this.content);

  FxBundle.startBundle(builder);
  FxBundle.addName(builder, name);
  FxBundle.addSignature(builder, signature);
  FxBundle.addMeta(builder, meta);
  FxBundle.addContentType(builder, this.contentType);
  FxBundle.addContent(builder, content);

  return FxBundle.endBundle(builder);
}
}
export class BundleCollection {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):BundleCollection {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsBundleCollection(bb:flatbuffers.ByteBuffer, obj?:BundleCollection):BundleCollection {
  return (obj || new BundleCollection()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsBundleCollection(bb:flatbuffers.ByteBuffer, obj?:BundleCollection):BundleCollection {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new BundleCollection()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

content(index: number, obj?:FxBundle):FxBundle|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? (obj || new FxBundle()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

contentLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startBundleCollection(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addContent(builder:flatbuffers.Builder, contentOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, contentOffset, 0);
}

static createContentVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startContentVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endBundleCollection(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createBundleCollection(builder:flatbuffers.Builder, contentOffset:flatbuffers.Offset):flatbuffers.Offset {
  BundleCollection.startBundleCollection(builder);
  BundleCollection.addContent(builder, contentOffset);
  return BundleCollection.endBundleCollection(builder);
}

unpack(): BundleCollectionT {
  return new BundleCollectionT(
    this.bb!.createObjList(this.content.bind(this), this.contentLength())
  );
}


unpackTo(_o: BundleCollectionT): void {
  _o.content = this.bb!.createObjList(this.content.bind(this), this.contentLength());
}
}

export class BundleCollectionT {
constructor(
  public content: (BundleT)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const content = FxBundleCollection.createContentVector(builder, builder.createObjectOffsetList(this.content));

  return FxBundleCollection.createBundleCollection(builder,
    content
  );
}
}
