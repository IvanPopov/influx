import * as flatbuffers from 'flatbuffers';
import {Bundle as FxBundle, BundleCollection as FxBundleCollection, BundleCollectionT as FxBundleCollectionT, BundleContent as FxBundleContent, BundleMeta as FxBundleMeta, BundleMetaT as FxBundleMetaT, BundleSignature as FxBundleSignature, BundleSignatureT as FxBundleSignatureT, BundleT as FxBundleT, CBBundle as FxCBBundle, CBBundleT as FxCBBundleT, GLSLAttribute as FxGLSLAttribute, GLSLAttributeT as FxGLSLAttributeT, MatBundle as FxMatBundle, MatBundleT as FxMatBundleT, MatRenderPass as FxMatRenderPass, MatRenderPassT as FxMatRenderPassT, PartBundle as FxPartBundle, PartBundleT as FxPartBundleT, PartRenderPass as FxPartRenderPass, PartRenderPassT as FxPartRenderPassT, Preset as FxPreset, PresetEntry as FxPresetEntry, PresetEntryT as FxPresetEntryT, PresetT as FxPresetT, RenderState as FxRenderState, RenderStateT as FxRenderStateT, RoutineBundle as FxRoutineBundle, RoutineBytecodeBundle as FxRoutineBytecodeBundle, RoutineBytecodeBundleResources as FxRoutineBytecodeBundleResources, RoutineBytecodeBundleResourcesT as FxRoutineBytecodeBundleResourcesT, RoutineBytecodeBundleT as FxRoutineBytecodeBundleT, RoutineGLSLSourceBundle as FxRoutineGLSLSourceBundle, RoutineGLSLSourceBundleT as FxRoutineGLSLSourceBundleT, RoutineHLSLSourceBundle as FxRoutineHLSLSourceBundle, RoutineHLSLSourceBundleT as FxRoutineHLSLSourceBundleT, RoutineShaderBundle as FxRoutineShaderBundle, RoutineShaderBundleT as FxRoutineShaderBundleT, RoutineSourceBundle as FxRoutineSourceBundle, TypeField as FxTypeField, TypeFieldT as FxTypeFieldT, TypeLayout as FxTypeLayout, TypeLayoutT as FxTypeLayoutT, UAVBundle as FxUAVBundle, UAVBundleT as FxUAVBundleT, UIBool as FxUIBool, UIBoolT as FxUIBoolT, UIColor as FxUIColor, UIColorT as FxUIColorT, UIControl as FxUIControl, UIControlT as FxUIControlT, UIFloat as FxUIFloat, UIFloat3 as FxUIFloat3, UIFloat3T as FxUIFloat3T, UIFloatSpinner as FxUIFloatSpinner, UIFloatSpinnerT as FxUIFloatSpinnerT, UIFloatT as FxUIFloatT, UIInt as FxUIInt, UIIntT as FxUIIntT, UIProperties as FxUIProperties, UISpinner as FxUISpinner, UISpinnerT as FxUISpinnerT, UIUint as FxUIUint, UIUintT as FxUIUintT} from  './FxBundle_generated';


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

export enum UIProperties{
  NONE = 0,
  UISpinner = 1,
  UIFloatSpinner = 2,
  UIColor = 3,
  UIFloat = 4,
  UIFloat3 = 5,
  UIInt = 6,
  UIUint = 7
}

export function unionToUIProperties(
  type: UIProperties,
  accessor: (obj:FxUIColor|FxUIFloat|FxUIFloat3|FxUIFloatSpinner|FxUIInt|FxUISpinner|FxUIUint) => FxUIColor|FxUIFloat|FxUIFloat3|FxUIFloatSpinner|FxUIInt|FxUISpinner|FxUIUint|null
): FxUIColor|FxUIFloat|FxUIFloat3|FxUIFloatSpinner|FxUIInt|FxUISpinner|FxUIUint|null {
  switch(FxUIProperties[type]) {
    case 'NONE': return null; 
    case 'UISpinner': return accessor(new FxUISpinner())! as FxUISpinner;
    case 'UIFloatSpinner': return accessor(new FxUIFloatSpinner())! as FxUIFloatSpinner;
    case 'UIColor': return accessor(new FxUIColor())! as FxUIColor;
    case 'UIFloat': return accessor(new FxUIFloat())! as FxUIFloat;
    case 'UIFloat3': return accessor(new FxUIFloat3())! as FxUIFloat3;
    case 'UIInt': return accessor(new FxUIInt())! as FxUIInt;
    case 'UIUint': return accessor(new FxUIUint())! as FxUIUint;
    default: return null;
  }
}

