import * as flatbuffers from 'flatbuffers';
import {BufferBundle as FxBufferBundle, BufferBundleT as FxBufferBundleT, Bundle as FxBundle, BundleCollection as FxBundleCollection, BundleCollectionT as FxBundleCollectionT, BundleContent as FxBundleContent, BundleMeta as FxBundleMeta, BundleMetaT as FxBundleMetaT, BundleSignature as FxBundleSignature, BundleSignatureT as FxBundleSignatureT, BundleT as FxBundleT, CBBundle as FxCBBundle, CBBundleT as FxCBBundleT, ColorValue as FxColorValue, ColorValueT as FxColorValueT, ControlValue as FxControlValue, Float2Value as FxFloat2Value, Float2ValueT as FxFloat2ValueT, Float3Value as FxFloat3Value, Float3ValueT as FxFloat3ValueT, Float4Value as FxFloat4Value, Float4ValueT as FxFloat4ValueT, FloatValue as FxFloatValue, FloatValueT as FxFloatValueT, GLSLAttribute as FxGLSLAttribute, GLSLAttributeT as FxGLSLAttributeT, IntValue as FxIntValue, IntValueT as FxIntValueT, MatBundle as FxMatBundle, MatBundleT as FxMatBundleT, MatRenderPass as FxMatRenderPass, MatRenderPassT as FxMatRenderPassT, MeshValue as FxMeshValue, MeshValueT as FxMeshValueT, PartBundle as FxPartBundle, PartBundleT as FxPartBundleT, PartRenderPass as FxPartRenderPass, PartRenderPassT as FxPartRenderPassT, Pass11BytecodeBundle as FxPass11BytecodeBundle, Pass11BytecodeBundleT as FxPass11BytecodeBundleT, Preset as FxPreset, PresetEntry as FxPresetEntry, PresetEntryT as FxPresetEntryT, PresetT as FxPresetT, PropertyValue as FxPropertyValue, RenderState as FxRenderState, RenderStateT as FxRenderStateT, RoutineBundle as FxRoutineBundle, RoutineBytecodeBundle as FxRoutineBytecodeBundle, RoutineBytecodeBundleResources as FxRoutineBytecodeBundleResources, RoutineBytecodeBundleResourcesT as FxRoutineBytecodeBundleResourcesT, RoutineBytecodeBundleT as FxRoutineBytecodeBundleT, RoutineGLSLSourceBundle as FxRoutineGLSLSourceBundle, RoutineGLSLSourceBundleT as FxRoutineGLSLSourceBundleT, RoutineHLSLSourceBundle as FxRoutineHLSLSourceBundle, RoutineHLSLSourceBundleT as FxRoutineHLSLSourceBundleT, RoutineShaderBundle as FxRoutineShaderBundle, RoutineShaderBundleT as FxRoutineShaderBundleT, RoutineSourceBundle as FxRoutineSourceBundle, StringValue as FxStringValue, StringValueT as FxStringValueT, TextureBundle as FxTextureBundle, TextureBundleT as FxTextureBundleT, TextureValue as FxTextureValue, TextureValueT as FxTextureValueT, TrimeshBundle as FxTrimeshBundle, TrimeshBundleT as FxTrimeshBundleT, TypeField as FxTypeField, TypeFieldT as FxTypeFieldT, TypeLayout as FxTypeLayout, TypeLayoutT as FxTypeLayoutT, UAVBundle as FxUAVBundle, UAVBundleT as FxUAVBundleT, UIControl as FxUIControl, UIControlT as FxUIControlT, UintValue as FxUintValue, UintValueT as FxUintValueT, ViewTypeProperty as FxViewTypeProperty, ViewTypePropertyT as FxViewTypePropertyT} from  './FxBundle_generated';


export enum RoutineBundle{
  NONE = 0,
  RoutineBytecodeBundle = 1,
  RoutineShaderBundle = 2
}

export function unionToRoutineBundle(
  type: RoutineBundle,
  accessor: (obj:FxRoutineBytecodeBundle|FxRoutineShaderBundle) => FxRoutineBytecodeBundle|FxRoutineShaderBundle|null
): FxRoutineBytecodeBundle|FxRoutineShaderBundle|null {
  switch(FxRoutineBundle[type]) {
    case 'NONE': return null; 
    case 'RoutineBytecodeBundle': return accessor(new FxRoutineBytecodeBundle())! as FxRoutineBytecodeBundle;
    case 'RoutineShaderBundle': return accessor(new FxRoutineShaderBundle())! as FxRoutineShaderBundle;
    default: return null;
  }
}

export function unionListToRoutineBundle(
  type: RoutineBundle, 
  accessor: (index: number, obj:FxRoutineBytecodeBundle|FxRoutineShaderBundle) => FxRoutineBytecodeBundle|FxRoutineShaderBundle|null, 
  index: number
): FxRoutineBytecodeBundle|FxRoutineShaderBundle|null {
  switch(FxRoutineBundle[type]) {
    case 'NONE': return null; 
    case 'RoutineBytecodeBundle': return accessor(index, new FxRoutineBytecodeBundle())! as FxRoutineBytecodeBundle;
    case 'RoutineShaderBundle': return accessor(index, new FxRoutineShaderBundle())! as FxRoutineShaderBundle;
    default: return null;
  }
}

export enum RoutineSourceBundle{
  NONE = 0,
  RoutineGLSLSourceBundle = 1,
  RoutineHLSLSourceBundle = 2
}

export function unionToRoutineSourceBundle(
  type: RoutineSourceBundle,
  accessor: (obj:FxRoutineGLSLSourceBundle|FxRoutineHLSLSourceBundle) => FxRoutineGLSLSourceBundle|FxRoutineHLSLSourceBundle|null
): FxRoutineGLSLSourceBundle|FxRoutineHLSLSourceBundle|null {
  switch(FxRoutineSourceBundle[type]) {
    case 'NONE': return null; 
    case 'RoutineGLSLSourceBundle': return accessor(new FxRoutineGLSLSourceBundle())! as FxRoutineGLSLSourceBundle;
    case 'RoutineHLSLSourceBundle': return accessor(new FxRoutineHLSLSourceBundle())! as FxRoutineHLSLSourceBundle;
    default: return null;
  }
}