export function unionListToUIProperties(
  type: UIProperties, 
  accessor: (index: number, obj:FxUIColor|FxUIFloat|FxUIFloat3|FxUIFloatSpinner|FxUIInt|FxUISpinner|FxUIUint) => FxUIColor|FxUIFloat|FxUIFloat3|FxUIFloatSpinner|FxUIInt|FxUISpinner|FxUIUint|null, 
  index: number
): FxUIColor|FxUIFloat|FxUIFloat3|FxUIFloatSpinner|FxUIInt|FxUISpinner|FxUIUint|null {
  switch(FxUIProperties[type]) {
    case 'NONE': return null; 
    case 'UISpinner': return accessor(index, new FxUISpinner())! as FxUISpinner;
    case 'UIFloatSpinner': return accessor(index, new FxUIFloatSpinner())! as FxUIFloatSpinner;
    case 'UIColor': return accessor(index, new FxUIColor())! as FxUIColor;
    case 'UIFloat': return accessor(index, new FxUIFloat())! as FxUIFloat;
    case 'UIFloat3': return accessor(index, new FxUIFloat3())! as FxUIFloat3;
    case 'UIInt': return accessor(index, new FxUIInt())! as FxUIInt;
    case 'UIUint': return accessor(index, new FxUIUint())! as FxUIUint;
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

static startRoutineGLSLSourceBundle(builder:flatbuffers.Builder) {
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

static endRoutineGLSLSourceBundle(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createRoutineGLSLSourceBundle(builder:flatbuffers.Builder, codeOffset:flatbuffers.Offset, attributesOffset:flatbuffers.Offset):flatbuffers.Offset {
  RoutineGLSLSourceBundle.startRoutineGLSLSourceBundle(builder);
  RoutineGLSLSourceBundle.addCode(builder, codeOffset);
  RoutineGLSLSourceBundle.addAttributes(builder, attributesOffset);
  return RoutineGLSLSourceBundle.endRoutineGLSLSourceBundle(builder);
}

unpack(): RoutineGLSLSourceBundleT {
  return new RoutineGLSLSourceBundleT(
    this.code(),
    this.bb!.createObjList(this.attributes.bind(this), this.attributesLength())
  );
}


unpackTo(_o: RoutineGLSLSourceBundleT): void {
  _o.code = this.code();
  _o.attributes = this.bb!.createObjList(this.attributes.bind(this), this.attributesLength());
}
}

export class RoutineGLSLSourceBundleT {
constructor(
  public code: string|Uint8Array|null = null,
  public attributes: (GLSLAttributeT)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const code = (this.code !== null ? builder.createString(this.code!) : 0);
  const attributes = FxRoutineGLSLSourceBundle.createAttributesVector(builder, builder.createObjectOffsetList(this.attributes));

  return FxRoutineGLSLSourceBundle.createRoutineGLSLSourceBundle(builder,
    code,
    attributes
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
  public routines: (FxRoutineBytecodeBundleT|FxRoutineShaderBundleT)[] = [],
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
export class UISpinner {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):UISpinner {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsUISpinner(bb:flatbuffers.ByteBuffer, obj?:UISpinner):UISpinner {
  return (obj || new UISpinner()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsUISpinner(bb:flatbuffers.ByteBuffer, obj?:UISpinner):UISpinner {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new UISpinner()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

min():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readInt32(this.bb_pos + offset) : 0;
}

max():number {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.readInt32(this.bb_pos + offset) : 0;
}

step():number {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.readInt32(this.bb_pos + offset) : 0;
}

value(index: number):number|null {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? this.bb!.readUint8(this.bb!.__vector(this.bb_pos + offset) + index) : 0;
}

valueLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

valueArray():Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? new Uint8Array(this.bb!.bytes().buffer, this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset), this.bb!.__vector_len(this.bb_pos + offset)) : null;
}

static startUISpinner(builder:flatbuffers.Builder) {
  builder.startObject(5);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static addMin(builder:flatbuffers.Builder, min:number) {
  builder.addFieldInt32(1, min, 0);
}

static addMax(builder:flatbuffers.Builder, max:number) {
  builder.addFieldInt32(2, max, 0);
}

static addStep(builder:flatbuffers.Builder, step:number) {
  builder.addFieldInt32(3, step, 0);
}

static addValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset) {
  builder.addFieldOffset(4, valueOffset, 0);
}

static createValueVector(builder:flatbuffers.Builder, data:number[]|Uint8Array):flatbuffers.Offset {
  builder.startVector(1, data.length, 1);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addInt8(data[i]!);
  }
  return builder.endVector();
}

static startValueVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(1, numElems, 1);
}

static endUISpinner(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createUISpinner(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset, min:number, max:number, step:number, valueOffset:flatbuffers.Offset):flatbuffers.Offset {
  UISpinner.startUISpinner(builder);
  UISpinner.addName(builder, nameOffset);
  UISpinner.addMin(builder, min);
  UISpinner.addMax(builder, max);
  UISpinner.addStep(builder, step);
  UISpinner.addValue(builder, valueOffset);
  return UISpinner.endUISpinner(builder);
}

unpack(): UISpinnerT {
  return new UISpinnerT(
    this.name(),
    this.min(),
    this.max(),
    this.step(),
    this.bb!.createScalarList(this.value.bind(this), this.valueLength())
  );
}


unpackTo(_o: UISpinnerT): void {
  _o.name = this.name();
  _o.min = this.min();
  _o.max = this.max();
  _o.step = this.step();
  _o.value = this.bb!.createScalarList(this.value.bind(this), this.valueLength());
}
}

export class UISpinnerT {
constructor(
  public name: string|Uint8Array|null = null,
  public min: number = 0,
  public max: number = 0,
  public step: number = 0,
  public value: (number)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const value = FxUISpinner.createValueVector(builder, this.value);

  return FxUISpinner.createUISpinner(builder,
    name,
    this.min,
    this.max,
    this.step,
    value
  );
}
}
export class UIFloatSpinner {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):UIFloatSpinner {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsUIFloatSpinner(bb:flatbuffers.ByteBuffer, obj?:UIFloatSpinner):UIFloatSpinner {
  return (obj || new UIFloatSpinner()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsUIFloatSpinner(bb:flatbuffers.ByteBuffer, obj?:UIFloatSpinner):UIFloatSpinner {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new UIFloatSpinner()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

min():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readFloat32(this.bb_pos + offset) : 0.0;
}

max():number {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.readFloat32(this.bb_pos + offset) : 0.0;
}

step():number {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.readFloat32(this.bb_pos + offset) : 0.0;
}

value(index: number):number|null {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? this.bb!.readUint8(this.bb!.__vector(this.bb_pos + offset) + index) : 0;
}

valueLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

valueArray():Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? new Uint8Array(this.bb!.bytes().buffer, this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset), this.bb!.__vector_len(this.bb_pos + offset)) : null;
}

static startUIFloatSpinner(builder:flatbuffers.Builder) {
  builder.startObject(5);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static addMin(builder:flatbuffers.Builder, min:number) {
  builder.addFieldFloat32(1, min, 0.0);
}

static addMax(builder:flatbuffers.Builder, max:number) {
  builder.addFieldFloat32(2, max, 0.0);
}

static addStep(builder:flatbuffers.Builder, step:number) {
  builder.addFieldFloat32(3, step, 0.0);
}

static addValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset) {
  builder.addFieldOffset(4, valueOffset, 0);
}

static createValueVector(builder:flatbuffers.Builder, data:number[]|Uint8Array):flatbuffers.Offset {
  builder.startVector(1, data.length, 1);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addInt8(data[i]!);
  }
  return builder.endVector();
}

static startValueVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(1, numElems, 1);
}

static endUIFloatSpinner(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createUIFloatSpinner(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset, min:number, max:number, step:number, valueOffset:flatbuffers.Offset):flatbuffers.Offset {
  UIFloatSpinner.startUIFloatSpinner(builder);
  UIFloatSpinner.addName(builder, nameOffset);
  UIFloatSpinner.addMin(builder, min);
  UIFloatSpinner.addMax(builder, max);
  UIFloatSpinner.addStep(builder, step);
  UIFloatSpinner.addValue(builder, valueOffset);
  return UIFloatSpinner.endUIFloatSpinner(builder);
}

unpack(): UIFloatSpinnerT {
  return new UIFloatSpinnerT(
    this.name(),
    this.min(),
    this.max(),
    this.step(),
    this.bb!.createScalarList(this.value.bind(this), this.valueLength())
  );
}


unpackTo(_o: UIFloatSpinnerT): void {
  _o.name = this.name();
  _o.min = this.min();
  _o.max = this.max();
  _o.step = this.step();
  _o.value = this.bb!.createScalarList(this.value.bind(this), this.valueLength());
}
}

export class UIFloatSpinnerT {
constructor(
  public name: string|Uint8Array|null = null,
  public min: number = 0.0,
  public max: number = 0.0,
  public step: number = 0.0,
  public value: (number)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const value = FxUIFloatSpinner.createValueVector(builder, this.value);

  return FxUIFloatSpinner.createUIFloatSpinner(builder,
    name,
    this.min,
    this.max,
    this.step,
    value
  );
}
}
export class UIColor {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):UIColor {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsUIColor(bb:flatbuffers.ByteBuffer, obj?:UIColor):UIColor {
  return (obj || new UIColor()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsUIColor(bb:flatbuffers.ByteBuffer, obj?:UIColor):UIColor {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new UIColor()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

value(index: number):number|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint8(this.bb!.__vector(this.bb_pos + offset) + index) : 0;
}

valueLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

valueArray():Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? new Uint8Array(this.bb!.bytes().buffer, this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset), this.bb!.__vector_len(this.bb_pos + offset)) : null;
}

static startUIColor(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static addValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, valueOffset, 0);
}

static createValueVector(builder:flatbuffers.Builder, data:number[]|Uint8Array):flatbuffers.Offset {
  builder.startVector(1, data.length, 1);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addInt8(data[i]!);
  }
  return builder.endVector();
}

static startValueVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(1, numElems, 1);
}

static endUIColor(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createUIColor(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset, valueOffset:flatbuffers.Offset):flatbuffers.Offset {
  UIColor.startUIColor(builder);
  UIColor.addName(builder, nameOffset);
  UIColor.addValue(builder, valueOffset);
  return UIColor.endUIColor(builder);
}

unpack(): UIColorT {
  return new UIColorT(
    this.name(),
    this.bb!.createScalarList(this.value.bind(this), this.valueLength())
  );
}


unpackTo(_o: UIColorT): void {
  _o.name = this.name();
  _o.value = this.bb!.createScalarList(this.value.bind(this), this.valueLength());
}
}

export class UIColorT {
constructor(
  public name: string|Uint8Array|null = null,
  public value: (number)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const value = FxUIColor.createValueVector(builder, this.value);

  return FxUIColor.createUIColor(builder,
    name,
    value
  );
}
}
export class UIFloat3 {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):UIFloat3 {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsUIFloat3(bb:flatbuffers.ByteBuffer, obj?:UIFloat3):UIFloat3 {
  return (obj || new UIFloat3()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsUIFloat3(bb:flatbuffers.ByteBuffer, obj?:UIFloat3):UIFloat3 {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new UIFloat3()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

value(index: number):number|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint8(this.bb!.__vector(this.bb_pos + offset) + index) : 0;
}

valueLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

valueArray():Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? new Uint8Array(this.bb!.bytes().buffer, this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset), this.bb!.__vector_len(this.bb_pos + offset)) : null;
}

static startUIFloat3(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static addValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, valueOffset, 0);
}

static createValueVector(builder:flatbuffers.Builder, data:number[]|Uint8Array):flatbuffers.Offset {
  builder.startVector(1, data.length, 1);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addInt8(data[i]!);
  }
  return builder.endVector();
}

static startValueVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(1, numElems, 1);
}

static endUIFloat3(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createUIFloat3(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset, valueOffset:flatbuffers.Offset):flatbuffers.Offset {
  UIFloat3.startUIFloat3(builder);
  UIFloat3.addName(builder, nameOffset);
  UIFloat3.addValue(builder, valueOffset);
  return UIFloat3.endUIFloat3(builder);
}

unpack(): UIFloat3T {
  return new UIFloat3T(
    this.name(),
    this.bb!.createScalarList(this.value.bind(this), this.valueLength())
  );
}


unpackTo(_o: UIFloat3T): void {
  _o.name = this.name();
  _o.value = this.bb!.createScalarList(this.value.bind(this), this.valueLength());
}
}

export class UIFloat3T {
constructor(
  public name: string|Uint8Array|null = null,
  public value: (number)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const value = FxUIFloat3.createValueVector(builder, this.value);

  return FxUIFloat3.createUIFloat3(builder,
    name,
    value
  );
}
}
export class UIFloat {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):UIFloat {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsUIFloat(bb:flatbuffers.ByteBuffer, obj?:UIFloat):UIFloat {
  return (obj || new UIFloat()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsUIFloat(bb:flatbuffers.ByteBuffer, obj?:UIFloat):UIFloat {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new UIFloat()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

value(index: number):number|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint8(this.bb!.__vector(this.bb_pos + offset) + index) : 0;
}

valueLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

valueArray():Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? new Uint8Array(this.bb!.bytes().buffer, this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset), this.bb!.__vector_len(this.bb_pos + offset)) : null;
}

static startUIFloat(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static addValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, valueOffset, 0);
}