export function unionListToRoutineSourceBundle(
  type: RoutineSourceBundle, 
  accessor: (index: number, obj:FxRoutineGLSLSourceBundle|FxRoutineHLSLSourceBundle) => FxRoutineGLSLSourceBundle|FxRoutineHLSLSourceBundle|null, 
  index: number
): FxRoutineGLSLSourceBundle|FxRoutineHLSLSourceBundle|null {
  switch(FxRoutineSourceBundle[type]) {
    case 'NONE': return null; 
    case 'RoutineGLSLSourceBundle': return accessor(index, new FxRoutineGLSLSourceBundle())! as FxRoutineGLSLSourceBundle;
    case 'RoutineHLSLSourceBundle': return accessor(index, new FxRoutineHLSLSourceBundle())! as FxRoutineHLSLSourceBundle;
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

export enum EMatRenderRoutines{
  k_Vertex = 0,
  k_Pixel = 1,
  k_Last = 2
}

export enum BundleContent{
  NONE = 0,
  PartBundle = 1,
  MatBundle = 2
}

export function unionToBundleContent(
  type: BundleContent,
  accessor: (obj:FxMatBundle|FxPartBundle) => FxMatBundle|FxPartBundle|null
): FxMatBundle|FxPartBundle|null {
  switch(FxBundleContent[type]) {
    case 'NONE': return null; 
    case 'PartBundle': return accessor(new FxPartBundle())! as FxPartBundle;
    case 'MatBundle': return accessor(new FxMatBundle())! as FxMatBundle;
    default: return null;
  }
}

export function unionListToBundleContent(
  type: BundleContent, 
  accessor: (index: number, obj:FxMatBundle|FxPartBundle) => FxMatBundle|FxPartBundle|null, 
  index: number
): FxMatBundle|FxPartBundle|null {
  switch(FxBundleContent[type]) {
    case 'NONE': return null; 
    case 'PartBundle': return accessor(index, new FxPartBundle())! as FxPartBundle;
    case 'MatBundle': return accessor(index, new FxMatBundle())! as FxMatBundle;
    default: return null;
  }
}

export enum PropertyValue{
  NONE = 0,
  UintValue = 1,
  IntValue = 2,
  FloatValue = 3,
  StringValue = 4
}

export function unionToPropertyValue(
  type: PropertyValue,
  accessor: (obj:FxFloatValue|FxIntValue|FxStringValue|FxUintValue) => FxFloatValue|FxIntValue|FxStringValue|FxUintValue|null
): FxFloatValue|FxIntValue|FxStringValue|FxUintValue|null {
  switch(FxPropertyValue[type]) {
    case 'NONE': return null; 
    case 'UintValue': return accessor(new FxUintValue())! as FxUintValue;
    case 'IntValue': return accessor(new FxIntValue())! as FxIntValue;
    case 'FloatValue': return accessor(new FxFloatValue())! as FxFloatValue;
    case 'StringValue': return accessor(new FxStringValue())! as FxStringValue;
    default: return null;
  }
}

export function unionListToPropertyValue(
  type: PropertyValue, 
  accessor: (index: number, obj:FxFloatValue|FxIntValue|FxStringValue|FxUintValue) => FxFloatValue|FxIntValue|FxStringValue|FxUintValue|null, 
  index: number
): FxFloatValue|FxIntValue|FxStringValue|FxUintValue|null {
  switch(FxPropertyValue[type]) {
    case 'NONE': return null; 
    case 'UintValue': return accessor(index, new FxUintValue())! as FxUintValue;
    case 'IntValue': return accessor(index, new FxIntValue())! as FxIntValue;
    case 'FloatValue': return accessor(index, new FxFloatValue())! as FxFloatValue;
    case 'StringValue': return accessor(index, new FxStringValue())! as FxStringValue;
    default: return null;
  }
}

export enum ControlValue{
  NONE = 0,
  UintValue = 1,
  IntValue = 2,
  FloatValue = 3,
  Float2Value = 4,
  Float3Value = 5,
  Float4Value = 6,
  ColorValue = 7,
  TextureValue = 8,
  MeshValue = 9
}

export function unionToControlValue(
  type: ControlValue,
  accessor: (obj:FxColorValue|FxFloat2Value|FxFloat3Value|FxFloat4Value|FxFloatValue|FxIntValue|FxMeshValue|FxTextureValue|FxUintValue) => FxColorValue|FxFloat2Value|FxFloat3Value|FxFloat4Value|FxFloatValue|FxIntValue|FxMeshValue|FxTextureValue|FxUintValue|null
): FxColorValue|FxFloat2Value|FxFloat3Value|FxFloat4Value|FxFloatValue|FxIntValue|FxMeshValue|FxTextureValue|FxUintValue|null {
  switch(FxControlValue[type]) {
    case 'NONE': return null; 
    case 'UintValue': return accessor(new FxUintValue())! as FxUintValue;
    case 'IntValue': return accessor(new FxIntValue())! as FxIntValue;
    case 'FloatValue': return accessor(new FxFloatValue())! as FxFloatValue;
    case 'Float2Value': return accessor(new FxFloat2Value())! as FxFloat2Value;
    case 'Float3Value': return accessor(new FxFloat3Value())! as FxFloat3Value;
    case 'Float4Value': return accessor(new FxFloat4Value())! as FxFloat4Value;
    case 'ColorValue': return accessor(new FxColorValue())! as FxColorValue;
    case 'TextureValue': return accessor(new FxTextureValue())! as FxTextureValue;
    case 'MeshValue': return accessor(new FxMeshValue())! as FxMeshValue;
    default: return null;
  }
}

export function unionListToControlValue(
  type: ControlValue, 
  accessor: (index: number, obj:FxColorValue|FxFloat2Value|FxFloat3Value|FxFloat4Value|FxFloatValue|FxIntValue|FxMeshValue|FxTextureValue|FxUintValue) => FxColorValue|FxFloat2Value|FxFloat3Value|FxFloat4Value|FxFloatValue|FxIntValue|FxMeshValue|FxTextureValue|FxUintValue|null, 
  index: number
): FxColorValue|FxFloat2Value|FxFloat3Value|FxFloat4Value|FxFloatValue|FxIntValue|FxMeshValue|FxTextureValue|FxUintValue|null {
  switch(FxControlValue[type]) {
    case 'NONE': return null; 
    case 'UintValue': return accessor(index, new FxUintValue())! as FxUintValue;
    case 'IntValue': return accessor(index, new FxIntValue())! as FxIntValue;
    case 'FloatValue': return accessor(index, new FxFloatValue())! as FxFloatValue;
    case 'Float2Value': return accessor(index, new FxFloat2Value())! as FxFloat2Value;
    case 'Float3Value': return accessor(index, new FxFloat3Value())! as FxFloat3Value;
    case 'Float4Value': return accessor(index, new FxFloat4Value())! as FxFloat4Value;
    case 'ColorValue': return accessor(index, new FxColorValue())! as FxColorValue;
    case 'TextureValue': return accessor(index, new FxTextureValue())! as FxTextureValue;
    case 'MeshValue': return accessor(index, new FxMeshValue())! as FxMeshValue;
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
  public type: FxTypeLayoutT|null = null,
  public name: string|Uint8Array|null = null,
  public semantic: string|Uint8Array|null = null,
  public size: number = 0,
  public padding: number = 0
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const type = (this.type !== null ? this.type!.pack(builder) : 0);
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const semantic = (this.semantic !== null ? builder.createString(this.semantic!) : 0);

  return FxTypeField.createTypeField(builder,
    type,
    name,
    semantic,
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
export class BufferBundle {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):BufferBundle {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsBufferBundle(bb:flatbuffers.ByteBuffer, obj?:BufferBundle):BufferBundle {
  return (obj || new BufferBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsBufferBundle(bb:flatbuffers.ByteBuffer, obj?:BufferBundle):BufferBundle {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new BufferBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
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

static startBufferBundle(builder:flatbuffers.Builder) {
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

static endBufferBundle(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}


unpack(): BufferBundleT {
  return new BufferBundleT(
    this.name(),
    this.slot(),
    this.stride(),
    (this.type() !== null ? this.type()!.unpack() : null)
  );
}


unpackTo(_o: BufferBundleT): void {
  _o.name = this.name();
  _o.slot = this.slot();
  _o.stride = this.stride();
  _o.type = (this.type() !== null ? this.type()!.unpack() : null);
}
}

export class BufferBundleT {
constructor(
  public name: string|Uint8Array|null = null,
  public slot: number = 0,
  public stride: number = 0,
  public type: FxTypeLayoutT|null = null
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const type = (this.type !== null ? this.type!.pack(builder) : 0);

  FxBufferBundle.startBufferBundle(builder);
  FxBufferBundle.addName(builder, name);
  FxBufferBundle.addSlot(builder, this.slot);
  FxBufferBundle.addStride(builder, this.stride);
  FxBufferBundle.addType(builder, type);

  return FxBufferBundle.endBufferBundle(builder);
}
}
export class TextureBundle {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):TextureBundle {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsTextureBundle(bb:flatbuffers.ByteBuffer, obj?:TextureBundle):TextureBundle {
  return (obj || new TextureBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsTextureBundle(bb:flatbuffers.ByteBuffer, obj?:TextureBundle):TextureBundle {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new TextureBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
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

static startTextureBundle(builder:flatbuffers.Builder) {
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

static endTextureBundle(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}


unpack(): TextureBundleT {
  return new TextureBundleT(
    this.name(),
    this.slot(),
    this.stride(),
    (this.type() !== null ? this.type()!.unpack() : null)
  );
}


unpackTo(_o: TextureBundleT): void {
  _o.name = this.name();
  _o.slot = this.slot();
  _o.stride = this.stride();
  _o.type = (this.type() !== null ? this.type()!.unpack() : null);
}
}

export class TextureBundleT {
constructor(
  public name: string|Uint8Array|null = null,
  public slot: number = 0,
  public stride: number = 0,
  public type: FxTypeLayoutT|null = null
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const type = (this.type !== null ? this.type!.pack(builder) : 0);

  FxTextureBundle.startTextureBundle(builder);
  FxTextureBundle.addName(builder, name);
  FxTextureBundle.addSlot(builder, this.slot);
  FxTextureBundle.addStride(builder, this.stride);
  FxTextureBundle.addType(builder, type);

  return FxTextureBundle.endTextureBundle(builder);
}
}
export class TrimeshBundle {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):TrimeshBundle {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsTrimeshBundle(bb:flatbuffers.ByteBuffer, obj?:TrimeshBundle):TrimeshBundle {
  return (obj || new TrimeshBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsTrimeshBundle(bb:flatbuffers.ByteBuffer, obj?:TrimeshBundle):TrimeshBundle {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new TrimeshBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

vertexCountUName():string|null
vertexCountUName(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
vertexCountUName(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

faceCountUName():string|null
faceCountUName(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
faceCountUName(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

verticesName():string|null
verticesName(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
verticesName(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

facesName():string|null
facesName(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
facesName(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

gsAdjecencyName():string|null
gsAdjecencyName(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
gsAdjecencyName(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 14);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

faceAdjacencyName():string|null
faceAdjacencyName(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
faceAdjacencyName(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 16);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startTrimeshBundle(builder:flatbuffers.Builder) {
  builder.startObject(7);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static addVertexCountUName(builder:flatbuffers.Builder, vertexCountUNameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, vertexCountUNameOffset, 0);
}

static addFaceCountUName(builder:flatbuffers.Builder, faceCountUNameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, faceCountUNameOffset, 0);
}

static addVerticesName(builder:flatbuffers.Builder, verticesNameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(3, verticesNameOffset, 0);
}

static addFacesName(builder:flatbuffers.Builder, facesNameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(4, facesNameOffset, 0);
}

static addGsAdjecencyName(builder:flatbuffers.Builder, gsAdjecencyNameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(5, gsAdjecencyNameOffset, 0);
}

static addFaceAdjacencyName(builder:flatbuffers.Builder, faceAdjacencyNameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(6, faceAdjacencyNameOffset, 0);
}

static endTrimeshBundle(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createTrimeshBundle(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset, vertexCountUNameOffset:flatbuffers.Offset, faceCountUNameOffset:flatbuffers.Offset, verticesNameOffset:flatbuffers.Offset, facesNameOffset:flatbuffers.Offset, gsAdjecencyNameOffset:flatbuffers.Offset, faceAdjacencyNameOffset:flatbuffers.Offset):flatbuffers.Offset {
  TrimeshBundle.startTrimeshBundle(builder);
  TrimeshBundle.addName(builder, nameOffset);
  TrimeshBundle.addVertexCountUName(builder, vertexCountUNameOffset);
  TrimeshBundle.addFaceCountUName(builder, faceCountUNameOffset);
  TrimeshBundle.addVerticesName(builder, verticesNameOffset);
  TrimeshBundle.addFacesName(builder, facesNameOffset);
  TrimeshBundle.addGsAdjecencyName(builder, gsAdjecencyNameOffset);
  TrimeshBundle.addFaceAdjacencyName(builder, faceAdjacencyNameOffset);
  return TrimeshBundle.endTrimeshBundle(builder);
}

unpack(): TrimeshBundleT {
  return new TrimeshBundleT(
    this.name(),
    this.vertexCountUName(),
    this.faceCountUName(),
    this.verticesName(),
    this.facesName(),
    this.gsAdjecencyName(),
    this.faceAdjacencyName()
  );
}


unpackTo(_o: TrimeshBundleT): void {
  _o.name = this.name();
  _o.vertexCountUName = this.vertexCountUName();
  _o.faceCountUName = this.faceCountUName();
  _o.verticesName = this.verticesName();
  _o.facesName = this.facesName();
  _o.gsAdjecencyName = this.gsAdjecencyName();
  _o.faceAdjacencyName = this.faceAdjacencyName();
}
}

export class TrimeshBundleT {
constructor(
  public name: string|Uint8Array|null = null,
  public vertexCountUName: string|Uint8Array|null = null,
  public faceCountUName: string|Uint8Array|null = null,
  public verticesName: string|Uint8Array|null = null,
  public facesName: string|Uint8Array|null = null,
  public gsAdjecencyName: string|Uint8Array|null = null,
  public faceAdjacencyName: string|Uint8Array|null = null
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const vertexCountUName = (this.vertexCountUName !== null ? builder.createString(this.vertexCountUName!) : 0);
  const faceCountUName = (this.faceCountUName !== null ? builder.createString(this.faceCountUName!) : 0);
  const verticesName = (this.verticesName !== null ? builder.createString(this.verticesName!) : 0);
  const facesName = (this.facesName !== null ? builder.createString(this.facesName!) : 0);
  const gsAdjecencyName = (this.gsAdjecencyName !== null ? builder.createString(this.gsAdjecencyName!) : 0);
  const faceAdjacencyName = (this.faceAdjacencyName !== null ? builder.createString(this.faceAdjacencyName!) : 0);

  return FxTrimeshBundle.createTrimeshBundle(builder,
    name,
    vertexCountUName,
    faceCountUName,
    verticesName,
    facesName,
    gsAdjecencyName,
    faceAdjacencyName
  );
}
}
export class CBBundle {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):CBBundle {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsCBBundle(bb:flatbuffers.ByteBuffer, obj?:CBBundle):CBBundle {
  return (obj || new CBBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsCBBundle(bb:flatbuffers.ByteBuffer, obj?:CBBundle):CBBundle {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new CBBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
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

size():number {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

fields(index: number, obj?:FxTypeField):FxTypeField|null {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? (obj || new FxTypeField()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

fieldsLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startCBBundle(builder:flatbuffers.Builder) {
  builder.startObject(4);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static addSlot(builder:flatbuffers.Builder, slot:number) {
  builder.addFieldInt32(1, slot, 0);
}

static addSize(builder:flatbuffers.Builder, size:number) {
  builder.addFieldInt32(2, size, 0);
}

static addFields(builder:flatbuffers.Builder, fieldsOffset:flatbuffers.Offset) {
  builder.addFieldOffset(3, fieldsOffset, 0);
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

static endCBBundle(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createCBBundle(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset, slot:number, size:number, fieldsOffset:flatbuffers.Offset):flatbuffers.Offset {
  CBBundle.startCBBundle(builder);
  CBBundle.addName(builder, nameOffset);
  CBBundle.addSlot(builder, slot);
  CBBundle.addSize(builder, size);
  CBBundle.addFields(builder, fieldsOffset);
  return CBBundle.endCBBundle(builder);
}

unpack(): CBBundleT {
  return new CBBundleT(
    this.name(),
    this.slot(),
    this.size(),
    this.bb!.createObjList(this.fields.bind(this), this.fieldsLength())
  );
}


unpackTo(_o: CBBundleT): void {
  _o.name = this.name();
  _o.slot = this.slot();
  _o.size = this.size();
  _o.fields = this.bb!.createObjList(this.fields.bind(this), this.fieldsLength());
}
}

export class CBBundleT {
constructor(
  public name: string|Uint8Array|null = null,
  public slot: number = 0,
  public size: number = 0,
  public fields: (TypeFieldT)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const fields = FxCBBundle.createFieldsVector(builder, builder.createObjectOffsetList(this.fields));

  return FxCBBundle.createCBBundle(builder,
    name,
    this.slot,
    this.size,
    fields
  );
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

buffers(index: number, obj?:FxBufferBundle):FxBufferBundle|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? (obj || new FxBufferBundle()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

buffersLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

textures(index: number, obj?:FxTextureBundle):FxTextureBundle|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? (obj || new FxTextureBundle()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

texturesLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

trimeshes(index: number, obj?:FxTrimeshBundle):FxTrimeshBundle|null {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? (obj || new FxTrimeshBundle()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

trimeshesLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startRoutineBytecodeBundleResources(builder:flatbuffers.Builder) {
  builder.startObject(4);
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

static addBuffers(builder:flatbuffers.Builder, buffersOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, buffersOffset, 0);
}

static createBuffersVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startBuffersVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static addTextures(builder:flatbuffers.Builder, texturesOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, texturesOffset, 0);
}

static createTexturesVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startTexturesVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static addTrimeshes(builder:flatbuffers.Builder, trimeshesOffset:flatbuffers.Offset) {
  builder.addFieldOffset(3, trimeshesOffset, 0);
}

static createTrimeshesVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startTrimeshesVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endRoutineBytecodeBundleResources(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createRoutineBytecodeBundleResources(builder:flatbuffers.Builder, uavsOffset:flatbuffers.Offset, buffersOffset:flatbuffers.Offset, texturesOffset:flatbuffers.Offset, trimeshesOffset:flatbuffers.Offset):flatbuffers.Offset {
  RoutineBytecodeBundleResources.startRoutineBytecodeBundleResources(builder);
  RoutineBytecodeBundleResources.addUavs(builder, uavsOffset);
  RoutineBytecodeBundleResources.addBuffers(builder, buffersOffset);
  RoutineBytecodeBundleResources.addTextures(builder, texturesOffset);
  RoutineBytecodeBundleResources.addTrimeshes(builder, trimeshesOffset);
  return RoutineBytecodeBundleResources.endRoutineBytecodeBundleResources(builder);
}

unpack(): RoutineBytecodeBundleResourcesT {
  return new RoutineBytecodeBundleResourcesT(
    this.bb!.createObjList(this.uavs.bind(this), this.uavsLength()),
    this.bb!.createObjList(this.buffers.bind(this), this.buffersLength()),
    this.bb!.createObjList(this.textures.bind(this), this.texturesLength()),
    this.bb!.createObjList(this.trimeshes.bind(this), this.trimeshesLength())
  );
}


unpackTo(_o: RoutineBytecodeBundleResourcesT): void {
  _o.uavs = this.bb!.createObjList(this.uavs.bind(this), this.uavsLength());
  _o.buffers = this.bb!.createObjList(this.buffers.bind(this), this.buffersLength());
  _o.textures = this.bb!.createObjList(this.textures.bind(this), this.texturesLength());
  _o.trimeshes = this.bb!.createObjList(this.trimeshes.bind(this), this.trimeshesLength());
}
}

export class RoutineBytecodeBundleResourcesT {
constructor(
  public uavs: (UAVBundleT)[] = [],
  public buffers: (BufferBundleT)[] = [],
  public textures: (TextureBundleT)[] = [],
  public trimeshes: (TrimeshBundleT)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const uavs = FxRoutineBytecodeBundleResources.createUavsVector(builder, builder.createObjectOffsetList(this.uavs));
  const buffers = FxRoutineBytecodeBundleResources.createBuffersVector(builder, builder.createObjectOffsetList(this.buffers));
  const textures = FxRoutineBytecodeBundleResources.createTexturesVector(builder, builder.createObjectOffsetList(this.textures));
  const trimeshes = FxRoutineBytecodeBundleResources.createTrimeshesVector(builder, builder.createObjectOffsetList(this.trimeshes));

  return FxRoutineBytecodeBundleResources.createRoutineBytecodeBundleResources(builder,
    uavs,
    buffers,
    textures,
    trimeshes
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
export class Pass11BytecodeBundle {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):Pass11BytecodeBundle {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsPass11BytecodeBundle(bb:flatbuffers.ByteBuffer, obj?:Pass11BytecodeBundle):Pass11BytecodeBundle {
  return (obj || new Pass11BytecodeBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsPass11BytecodeBundle(bb:flatbuffers.ByteBuffer, obj?:Pass11BytecodeBundle):Pass11BytecodeBundle {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new Pass11BytecodeBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
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

static startPass11BytecodeBundle(builder:flatbuffers.Builder) {
  builder.startObject(1);
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

static endPass11BytecodeBundle(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createPass11BytecodeBundle(builder:flatbuffers.Builder, codeOffset:flatbuffers.Offset):flatbuffers.Offset {
  Pass11BytecodeBundle.startPass11BytecodeBundle(builder);
  Pass11BytecodeBundle.addCode(builder, codeOffset);
  return Pass11BytecodeBundle.endPass11BytecodeBundle(builder);
}

unpack(): Pass11BytecodeBundleT {
  return new Pass11BytecodeBundleT(
    this.bb!.createScalarList(this.code.bind(this), this.codeLength())
  );
}


unpackTo(_o: Pass11BytecodeBundleT): void {
  _o.code = this.bb!.createScalarList(this.code.bind(this), this.codeLength());
}
}

export class Pass11BytecodeBundleT {
constructor(
  public code: (number)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const code = FxPass11BytecodeBundle.createCodeVector(builder, this.code);

  return FxPass11BytecodeBundle.createPass11BytecodeBundle(builder,
    code
  );
}
}
export class RoutineGLSLSourceBundle {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):RoutineGLSLSourceBundle {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsRoutineGLSLSourceBundle(bb:flatbuffers.ByteBuffer, obj?:RoutineGLSLSourceBundle):RoutineGLSLSourceBundle {
  return (obj || new RoutineGLSLSourceBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsRoutineGLSLSourceBundle(bb:flatbuffers.ByteBuffer, obj?:RoutineGLSLSourceBundle):RoutineGLSLSourceBundle {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new RoutineGLSLSourceBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
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

cbuffers(index: number, obj?:FxCBBundle):FxCBBundle|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? (obj || new FxCBBundle()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

cbuffersLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startRoutineGLSLSourceBundle(builder:flatbuffers.Builder) {
  builder.startObject(3);
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

static addCbuffers(builder:flatbuffers.Builder, cbuffersOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, cbuffersOffset, 0);
}

static createCbuffersVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startCbuffersVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endRoutineGLSLSourceBundle(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createRoutineGLSLSourceBundle(builder:flatbuffers.Builder, codeOffset:flatbuffers.Offset, attributesOffset:flatbuffers.Offset, cbuffersOffset:flatbuffers.Offset):flatbuffers.Offset {
  RoutineGLSLSourceBundle.startRoutineGLSLSourceBundle(builder);
  RoutineGLSLSourceBundle.addCode(builder, codeOffset);
  RoutineGLSLSourceBundle.addAttributes(builder, attributesOffset);
  RoutineGLSLSourceBundle.addCbuffers(builder, cbuffersOffset);
  return RoutineGLSLSourceBundle.endRoutineGLSLSourceBundle(builder);
}

unpack(): RoutineGLSLSourceBundleT {
  return new RoutineGLSLSourceBundleT(
    this.code(),
    this.bb!.createObjList(this.attributes.bind(this), this.attributesLength()),
    this.bb!.createObjList(this.cbuffers.bind(this), this.cbuffersLength())
  );
}


unpackTo(_o: RoutineGLSLSourceBundleT): void {
  _o.code = this.code();
  _o.attributes = this.bb!.createObjList(this.attributes.bind(this), this.attributesLength());
  _o.cbuffers = this.bb!.createObjList(this.cbuffers.bind(this), this.cbuffersLength());
}
}

export class RoutineGLSLSourceBundleT {
constructor(
  public code: string|Uint8Array|null = null,
  public attributes: (GLSLAttributeT)[] = [],
  public cbuffers: (CBBundleT)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const code = (this.code !== null ? builder.createString(this.code!) : 0);
  const attributes = FxRoutineGLSLSourceBundle.createAttributesVector(builder, builder.createObjectOffsetList(this.attributes));
  const cbuffers = FxRoutineGLSLSourceBundle.createCbuffersVector(builder, builder.createObjectOffsetList(this.cbuffers));

  return FxRoutineGLSLSourceBundle.createRoutineGLSLSourceBundle(builder,
    code,
    attributes,
    cbuffers
  );
}
}
export class RoutineHLSLSourceBundle {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):RoutineHLSLSourceBundle {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsRoutineHLSLSourceBundle(bb:flatbuffers.ByteBuffer, obj?:RoutineHLSLSourceBundle):RoutineHLSLSourceBundle {
  return (obj || new RoutineHLSLSourceBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsRoutineHLSLSourceBundle(bb:flatbuffers.ByteBuffer, obj?:RoutineHLSLSourceBundle):RoutineHLSLSourceBundle {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new RoutineHLSLSourceBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

code():string|null
code(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
code(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

entryName():string|null
entryName(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
entryName(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

cbuffers(index: number, obj?:FxCBBundle):FxCBBundle|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? (obj || new FxCBBundle()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

cbuffersLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startRoutineHLSLSourceBundle(builder:flatbuffers.Builder) {
  builder.startObject(3);
}

static addCode(builder:flatbuffers.Builder, codeOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, codeOffset, 0);
}

static addEntryName(builder:flatbuffers.Builder, entryNameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, entryNameOffset, 0);
}

static addCbuffers(builder:flatbuffers.Builder, cbuffersOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, cbuffersOffset, 0);
}

static createCbuffersVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startCbuffersVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endRoutineHLSLSourceBundle(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createRoutineHLSLSourceBundle(builder:flatbuffers.Builder, codeOffset:flatbuffers.Offset, entryNameOffset:flatbuffers.Offset, cbuffersOffset:flatbuffers.Offset):flatbuffers.Offset {
  RoutineHLSLSourceBundle.startRoutineHLSLSourceBundle(builder);
  RoutineHLSLSourceBundle.addCode(builder, codeOffset);
  RoutineHLSLSourceBundle.addEntryName(builder, entryNameOffset);
  RoutineHLSLSourceBundle.addCbuffers(builder, cbuffersOffset);
  return RoutineHLSLSourceBundle.endRoutineHLSLSourceBundle(builder);
}

unpack(): RoutineHLSLSourceBundleT {
  return new RoutineHLSLSourceBundleT(
    this.code(),
    this.entryName(),
    this.bb!.createObjList(this.cbuffers.bind(this), this.cbuffersLength())
  );
}


unpackTo(_o: RoutineHLSLSourceBundleT): void {
  _o.code = this.code();
  _o.entryName = this.entryName();
  _o.cbuffers = this.bb!.createObjList(this.cbuffers.bind(this), this.cbuffersLength());
}
}

export class RoutineHLSLSourceBundleT {
constructor(
  public code: string|Uint8Array|null = null,
  public entryName: string|Uint8Array|null = null,
  public cbuffers: (CBBundleT)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const code = (this.code !== null ? builder.createString(this.code!) : 0);
  const entryName = (this.entryName !== null ? builder.createString(this.entryName!) : 0);
  const cbuffers = FxRoutineHLSLSourceBundle.createCbuffersVector(builder, builder.createObjectOffsetList(this.cbuffers));

  return FxRoutineHLSLSourceBundle.createRoutineHLSLSourceBundle(builder,
    code,
    entryName,
    cbuffers
  );
}
}
export class RoutineShaderBundle {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):RoutineShaderBundle {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsRoutineShaderBundle(bb:flatbuffers.ByteBuffer, obj?:RoutineShaderBundle):RoutineShaderBundle {
  return (obj || new RoutineShaderBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsRoutineShaderBundle(bb:flatbuffers.ByteBuffer, obj?:RoutineShaderBundle):RoutineShaderBundle {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new RoutineShaderBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

shadersType(index: number):FxRoutineSourceBundle|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint8(this.bb!.__vector(this.bb_pos + offset) + index) : 0;
}

shadersTypeLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

shadersTypeArray():Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? new Uint8Array(this.bb!.bytes().buffer, this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset), this.bb!.__vector_len(this.bb_pos + offset)) : null;
}

shaders(index: number, obj:any):any|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__union(obj, this.bb!.__vector(this.bb_pos + offset) + index * 4) : null;
}

shadersLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startRoutineShaderBundle(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addShadersType(builder:flatbuffers.Builder, shadersTypeOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, shadersTypeOffset, 0);
}

static createShadersTypeVector(builder:flatbuffers.Builder, data:FxRoutineSourceBundle[]):flatbuffers.Offset {
  builder.startVector(1, data.length, 1);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addInt8(data[i]!);
  }
  return builder.endVector();
}

static startShadersTypeVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(1, numElems, 1);
}

static addShaders(builder:flatbuffers.Builder, shadersOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, shadersOffset, 0);
}

static createShadersVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startShadersVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endRoutineShaderBundle(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createRoutineShaderBundle(builder:flatbuffers.Builder, shadersTypeOffset:flatbuffers.Offset, shadersOffset:flatbuffers.Offset):flatbuffers.Offset {
  RoutineShaderBundle.startRoutineShaderBundle(builder);
  RoutineShaderBundle.addShadersType(builder, shadersTypeOffset);
  RoutineShaderBundle.addShaders(builder, shadersOffset);
  return RoutineShaderBundle.endRoutineShaderBundle(builder);
}

unpack(): RoutineShaderBundleT {
  return new RoutineShaderBundleT(
    this.bb!.createScalarList(this.shadersType.bind(this), this.shadersTypeLength()),
    (() => {
    let ret = [];
    for(let targetEnumIndex = 0; targetEnumIndex < this.shadersTypeLength(); ++targetEnumIndex) {
      let targetEnum = this.shadersType(targetEnumIndex);
      if(targetEnum === null || FxRoutineSourceBundle[targetEnum!] === 'NONE') { continue; }

      let temp = unionListToRoutineSourceBundle(targetEnum, this.shaders.bind(this), targetEnumIndex);
      if(temp === null) { continue; }
      ret.push(temp.unpack());
    }
    return ret;
  })()
  );
}


unpackTo(_o: RoutineShaderBundleT): void {
  _o.shadersType = this.bb!.createScalarList(this.shadersType.bind(this), this.shadersTypeLength());
  _o.shaders = (() => {
    let ret = [];
    for(let targetEnumIndex = 0; targetEnumIndex < this.shadersTypeLength(); ++targetEnumIndex) {
      let targetEnum = this.shadersType(targetEnumIndex);
      if(targetEnum === null || FxRoutineSourceBundle[targetEnum!] === 'NONE') { continue; }

      let temp = unionListToRoutineSourceBundle(targetEnum, this.shaders.bind(this), targetEnumIndex);
      if(temp === null) { continue; }
      ret.push(temp.unpack());
    }
    return ret;
  })();
}
}

export class RoutineShaderBundleT {
constructor(
  public shadersType: (FxRoutineSourceBundle)[] = [],
  public shaders: (FxRoutineGLSLSourceBundleT|FxRoutineHLSLSourceBundleT)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const shadersType = FxRoutineShaderBundle.createShadersTypeVector(builder, this.shadersType);
  const shaders = FxRoutineShaderBundle.createShadersVector(builder, builder.createObjectOffsetList(this.shaders));

  return FxRoutineShaderBundle.createRoutineShaderBundle(builder,
    shadersType,
    shaders
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

renderStates(index: number, obj?:FxRenderState):FxRenderState|null {
  const offset = this.bb!.__offset(this.bb_pos, 18);
  return offset ? (obj || new FxRenderState()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

renderStatesLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 18);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startPartRenderPass(builder:flatbuffers.Builder) {
  builder.startObject(8);
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

static addRenderStates(builder:flatbuffers.Builder, renderStatesOffset:flatbuffers.Offset) {
  builder.addFieldOffset(7, renderStatesOffset, 0);
}

static createRenderStatesVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startRenderStatesVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
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
    (this.instance() !== null ? this.instance()!.unpack() : null),
    this.bb!.createObjList(this.renderStates.bind(this), this.renderStatesLength())
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
  _o.renderStates = this.bb!.createObjList(this.renderStates.bind(this), this.renderStatesLength());
}
}

export class PartRenderPassT {
constructor(
  public routinesType: (FxRoutineBundle)[] = [],
  public routines: (FxRoutineBytecodeBundleT|FxRoutineShaderBundleT)[] = [],
  public geometry: string|Uint8Array|null = null,
  public sorting: boolean = false,
  public instanceCount: number = 0,
  public stride: number = 0,
  public instance: FxTypeLayoutT|null = null,
  public renderStates: (RenderStateT)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const routinesType = FxPartRenderPass.createRoutinesTypeVector(builder, this.routinesType);
  const routines = FxPartRenderPass.createRoutinesVector(builder, builder.createObjectOffsetList(this.routines));
  const geometry = (this.geometry !== null ? builder.createString(this.geometry!) : 0);
  const instance = (this.instance !== null ? this.instance!.pack(builder) : 0);
  const renderStates = FxPartRenderPass.createRenderStatesVector(builder, builder.createObjectOffsetList(this.renderStates));

  FxPartRenderPass.startPartRenderPass(builder);
  FxPartRenderPass.addRoutinesType(builder, routinesType);
  FxPartRenderPass.addRoutines(builder, routines);
  FxPartRenderPass.addGeometry(builder, geometry);
  FxPartRenderPass.addSorting(builder, this.sorting);
  FxPartRenderPass.addInstanceCount(builder, this.instanceCount);
  FxPartRenderPass.addStride(builder, this.stride);
  FxPartRenderPass.addInstance(builder, instance);
  FxPartRenderPass.addRenderStates(builder, renderStates);

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
  public simulationRoutines: (FxRoutineBytecodeBundleT|FxRoutineShaderBundleT)[] = [],
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
export class RenderState {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):RenderState {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsRenderState(bb:flatbuffers.ByteBuffer, obj?:RenderState):RenderState {
  return (obj || new RenderState()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsRenderState(bb:flatbuffers.ByteBuffer, obj?:RenderState):RenderState {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new RenderState()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

type():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

value():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

static startRenderState(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addType(builder:flatbuffers.Builder, type:number) {
  builder.addFieldInt32(0, type, 0);
}

static addValue(builder:flatbuffers.Builder, value:number) {
  builder.addFieldInt32(1, value, 0);
}

static endRenderState(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createRenderState(builder:flatbuffers.Builder, type:number, value:number):flatbuffers.Offset {
  RenderState.startRenderState(builder);
  RenderState.addType(builder, type);
  RenderState.addValue(builder, value);
  return RenderState.endRenderState(builder);
}

unpack(): RenderStateT {
  return new RenderStateT(
    this.type(),
    this.value()
  );
}


unpackTo(_o: RenderStateT): void {
  _o.type = this.type();
  _o.value = this.value();
}
}

export class RenderStateT {
constructor(
  public type: number = 0,
  public value: number = 0
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  return FxRenderState.createRenderState(builder,
    this.type,
    this.value
  );
}
}
export class MatRenderPass {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):MatRenderPass {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsMatRenderPass(bb:flatbuffers.ByteBuffer, obj?:MatRenderPass):MatRenderPass {
  return (obj || new MatRenderPass()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsMatRenderPass(bb:flatbuffers.ByteBuffer, obj?:MatRenderPass):MatRenderPass {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new MatRenderPass()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
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

instance(obj?:FxTypeLayout):FxTypeLayout|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? (obj || new FxTypeLayout()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

stride():number {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

renderStates(index: number, obj?:FxRenderState):FxRenderState|null {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? (obj || new FxRenderState()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

renderStatesLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startMatRenderPass(builder:flatbuffers.Builder) {
  builder.startObject(5);
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

static addInstance(builder:flatbuffers.Builder, instanceOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, instanceOffset, 0);
}

static addStride(builder:flatbuffers.Builder, stride:number) {
  builder.addFieldInt32(3, stride, 0);
}

static addRenderStates(builder:flatbuffers.Builder, renderStatesOffset:flatbuffers.Offset) {
  builder.addFieldOffset(4, renderStatesOffset, 0);
}

static createRenderStatesVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startRenderStatesVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endMatRenderPass(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}


unpack(): MatRenderPassT {
  return new MatRenderPassT(
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
    (this.instance() !== null ? this.instance()!.unpack() : null),
    this.stride(),
    this.bb!.createObjList(this.renderStates.bind(this), this.renderStatesLength())
  );
}


unpackTo(_o: MatRenderPassT): void {
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
  _o.instance = (this.instance() !== null ? this.instance()!.unpack() : null);
  _o.stride = this.stride();
  _o.renderStates = this.bb!.createObjList(this.renderStates.bind(this), this.renderStatesLength());
}
}

export class MatRenderPassT {
constructor(
  public routinesType: (FxRoutineBundle)[] = [],
  public routines: (FxRoutineBytecodeBundleT|FxRoutineShaderBundleT)[] = [],
  public instance: FxTypeLayoutT|null = null,
  public stride: number = 0,
  public renderStates: (RenderStateT)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const routinesType = FxMatRenderPass.createRoutinesTypeVector(builder, this.routinesType);
  const routines = FxMatRenderPass.createRoutinesVector(builder, builder.createObjectOffsetList(this.routines));
  const instance = (this.instance !== null ? this.instance!.pack(builder) : 0);
  const renderStates = FxMatRenderPass.createRenderStatesVector(builder, builder.createObjectOffsetList(this.renderStates));

  FxMatRenderPass.startMatRenderPass(builder);
  FxMatRenderPass.addRoutinesType(builder, routinesType);
  FxMatRenderPass.addRoutines(builder, routines);
  FxMatRenderPass.addInstance(builder, instance);
  FxMatRenderPass.addStride(builder, this.stride);
  FxMatRenderPass.addRenderStates(builder, renderStates);

  return FxMatRenderPass.endMatRenderPass(builder);
}
}
export class MatBundle {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):MatBundle {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsMatBundle(bb:flatbuffers.ByteBuffer, obj?:MatBundle):MatBundle {
  return (obj || new MatBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsMatBundle(bb:flatbuffers.ByteBuffer, obj?:MatBundle):MatBundle {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new MatBundle()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

renderPasses(index: number, obj?:FxMatRenderPass):FxMatRenderPass|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? (obj || new FxMatRenderPass()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

renderPassesLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startMatBundle(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addRenderPasses(builder:flatbuffers.Builder, renderPassesOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, renderPassesOffset, 0);
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

static endMatBundle(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createMatBundle(builder:flatbuffers.Builder, renderPassesOffset:flatbuffers.Offset):flatbuffers.Offset {
  MatBundle.startMatBundle(builder);
  MatBundle.addRenderPasses(builder, renderPassesOffset);
  return MatBundle.endMatBundle(builder);
}

unpack(): MatBundleT {
  return new MatBundleT(
    this.bb!.createObjList(this.renderPasses.bind(this), this.renderPassesLength())
  );
}


unpackTo(_o: MatBundleT): void {
  _o.renderPasses = this.bb!.createObjList(this.renderPasses.bind(this), this.renderPassesLength());
}
}

export class MatBundleT {
constructor(
  public renderPasses: (MatRenderPassT)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const renderPasses = FxMatBundle.createRenderPassesVector(builder, builder.createObjectOffsetList(this.renderPasses));

  return FxMatBundle.createMatBundle(builder,
    renderPasses
  );
}
}
export class StringValue {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):StringValue {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsStringValue(bb:flatbuffers.ByteBuffer, obj?:StringValue):StringValue {
  return (obj || new StringValue()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsStringValue(bb:flatbuffers.ByteBuffer, obj?:StringValue):StringValue {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new StringValue()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

value():string|null
value(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
value(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startStringValue(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, valueOffset, 0);
}

static endStringValue(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createStringValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset):flatbuffers.Offset {
  StringValue.startStringValue(builder);
  StringValue.addValue(builder, valueOffset);
  return StringValue.endStringValue(builder);
}

unpack(): StringValueT {
  return new StringValueT(
    this.value()
  );
}


unpackTo(_o: StringValueT): void {
  _o.value = this.value();
}
}

export class StringValueT {
constructor(
  public value: string|Uint8Array|null = null
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const value = (this.value !== null ? builder.createString(this.value!) : 0);

  return FxStringValue.createStringValue(builder,
    value
  );
}
}
export class TextureValue {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):TextureValue {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsTextureValue(bb:flatbuffers.ByteBuffer, obj?:TextureValue):TextureValue {
  return (obj || new TextureValue()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsTextureValue(bb:flatbuffers.ByteBuffer, obj?:TextureValue):TextureValue {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new TextureValue()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

value():string|null
value(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
value(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startTextureValue(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, valueOffset, 0);
}

static endTextureValue(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createTextureValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset):flatbuffers.Offset {
  TextureValue.startTextureValue(builder);
  TextureValue.addValue(builder, valueOffset);
  return TextureValue.endTextureValue(builder);
}

unpack(): TextureValueT {
  return new TextureValueT(
    this.value()
  );
}


unpackTo(_o: TextureValueT): void {
  _o.value = this.value();
}
}

export class TextureValueT {
constructor(
  public value: string|Uint8Array|null = null
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const value = (this.value !== null ? builder.createString(this.value!) : 0);

  return FxTextureValue.createTextureValue(builder,
    value
  );
}
}
export class MeshValue {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):MeshValue {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsMeshValue(bb:flatbuffers.ByteBuffer, obj?:MeshValue):MeshValue {
  return (obj || new MeshValue()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsMeshValue(bb:flatbuffers.ByteBuffer, obj?:MeshValue):MeshValue {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new MeshValue()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

value():string|null
value(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
value(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startMeshValue(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, valueOffset, 0);
}

static endMeshValue(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createMeshValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset):flatbuffers.Offset {
  MeshValue.startMeshValue(builder);
  MeshValue.addValue(builder, valueOffset);
  return MeshValue.endMeshValue(builder);
}

unpack(): MeshValueT {
  return new MeshValueT(
    this.value()
  );
}


unpackTo(_o: MeshValueT): void {
  _o.value = this.value();
}
}

export class MeshValueT {
constructor(
  public value: string|Uint8Array|null = null
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const value = (this.value !== null ? builder.createString(this.value!) : 0);

  return FxMeshValue.createMeshValue(builder,
    value
  );
}
}
export class UintValue {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):UintValue {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

value():number {
  return this.bb!.readUint32(this.bb_pos);
}

static sizeOf():number {
  return 4;
}

static createUintValue(builder:flatbuffers.Builder, value: number):flatbuffers.Offset {
  builder.prep(4, 4);
  builder.writeInt32(value);
  return builder.offset();
}


unpack(): UintValueT {
  return new UintValueT(
    this.value()
  );
}


unpackTo(_o: UintValueT): void {
  _o.value = this.value();
}
}

export class UintValueT {
constructor(
  public value: number = 0
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  return FxUintValue.createUintValue(builder,
    this.value
  );
}
}
export class IntValue {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):IntValue {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

value():number {
  return this.bb!.readInt32(this.bb_pos);
}

static sizeOf():number {
  return 4;
}

static createIntValue(builder:flatbuffers.Builder, value: number):flatbuffers.Offset {
  builder.prep(4, 4);
  builder.writeInt32(value);
  return builder.offset();
}


unpack(): IntValueT {
  return new IntValueT(
    this.value()
  );
}


unpackTo(_o: IntValueT): void {
  _o.value = this.value();
}
}

export class IntValueT {
constructor(
  public value: number = 0
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  return FxIntValue.createIntValue(builder,
    this.value
  );
}
}
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
  return FxFloatValue.createFloatValue(builder,
    this.value
  );
}
}
export class Float2Value {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):Float2Value {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

x():number {
  return this.bb!.readFloat32(this.bb_pos);
}

y():number {
  return this.bb!.readFloat32(this.bb_pos + 4);
}

static sizeOf():number {
  return 8;
}

static createFloat2Value(builder:flatbuffers.Builder, x: number, y: number):flatbuffers.Offset {
  builder.prep(4, 8);
  builder.writeFloat32(y);
  builder.writeFloat32(x);
  return builder.offset();
}


unpack(): Float2ValueT {
  return new Float2ValueT(
    this.x(),
    this.y()
  );
}


unpackTo(_o: Float2ValueT): void {
  _o.x = this.x();
  _o.y = this.y();
}
}

export class Float2ValueT {
constructor(
  public x: number = 0.0,
  public y: number = 0.0
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  return FxFloat2Value.createFloat2Value(builder,
    this.x,
    this.y
  );
}
}
export class Float3Value {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):Float3Value {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

x():number {
  return this.bb!.readFloat32(this.bb_pos);
}

y():number {
  return this.bb!.readFloat32(this.bb_pos + 4);
}

z():number {
  return this.bb!.readFloat32(this.bb_pos + 8);
}

static sizeOf():number {
  return 12;
}

static createFloat3Value(builder:flatbuffers.Builder, x: number, y: number, z: number):flatbuffers.Offset {
  builder.prep(4, 12);
  builder.writeFloat32(z);
  builder.writeFloat32(y);
  builder.writeFloat32(x);
  return builder.offset();
}


unpack(): Float3ValueT {
  return new Float3ValueT(
    this.x(),
    this.y(),
    this.z()
  );
}


unpackTo(_o: Float3ValueT): void {
  _o.x = this.x();
  _o.y = this.y();
  _o.z = this.z();
}
}

export class Float3ValueT {
constructor(
  public x: number = 0.0,
  public y: number = 0.0,
  public z: number = 0.0
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  return FxFloat3Value.createFloat3Value(builder,
    this.x,
    this.y,
    this.z
  );
}
}
export class Float4Value {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):Float4Value {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

x():number {
  return this.bb!.readFloat32(this.bb_pos);
}

y():number {
  return this.bb!.readFloat32(this.bb_pos + 4);
}

z():number {
  return this.bb!.readFloat32(this.bb_pos + 8);
}

w():number {
  return this.bb!.readFloat32(this.bb_pos + 12);
}

static sizeOf():number {
  return 16;
}

static createFloat4Value(builder:flatbuffers.Builder, x: number, y: number, z: number, w: number):flatbuffers.Offset {
  builder.prep(4, 16);
  builder.writeFloat32(w);
  builder.writeFloat32(z);
  builder.writeFloat32(y);
  builder.writeFloat32(x);
  return builder.offset();
}


unpack(): Float4ValueT {
  return new Float4ValueT(
    this.x(),
    this.y(),
    this.z(),
    this.w()
  );
}


unpackTo(_o: Float4ValueT): void {
  _o.x = this.x();
  _o.y = this.y();
  _o.z = this.z();
  _o.w = this.w();
}
}

export class Float4ValueT {
constructor(
  public x: number = 0.0,
  public y: number = 0.0,
  public z: number = 0.0,
  public w: number = 0.0
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  return FxFloat4Value.createFloat4Value(builder,
    this.x,
    this.y,
    this.z,
    this.w
  );
}
}
export class ColorValue {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):ColorValue {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

r():number {
  return this.bb!.readUint8(this.bb_pos);
}

g():number {
  return this.bb!.readUint8(this.bb_pos + 1);
}

b():number {
  return this.bb!.readUint8(this.bb_pos + 2);
}

a():number {
  return this.bb!.readUint8(this.bb_pos + 3);
}

static sizeOf():number {
  return 4;
}

static createColorValue(builder:flatbuffers.Builder, r: number, g: number, b: number, a: number):flatbuffers.Offset {
  builder.prep(1, 4);
  builder.writeInt8(a);
  builder.writeInt8(b);
  builder.writeInt8(g);
  builder.writeInt8(r);
  return builder.offset();
}


unpack(): ColorValueT {
  return new ColorValueT(
    this.r(),
    this.g(),
    this.b(),
    this.a()
  );
}


unpackTo(_o: ColorValueT): void {
  _o.r = this.r();
  _o.g = this.g();
  _o.b = this.b();
  _o.a = this.a();
}
}

export class ColorValueT {
constructor(
  public r: number = 0,
  public g: number = 0,
  public b: number = 0,
  public a: number = 0
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  return FxColorValue.createColorValue(builder,
    this.r,
    this.g,
    this.b,
    this.a
  );
}
}
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

valueType():FxPropertyValue {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint8(this.bb_pos + offset) : FxPropertyValue.NONE;
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

static addValueType(builder:flatbuffers.Builder, valueType:FxPropertyValue) {
  builder.addFieldInt8(1, valueType, FxPropertyValue.NONE);
}

static addValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, valueOffset, 0);
}

static endViewTypeProperty(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createViewTypeProperty(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset, valueType:FxPropertyValue, valueOffset:flatbuffers.Offset):flatbuffers.Offset {
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
  public valueType: FxPropertyValue = FxPropertyValue.NONE,
  public value: FxFloatValueT|FxIntValueT|FxStringValueT|FxUintValueT|null = null
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const value = builder.createObjectOffset(this.value);

  return FxViewTypeProperty.createViewTypeProperty(builder,
    name,
    this.valueType,
    value
  );
}
}
export class UIControl {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):UIControl {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsUIControl(bb:flatbuffers.ByteBuffer, obj?:UIControl):UIControl {
  return (obj || new UIControl()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsUIControl(bb:flatbuffers.ByteBuffer, obj?:UIControl):UIControl {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new UIControl()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

valueType():FxControlValue {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint8(this.bb_pos + offset) : FxControlValue.NONE;
}

value<T extends flatbuffers.Table>(obj:any):any|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__union(obj, this.bb_pos + offset) : null;
}

properties(index: number, obj?:FxViewTypeProperty):FxViewTypeProperty|null {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? (obj || new FxViewTypeProperty()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

propertiesLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startUIControl(builder:flatbuffers.Builder) {
  builder.startObject(4);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static addValueType(builder:flatbuffers.Builder, valueType:FxControlValue) {
  builder.addFieldInt8(1, valueType, FxControlValue.NONE);
}

static addValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, valueOffset, 0);
}

static addProperties(builder:flatbuffers.Builder, propertiesOffset:flatbuffers.Offset) {
  builder.addFieldOffset(3, propertiesOffset, 0);
}

static createPropertiesVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startPropertiesVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endUIControl(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createUIControl(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset, valueType:FxControlValue, valueOffset:flatbuffers.Offset, propertiesOffset:flatbuffers.Offset):flatbuffers.Offset {
  UIControl.startUIControl(builder);
  UIControl.addName(builder, nameOffset);
  UIControl.addValueType(builder, valueType);
  UIControl.addValue(builder, valueOffset);
  UIControl.addProperties(builder, propertiesOffset);
  return UIControl.endUIControl(builder);
}

unpack(): UIControlT {
  return new UIControlT(
    this.name(),
    this.valueType(),
    (() => {
      let temp = unionToControlValue(this.valueType(), this.value.bind(this));
      if(temp === null) { return null; }
      return temp.unpack()
  })(),
    this.bb!.createObjList(this.properties.bind(this), this.propertiesLength())
  );
}


unpackTo(_o: UIControlT): void {
  _o.name = this.name();
  _o.valueType = this.valueType();
  _o.value = (() => {
      let temp = unionToControlValue(this.valueType(), this.value.bind(this));
      if(temp === null) { return null; }
      return temp.unpack()
  })();
  _o.properties = this.bb!.createObjList(this.properties.bind(this), this.propertiesLength());
}
}

export class UIControlT {
constructor(
  public name: string|Uint8Array|null = null,
  public valueType: FxControlValue = FxControlValue.NONE,
  public value: FxColorValueT|FxFloat2ValueT|FxFloat3ValueT|FxFloat4ValueT|FxFloatValueT|FxIntValueT|FxMeshValueT|FxTextureValueT|FxUintValueT|null = null,
  public properties: (ViewTypePropertyT)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const value = builder.createObjectOffset(this.value);
  const properties = FxUIControl.createPropertiesVector(builder, builder.createObjectOffsetList(this.properties));

  return FxUIControl.createUIControl(builder,
    name,
    this.valueType,
    value,
    properties
  );
}
}
export class PresetEntry {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):PresetEntry {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsPresetEntry(bb:flatbuffers.ByteBuffer, obj?:PresetEntry):PresetEntry {
  return (obj || new PresetEntry()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsPresetEntry(bb:flatbuffers.ByteBuffer, obj?:PresetEntry):PresetEntry {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new PresetEntry()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

valueType():FxControlValue {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint8(this.bb_pos + offset) : FxControlValue.NONE;
}

value<T extends flatbuffers.Table>(obj:any):any|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__union(obj, this.bb_pos + offset) : null;
}

static startPresetEntry(builder:flatbuffers.Builder) {
  builder.startObject(3);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static addValueType(builder:flatbuffers.Builder, valueType:FxControlValue) {
  builder.addFieldInt8(1, valueType, FxControlValue.NONE);
}

static addValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, valueOffset, 0);
}

static endPresetEntry(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createPresetEntry(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset, valueType:FxControlValue, valueOffset:flatbuffers.Offset):flatbuffers.Offset {
  PresetEntry.startPresetEntry(builder);
  PresetEntry.addName(builder, nameOffset);
  PresetEntry.addValueType(builder, valueType);
  PresetEntry.addValue(builder, valueOffset);
  return PresetEntry.endPresetEntry(builder);
}

unpack(): PresetEntryT {
  return new PresetEntryT(
    this.name(),
    this.valueType(),
    (() => {
      let temp = unionToControlValue(this.valueType(), this.value.bind(this));
      if(temp === null) { return null; }
      return temp.unpack()
  })()
  );
}


unpackTo(_o: PresetEntryT): void {
  _o.name = this.name();
  _o.valueType = this.valueType();
  _o.value = (() => {
      let temp = unionToControlValue(this.valueType(), this.value.bind(this));
      if(temp === null) { return null; }
      return temp.unpack()
  })();
}
}

export class PresetEntryT {
constructor(
  public name: string|Uint8Array|null = null,
  public valueType: FxControlValue = FxControlValue.NONE,
  public value: FxColorValueT|FxFloat2ValueT|FxFloat3ValueT|FxFloat4ValueT|FxFloatValueT|FxIntValueT|FxMeshValueT|FxTextureValueT|FxUintValueT|null = null
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const value = builder.createObjectOffset(this.value);

  return FxPresetEntry.createPresetEntry(builder,
    name,
    this.valueType,
    value
  );
}
}
export class Preset {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):Preset {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsPreset(bb:flatbuffers.ByteBuffer, obj?:Preset):Preset {
  return (obj || new Preset()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsPreset(bb:flatbuffers.ByteBuffer, obj?:Preset):Preset {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new Preset()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

desc():string|null
desc(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
desc(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

data(index: number, obj?:FxPresetEntry):FxPresetEntry|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? (obj || new FxPresetEntry()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

dataLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startPreset(builder:flatbuffers.Builder) {
  builder.startObject(3);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static addDesc(builder:flatbuffers.Builder, descOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, descOffset, 0);
}

static addData(builder:flatbuffers.Builder, dataOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, dataOffset, 0);
}

static createDataVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startDataVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endPreset(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createPreset(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset, descOffset:flatbuffers.Offset, dataOffset:flatbuffers.Offset):flatbuffers.Offset {
  Preset.startPreset(builder);
  Preset.addName(builder, nameOffset);
  Preset.addDesc(builder, descOffset);
  Preset.addData(builder, dataOffset);
  return Preset.endPreset(builder);
}

unpack(): PresetT {
  return new PresetT(
    this.name(),
    this.desc(),
    this.bb!.createObjList(this.data.bind(this), this.dataLength())
  );
}


unpackTo(_o: PresetT): void {
  _o.name = this.name();
  _o.desc = this.desc();
  _o.data = this.bb!.createObjList(this.data.bind(this), this.dataLength());
}
}

export class PresetT {
constructor(
  public name: string|Uint8Array|null = null,
  public desc: string|Uint8Array|null = null,
  public data: (PresetEntryT)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const desc = (this.desc !== null ? builder.createString(this.desc!) : 0);
  const data = FxPreset.createDataVector(builder, builder.createObjectOffsetList(this.data));

  return FxPreset.createPreset(builder,
    name,
    desc,
    data
  );
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

controls(index: number, obj?:FxUIControl):FxUIControl|null {
  const offset = this.bb!.__offset(this.bb_pos, 14);
  return offset ? (obj || new FxUIControl()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

controlsLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 14);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

presets(index: number, obj?:FxPreset):FxPreset|null {
  const offset = this.bb!.__offset(this.bb_pos, 16);
  return offset ? (obj || new FxPreset()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

presetsLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 16);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startBundle(builder:flatbuffers.Builder) {
  builder.startObject(7);
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

static addControls(builder:flatbuffers.Builder, controlsOffset:flatbuffers.Offset) {
  builder.addFieldOffset(5, controlsOffset, 0);
}

static createControlsVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startControlsVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static addPresets(builder:flatbuffers.Builder, presetsOffset:flatbuffers.Offset) {
  builder.addFieldOffset(6, presetsOffset, 0);
}

static createPresetsVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startPresetsVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
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
  })(),
    this.bb!.createObjList(this.controls.bind(this), this.controlsLength()),
    this.bb!.createObjList(this.presets.bind(this), this.presetsLength())
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
  _o.controls = this.bb!.createObjList(this.controls.bind(this), this.controlsLength());
  _o.presets = this.bb!.createObjList(this.presets.bind(this), this.presetsLength());
}
}

export class BundleT {
constructor(
  public name: string|Uint8Array|null = null,
  public signature: FxBundleSignatureT|null = null,
  public meta: FxBundleMetaT|null = null,
  public contentType: FxBundleContent = FxBundleContent.NONE,
  public content: FxMatBundleT|FxPartBundleT|null = null,
  public controls: (UIControlT)[] = [],
  public presets: (PresetT)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const signature = (this.signature !== null ? this.signature!.pack(builder) : 0);
  const meta = (this.meta !== null ? this.meta!.pack(builder) : 0);
  const content = builder.createObjectOffset(this.content);
  const controls = FxBundle.createControlsVector(builder, builder.createObjectOffsetList(this.controls));
  const presets = FxBundle.createPresetsVector(builder, builder.createObjectOffsetList(this.presets));

  FxBundle.startBundle(builder);
  FxBundle.addName(builder, name);
  FxBundle.addSignature(builder, signature);
  FxBundle.addMeta(builder, meta);
  FxBundle.addContentType(builder, this.contentType);
  FxBundle.addContent(builder, content);
  FxBundle.addControls(builder, controls);
  FxBundle.addPresets(builder, presets);

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