static createValueVector(builder:flatbuffers.Builder, data:number[]|Uint8Array):flatbuffers.Offset {
  builder.startVector(1, data.length, 1);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addInt8(data[i]!);
  }
  return builder.endVector();
}

static startValueVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(1, numElems, 1);
}

static endUIFloat(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createUIFloat(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset, valueOffset:flatbuffers.Offset):flatbuffers.Offset {
  UIFloat.startUIFloat(builder);
  UIFloat.addName(builder, nameOffset);
  UIFloat.addValue(builder, valueOffset);
  return UIFloat.endUIFloat(builder);
}

unpack(): UIFloatT {
  return new UIFloatT(
    this.name(),
    this.bb!.createScalarList(this.value.bind(this), this.valueLength())
  );
}


unpackTo(_o: UIFloatT): void {
  _o.name = this.name();
  _o.value = this.bb!.createScalarList(this.value.bind(this), this.valueLength());
}
}

export class UIFloatT {
constructor(
  public name: string|Uint8Array|null = null,
  public value: (number)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const value = FxUIFloat.createValueVector(builder, this.value);

  return FxUIFloat.createUIFloat(builder,
    name,
    value
  );
}
}
export class UIInt {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):UIInt {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsUIInt(bb:flatbuffers.ByteBuffer, obj?:UIInt):UIInt {
  return (obj || new UIInt()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsUIInt(bb:flatbuffers.ByteBuffer, obj?:UIInt):UIInt {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new UIInt()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

value(index: number):number|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint8(this.bb!.__vector(this.bb_pos + offset) + index) : 0;
}

valueLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

valueArray():Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? new Uint8Array(this.bb!.bytes().buffer, this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset), this.bb!.__vector_len(this.bb_pos + offset)) : null;
}

static startUIInt(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static addValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, valueOffset, 0);
}

static createValueVector(builder:flatbuffers.Builder, data:number[]|Uint8Array):flatbuffers.Offset {
  builder.startVector(1, data.length, 1);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addInt8(data[i]!);
  }
  return builder.endVector();
}

static startValueVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(1, numElems, 1);
}

static endUIInt(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createUIInt(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset, valueOffset:flatbuffers.Offset):flatbuffers.Offset {
  UIInt.startUIInt(builder);
  UIInt.addName(builder, nameOffset);
  UIInt.addValue(builder, valueOffset);
  return UIInt.endUIInt(builder);
}

unpack(): UIIntT {
  return new UIIntT(
    this.name(),
    this.bb!.createScalarList(this.value.bind(this), this.valueLength())
  );
}


unpackTo(_o: UIIntT): void {
  _o.name = this.name();
  _o.value = this.bb!.createScalarList(this.value.bind(this), this.valueLength());
}
}

export class UIIntT {
constructor(
  public name: string|Uint8Array|null = null,
  public value: (number)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const value = FxUIInt.createValueVector(builder, this.value);

  return FxUIInt.createUIInt(builder,
    name,
    value
  );
}
}
export class UIUint {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):UIUint {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsUIUint(bb:flatbuffers.ByteBuffer, obj?:UIUint):UIUint {
  return (obj || new UIUint()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsUIUint(bb:flatbuffers.ByteBuffer, obj?:UIUint):UIUint {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new UIUint()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

value(index: number):number|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint8(this.bb!.__vector(this.bb_pos + offset) + index) : 0;
}

valueLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

valueArray():Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? new Uint8Array(this.bb!.bytes().buffer, this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset), this.bb!.__vector_len(this.bb_pos + offset)) : null;
}

static startUIUint(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static addValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, valueOffset, 0);
}

static createValueVector(builder:flatbuffers.Builder, data:number[]|Uint8Array):flatbuffers.Offset {
  builder.startVector(1, data.length, 1);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addInt8(data[i]!);
  }
  return builder.endVector();
}

static startValueVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(1, numElems, 1);
}

static endUIUint(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createUIUint(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset, valueOffset:flatbuffers.Offset):flatbuffers.Offset {
  UIUint.startUIUint(builder);
  UIUint.addName(builder, nameOffset);
  UIUint.addValue(builder, valueOffset);
  return UIUint.endUIUint(builder);
}

unpack(): UIUintT {
  return new UIUintT(
    this.name(),
    this.bb!.createScalarList(this.value.bind(this), this.valueLength())
  );
}


unpackTo(_o: UIUintT): void {
  _o.name = this.name();
  _o.value = this.bb!.createScalarList(this.value.bind(this), this.valueLength());
}
}

export class UIUintT {
constructor(
  public name: string|Uint8Array|null = null,
  public value: (number)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const value = FxUIUint.createValueVector(builder, this.value);

  return FxUIUint.createUIUint(builder,
    name,
    value
  );
}
}
export class UIBool {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):UIBool {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsUIBool(bb:flatbuffers.ByteBuffer, obj?:UIBool):UIBool {
  return (obj || new UIBool()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsUIBool(bb:flatbuffers.ByteBuffer, obj?:UIBool):UIBool {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new UIBool()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

value(index: number):number|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint8(this.bb!.__vector(this.bb_pos + offset) + index) : 0;
}

valueLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

valueArray():Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? new Uint8Array(this.bb!.bytes().buffer, this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset), this.bb!.__vector_len(this.bb_pos + offset)) : null;
}

static startUIBool(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static addValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, valueOffset, 0);
}

static createValueVector(builder:flatbuffers.Builder, data:number[]|Uint8Array):flatbuffers.Offset {
  builder.startVector(1, data.length, 1);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addInt8(data[i]!);
  }
  return builder.endVector();
}

static startValueVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(1, numElems, 1);
}

static endUIBool(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createUIBool(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset, valueOffset:flatbuffers.Offset):flatbuffers.Offset {
  UIBool.startUIBool(builder);
  UIBool.addName(builder, nameOffset);
  UIBool.addValue(builder, valueOffset);
  return UIBool.endUIBool(builder);
}

unpack(): UIBoolT {
  return new UIBoolT(
    this.name(),
    this.bb!.createScalarList(this.value.bind(this), this.valueLength())
  );
}


unpackTo(_o: UIBoolT): void {
  _o.name = this.name();
  _o.value = this.bb!.createScalarList(this.value.bind(this), this.valueLength());
}
}

export class UIBoolT {
constructor(
  public name: string|Uint8Array|null = null,
  public value: (number)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const value = FxUIBool.createValueVector(builder, this.value);

  return FxUIBool.createUIBool(builder,
    name,
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

propsType():FxUIProperties {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint8(this.bb_pos + offset) : FxUIProperties.NONE;
}

props<T extends flatbuffers.Table>(obj:any):any|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__union(obj, this.bb_pos + offset) : null;
}

static startUIControl(builder:flatbuffers.Builder) {
  builder.startObject(3);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static addPropsType(builder:flatbuffers.Builder, propsType:FxUIProperties) {
  builder.addFieldInt8(1, propsType, FxUIProperties.NONE);
}

static addProps(builder:flatbuffers.Builder, propsOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, propsOffset, 0);
}

static endUIControl(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createUIControl(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset, propsType:FxUIProperties, propsOffset:flatbuffers.Offset):flatbuffers.Offset {
  UIControl.startUIControl(builder);
  UIControl.addName(builder, nameOffset);
  UIControl.addPropsType(builder, propsType);
  UIControl.addProps(builder, propsOffset);
  return UIControl.endUIControl(builder);
}

unpack(): UIControlT {
  return new UIControlT(
    this.name(),
    this.propsType(),
    (() => {
      let temp = unionToUIProperties(this.propsType(), this.props.bind(this));
      if(temp === null) { return null; }
      return temp.unpack()
  })()
  );
}


unpackTo(_o: UIControlT): void {
  _o.name = this.name();
  _o.propsType = this.propsType();
  _o.props = (() => {
      let temp = unionToUIProperties(this.propsType(), this.props.bind(this));
      if(temp === null) { return null; }
      return temp.unpack()
  })();
}
}

export class UIControlT {
constructor(
  public name: string|Uint8Array|null = null,
  public propsType: FxUIProperties = FxUIProperties.NONE,
  public props: FxUIColorT|FxUIFloat3T|FxUIFloatSpinnerT|FxUIFloatT|FxUIIntT|FxUISpinnerT|FxUIUintT|null = null
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const props = builder.createObjectOffset(this.props);

  return FxUIControl.createUIControl(builder,
    name,
    this.propsType,
    props
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

value(index: number):number|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint8(this.bb!.__vector(this.bb_pos + offset) + index) : 0;
}

valueLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

valueArray():Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? new Uint8Array(this.bb!.bytes().buffer, this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset), this.bb!.__vector_len(this.bb_pos + offset)) : null;
}

static startPresetEntry(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static addValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, valueOffset, 0);
}

static createValueVector(builder:flatbuffers.Builder, data:number[]|Uint8Array):flatbuffers.Offset {
  builder.startVector(1, data.length, 1);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addInt8(data[i]!);
  }
  return builder.endVector();
}

static startValueVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(1, numElems, 1);
}

static endPresetEntry(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createPresetEntry(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset, valueOffset:flatbuffers.Offset):flatbuffers.Offset {
  PresetEntry.startPresetEntry(builder);
  PresetEntry.addName(builder, nameOffset);
  PresetEntry.addValue(builder, valueOffset);
  return PresetEntry.endPresetEntry(builder);
}

unpack(): PresetEntryT {
  return new PresetEntryT(
    this.name(),
    this.bb!.createScalarList(this.value.bind(this), this.valueLength())
  );
}


unpackTo(_o: PresetEntryT): void {
  _o.name = this.name();
  _o.value = this.bb!.createScalarList(this.value.bind(this), this.valueLength());
}
}

export class PresetEntryT {
constructor(
  public name: string|Uint8Array|null = null,
  public value: (number)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const name = (this.name !== null ? builder.createString(this.name!) : 0);
  const value = FxPresetEntry.createValueVector(builder, this.value);

  return FxPresetEntry.createPresetEntry(builder,
    name,
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
