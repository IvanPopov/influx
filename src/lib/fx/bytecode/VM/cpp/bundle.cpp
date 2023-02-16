#include <stdio.h>
#include <iostream>
#include <cmath>
#include <map>

#include "bundle.h"

#pragma warning(disable:4244)

// @lib/idl/bytecode
#define export // hack to include enum from ts
#include "../../../../idl/bytecode/EOperations.ts"

namespace VM
{

void DecodeChunks(uint8_t* data, uint32_t byteLength, std::map<int, memory_view>& chunks) 
{
    int type = *((uint32_t*)data);
    uint32_t contentByteLength = *((uint32_t*)(data + 4)) << 2;
    uint8_t* content = data + 8;

    chunks[type] = memory_view((uintptr_t)content, contentByteLength >> 2);

    uint8_t* nextChunk = content + contentByteLength;
    if (contentByteLength < byteLength - 8) {
        DecodeChunks(nextChunk, byteLength - 8 - contentByteLength, chunks);
    } 
}

void DecodeLayoutChunk(uint8_t* chunk, BUNDLE::CONSTANT_VECTOR_T& layout) 
{
    uint32_t count = *((uint32_t*)chunk);
    chunk += 4;

    for (uint32_t i = 0; i < count; ++i) 
    {
        uint32_t nameLength = *((uint32_t*)chunk);
        chunk += 4;
        std::string name((const char*)chunk, nameLength);
        chunk += nameLength;

        uint32_t typeLength = *((uint32_t*)chunk);
        chunk += 4;
        std::string type((const char*)chunk, typeLength);
        chunk += typeLength;

        uint32_t semanticLength = *((uint32_t*)chunk);
        chunk += 4;
        std::string semantic((const char*)chunk, semanticLength);
        chunk += semanticLength;

        uint32_t offset = *((uint32_t*)chunk);
        chunk += 4;
        uint32_t size = *((uint32_t*)chunk);
        chunk += 4;
        
        layout.push_back({ name, size, offset, semantic, type }); 
    }
} 



uint8_t* DecodeTypeLayout(uint8_t* chunk, BUNDLE_TYPE_T& type);

uint8_t* DecodeTypeField(uint8_t* chunk, BUNDLE_FIELD_T& field)
{
    field.padding = *((uint32_t*)chunk);
    chunk += 4;
    field.size = *((uint32_t*)chunk);
    chunk += 4;

    uint32_t semanticLength = *((uint32_t*)chunk);
    chunk += 4;
    field.semantic = std::string((const char*)chunk, semanticLength);
    chunk += semanticLength;

    uint32_t nameLength = *((uint32_t*)chunk);
    chunk += 4;
    field.name = std::string((const char*)chunk, nameLength);
    chunk += nameLength;
    
    chunk = DecodeTypeLayout(chunk, *field.type);
    return chunk;
}



uint8_t* DecodeTypeLayout(uint8_t* chunk, BUNDLE_TYPE_T& type)
{
    type.size = *((uint32_t*)chunk);
    chunk += 4;
    type.length = *((uint32_t*)chunk);
    chunk += 4;

    uint32_t nameLength = *((uint32_t*)chunk);
    chunk += 4;
    type.name = std::string((const char*)chunk, nameLength);
    chunk += nameLength;

    uint32_t count = *((uint32_t*)chunk);
    chunk += 4;

    for (uint32_t i = 0; i < count; ++ i) 
    {
        auto& field = type.fields.emplace_back();
        chunk = DecodeTypeField(chunk, field);
    }

    return chunk;
}


void DecodeExternsChunk(uint8_t* chunk, BUNDLE::EXTERN_VECTOR_T& externs) 
{
    uint32_t count = *((uint32_t*)chunk);
    chunk += 4;

    for (uint32_t i = 0; i < count; ++i) 
    {
        auto& external = externs.emplace_back();

        external.id = *((uint32_t*)chunk);
        chunk += 4;

        uint32_t nameLength = *((uint32_t*)chunk);
        chunk += 4;
        external.name = std::string((const char*)chunk, nameLength);
        chunk += nameLength;

        chunk = DecodeTypeLayout(chunk, external.ret);

        uint32_t paramCount = *((uint32_t*)chunk);
        chunk += 4;

        for (uint32_t j = 0; j < paramCount; ++j) 
        {
            auto& param = external.params.emplace_back();
            chunk = DecodeTypeLayout(chunk, param);
        }
    }
}


BUNDLE::BUNDLE(std::string debugName, memory_view data): m_debugName(debugName)
{
    Load(data);
}

BUNDLE::BUNDLE() {} 

struct INSTRUCTION
{
    uint32_t op;
    uint32_t a;
    uint32_t b;
    uint32_t c;
    uint32_t d;
};

#define OPERATIONS(PREDICATE) \
    PREDICATE(I32LoadRegister)\
    PREDICATE(I32LoadInput)\
    PREDICATE(I32LoadInputPointer)\
    PREDICATE(I32LoadRegistersPointer)\
    PREDICATE(I32StoreRegisterPointer)\
    PREDICATE(I32StoreInput)\
    PREDICATE(I32StoreInputPointer)\
    PREDICATE(I32SetConst)\
    PREDICATE(I32TextureLoad)\
    PREDICATE(I32ExternCall)\
    PREDICATE(I32Add)\
    PREDICATE(I32Sub)\
    PREDICATE(I32Mul)\
    PREDICATE(I32Div)\
    PREDICATE(I32Mod)\
    PREDICATE(F32Add)\
    PREDICATE(F32Sub)\
    PREDICATE(F32Mul)\
    PREDICATE(F32Div)\
    PREDICATE(F32Mod)\
    PREDICATE(U32LessThan)\
    PREDICATE(U32GreaterThanEqual)\
    PREDICATE(I32LessThan)\
    PREDICATE(I32GreaterThanEqual)\
    PREDICATE(I32Equal)\
    PREDICATE(I32NotEqual)\
    PREDICATE(I32Not)\
    PREDICATE(F32LessThan)\
    PREDICATE(F32GreaterThanEqual)\
    PREDICATE(I32LogicalOr)\
    PREDICATE(I32LogicalAnd)\
    PREDICATE(F32Frac)\
    PREDICATE(F32Floor)\
    PREDICATE(F32Ceil)\
    PREDICATE(F32Sin)\
    PREDICATE(F32Cos)\
    PREDICATE(F32Abs)\
    PREDICATE(F32Sqrt)\
    PREDICATE(F32Pow)\
    PREDICATE(F32Max)\
    PREDICATE(F32Min)\
    PREDICATE(I32Mad)\
    PREDICATE(I32Min)\
    PREDICATE(I32Max)\
    PREDICATE(F32ToU32)\
    PREDICATE(F32ToI32)\
    PREDICATE(U32ToF32)\
    PREDICATE(I32ToF32)\
    PREDICATE(JumpIf)

#define FLOW_CONTROLS(PREDICATE) \
    PREDICATE(Jump)

// ===============================================================================//
// Attention! Must be strictly sychronized with @lib/idl/bytecode/EOperations.ts  //
// ===============================================================================//
#define COMMANDS(PREDICATE) \
    OPERATIONS(PREDICATE)\
    FLOW_CONTROLS(PREDICATE)\
    PREDICATE(Ret)

// registers
#define I32SetConst()               iregs[a] = *((int*)&b);
#define I32LoadRegister()           iregs[a] = iregs[b];
// inputs
#define I32LoadInput()              i32LoadInput(regs, iinput, a, b, c, d);
#define I32StoreInput()             iinput[a][b] = iregs[c];
// registers pointers    
// a => dest
// b => source pointer
// c => offset
#define I32LoadRegistersPointer()   iregs[a] = iregs[iregs[b] + c];
#define I32StoreRegisterPointer()   iregs[iregs[a] + c] = iregs[b];
// input pointers
// a => input index
// b => dest
// c => source pointer
// d => offset
#define I32LoadInputPointer()       i32LoadInputPointer(regs, iinput, a, b, c, d);
#define I32StoreInputPointer()      iinput[a][iregs[b] + d] = iregs[c];
#define I32TextureLoad()            i32TextureLoad(regs, iinput, a, b, c, d);
#define I32ExternCall()             i32ExternalCall(m_ncalls, m_externs, regs, iinput, a, b, c, d);
//
// Arithmetic operations
//
#define I32Add()                    iregs[a] = iregs[b] + iregs[c];
#define I32Sub()                    iregs[a] = iregs[b] - iregs[c];
#define I32Mul()                    iregs[a] = iregs[b] * iregs[c];
#define I32Div()                    iregs[a] = iregs[b] / iregs[c];
#define I32Mod()                    iregs[a] = iregs[c] != 0 ? iregs[b] % iregs[c] : 0;     // IP: temp hack to avoid runtine error
#define I32Mad()                    iregs[a] = iregs[b] + iregs[c] * iregs[d];
#define I32Min()                    iregs[a] = iregs[b] < iregs[c] ? iregs[b] : iregs[c];
#define I32Max()                    iregs[a] = iregs[b] < iregs[c] ? iregs[c] : iregs[b];
#define F32Add()                    fregs[a] = fregs[b] + fregs[c];
#define F32Sub()                    fregs[a] = fregs[b] - fregs[c];
#define F32Mul()                    fregs[a] = fregs[b] * fregs[c];
#define F32Div()                    fregs[a] = fregs[b] / fregs[c];
#define F32Mod()                    fregs[a] = std::fmod(fregs[b], fregs[c]);
//
// Relational operations
//
#define U32LessThan()               iregs[a] = uregs[b] < uregs[c];
#define U32GreaterThanEqual()       iregs[a] = uregs[b] >= uregs[c];
#define I32LessThan()               iregs[a] = iregs[b] < iregs[c];
#define I32GreaterThanEqual()       iregs[a] = iregs[b] >= iregs[c];
#define I32Equal()                  iregs[a] = iregs[b] == iregs[c];
#define I32NotEqual()               iregs[a] = iregs[b] != iregs[c];
#define I32Not()                    iregs[a] = !iregs[b];
#define F32LessThan()               fregs[a] = fregs[b] < fregs[c];
#define F32GreaterThanEqual()       fregs[a] = fregs[b] >= fregs[c];
//
// Logical operations
//
#define I32LogicalOr()              iregs[a] = iregs[b] || iregs[c];
#define I32LogicalAnd()             iregs[a] = iregs[b] && iregs[c];
//
// intrinsics
//
#define F32Frac()                   fregs[a] = fregs[b] - std::floor(fregs[b]); // same as frac() in HLSL
#define F32Floor()                  fregs[a] = std::floor(fregs[b]);
#define F32Ceil()                   fregs[a] = std::ceil(fregs[b]);
#define F32Sin()                    fregs[a] = std::sin(fregs[b]);
#define F32Cos()                    fregs[a] = std::cos(fregs[b]);
#define F32Abs()                    fregs[a] = std::abs(fregs[b]);
#define F32Sqrt()                   fregs[a] = std::sqrt(fregs[b]);
#define F32Pow()                    fregs[a] = std::pow(fregs[b], fregs[c]);
#define F32Min()                    fregs[a] = fregs[b] < fregs[c] ? fregs[b] : fregs[c];
#define F32Max()                    fregs[a] = fregs[b] < fregs[c] ? fregs[c] : fregs[b];
//
// Cast
//
#define U32ToF32()                  fregs[a] = (float_t)uregs[b];
#define I32ToF32()                  fregs[a] = (float_t)iregs[b];
#define F32ToU32()                  uregs[a] = (uint32_t)fregs[b];
#define F32ToI32()                  iregs[a] = (int32_t)fregs[b];

#define JumpIf()                    pc = iregs[a] != 0 ? pc + 1 /* skip one instruction */: pc /* do nothing (cause next instruction must always be Jump) */;
//
// Flow controls
//
#define Jump()                      pc = a;

// IP: R8G8B8A8 only is suported for now (!)
// a - destination  (always float4)
// b - texture      (input index)
// c - arguments    (int3 uv)
inline void i32TextureLoad(uint32_t* regs, memory_view* iinput, uint32_t a, uint32_t b, uint32_t c, uint32_t d)
{
    float_t* fregs = reinterpret_cast<float_t*>(regs);
    uint32_t* uregs = reinterpret_cast<uint32_t*>(regs);

    uint32_t* layout = iinput[b].As<uint32_t>();
    uint32_t* desc = layout;
    uint32_t* texels = layout + 16;

    uint32_t u = uregs[c];
    uint32_t v = uregs[c + 1];
    uint32_t w = desc[0];
    uint32_t h = desc[1];
    // uint32_t fmt = desc[2];

    uint32_t texel = texels[w * v + u];
    uint8_t iR = texel;
    uint8_t iG = texel >> 8;
    uint8_t iB = texel >> 16;
    uint8_t iA = texel >> 24;

    float_t* value = fregs + a;
    value[0] = float(iR) / 255.f;
    value[1] = float(iG) / 255.f;
    value[2] = float(iB) / 255.f;
    value[3] = float(iA) / 255.f;
}

// ----------------------------
// External Calls
// ----------------------------

template<typename ELEMENT_T>
void AsNativeBase(uint8_t* u8, std::stringstream& dest)
{
    if constexpr (std::is_same<ELEMENT_T, bool>::value)
    {
        bool val = *((bool*)u8);
        dest << (val ? "true" : "false");
    } 
    else 
    { 
        ELEMENT_T val = *((ELEMENT_T*)u8);
        dest << val;
    }
}

template<typename ELEMENT_T>
void AsNativeVector(uint8_t* u8, const BUNDLE_TYPE_T& type, std::stringstream& dest)
{
    dest << "[ ";
    for (int i = 0, n = type.size / sizeof(ELEMENT_T); i < n; ++ i) 
    {
        AsNativeBase<ELEMENT_T>(u8, dest);
        if (i != n - 1) dest << ", ";
        u8 += sizeof(ELEMENT_T);
    }
    dest << " ]";
}

void AsNative(uint8_t* u8, const BUNDLE_TYPE_T& type, std::stringstream& dest)
{
    if (type.name == "bool") AsNativeBase<bool>(u8, dest);
    else if (type.name == "int") AsNativeBase<int32_t>(u8, dest);
    else if (type.name == "uint") AsNativeBase<uint32_t>(u8, dest);
    else if (type.name == "float") AsNativeBase<float>(u8, dest);
    else if (type.name == "uint2") AsNativeVector<uint32_t>(u8, type, dest);
    else if (type.name == "uint3") AsNativeVector<uint32_t>(u8, type, dest);
    else if (type.name == "uint4") AsNativeVector<uint32_t>(u8, type, dest);
    else if (type.name == "int2") AsNativeVector<int32_t>(u8, type, dest);
    else if (type.name == "int3") AsNativeVector<int32_t>(u8, type, dest);
    else if (type.name == "int4") AsNativeVector<int32_t>(u8, type, dest);
    else if (type.name == "float2") AsNativeVector<float>(u8, type, dest);
    else if (type.name == "float3") AsNativeVector<float>(u8, type, dest);
    else if (type.name == "float4") AsNativeVector<float>(u8, type, dest);
    else 
    {
        dest << "*";
    }
}


void AsNative(uint8_t* u8, const BUNDLE_TYPE_T& type, memory_view* iinput, std::stringstream& dest)
{
    if (type.name == "string") {
        dest << ReadString(u8, iinput[CBUFFER0_REGISTER]);
    }
    else 
    {
        AsNative(u8, type, dest);
    }
}

// int trace2() {
//     return 100;
// }

// known as trace() in HLSL
void DebugTrace(const BUNDLE_EXTERN& ex, memory_view* iinput, uint8_t* args, uint8_t* ret) 
{
    std::stringstream ss;
    for (uint32_t i = 0, n = ex.params.size(); i < n; ++ i) 
    {
        auto& p = ex.params[i];
        // constants are required to read strings
        AsNative(args, p, iinput, ss);
        if (i != n - 1) ss << ", ";
        args += p.size;
    }
    std::cout << ss.str() << std::endl;
};


inline void i32ExternalCall(
    const BUNDLE::NCALL_VECTOR_T& ncalls, const BUNDLE::EXTERN_VECTOR_T& externs,
    uint32_t* regs, memory_view* iinput, uint32_t a, uint32_t b, uint32_t c, uint32_t d)
{
    uint8_t* uregs = reinterpret_cast<uint8_t*>(regs);
    
    uint32_t id = a;
    auto& ex = externs[id];
    auto& retT = ex.ret;

    uint32_t retOffset = (b << 2);
    // todo: support out arguments
    uint32_t paramOffset = retOffset;
    uint8_t* ret = uregs + retOffset;
    uint8_t* args = ret + retT.size;

    ncalls[id](ex, iinput, args, ret);
}

// ----------------------------
// ----------------------------

inline void i32LoadInput(uint32_t* regs, memory_view* iinput, uint32_t a, uint32_t b, uint32_t c, uint32_t d)
{
    assert(iinput[a].size > c);
    int32_t* iregs = reinterpret_cast<int32_t*>(regs);
    iregs[b] = iinput[a][c];
}


inline void i32LoadInputPointer(uint32_t* regs, memory_view* iinput, uint32_t a, uint32_t b, uint32_t c, uint32_t d)
{
    int32_t* iregs = reinterpret_cast<int32_t*>(regs);
    assert(iinput[a].size > iregs[c] + d);
    iregs[b] = iinput[a][iregs[c] + d];
}


int BUNDLE::Play()
{
    const INSTRUCTION* ilist = (INSTRUCTION*)m_instructions.data();

    uint32_t  regs[32768]; // {}
    int32_t*  iregs = reinterpret_cast<int32_t*>(regs);
    uint32_t* uregs = reinterpret_cast<uint32_t*>(regs);
    float_t*  fregs = reinterpret_cast<float_t*>(regs);

    memory_view* iinput = m_inputs;
    int pc = 0;

    #define READ_INSTRUCTION() const auto& [ op, a, b, c, d ] = ilist[pc];

    #define PC_INC() pc++
    #define HALT() return iregs[0]

#if defined(__clang__)
    #define LABEL(NAME) k_##NAME
    #define ADD_LABEL(CMD) &&LABEL(CMD),
    static void* dispatchTable[] = {
        COMMANDS(ADD_LABEL)
    };

    #define DISPATCH() goto *dispatchTable[ilist[pc].op]
    #define EXEC_COMMAND(NAME) NAME();

    // perform operation
    #define OP(NAME) {\
        LABEL(NAME):\
            READ_INSTRUCTION();\
            EXEC_COMMAND(NAME);\
            PC_INC();\
            DISPATCH();}
    // flow control
    #define FC(NAME) {\
        LABEL(NAME):\
            READ_INSTRUCTION();\
            EXEC_COMMAND(NAME);\
            DISPATCH();}

    DISPATCH();
    while (1) {
        OPERATIONS(OP);
        FLOW_CONTROLS(FC);
        LABEL(Ret): HALT();
    }
#else
    #define LABEL(NAME) case EOperation::k_##NAME
    // perform operation
    #define OP(NAME) LABEL(NAME): NAME(); break;
    // flow control
    #define FC(NAME) LABEL(NAME): NAME(); continue;

    while (1) {
        READ_INSTRUCTION();
        switch (op) {
            OPERATIONS(OP);
            FLOW_CONTROLS(FC);
            LABEL(Ret): HALT();
            default:
                #if defined(_MSC_VER)
                    __assume(0);
                #else // clang/gcc
                    __builtin_unreachable();
                #endif
        }
        PC_INC();
    }
#endif
    return 0;
}

 

void BUNDLE::Dispatch(BUNDLE_NUMGROUPS numgroups, BUNDLE_NUMTHREADS numthreads) 
{
    const auto [ nGroupX, nGroupY, nGroupZ ] = numgroups;
    const auto [ nThreadX, nThreadY, nThreadZ ] = numthreads;

    int Gid[3]  = { 0, 0, 0 };   // uint3 Gid: SV_GroupID   
    int Gi[1]   = { 0 };         // uint GI: SV_GroupIndex
    int GTid[3] = { 0, 0, 0 };   // uint3 GTid: SV_GroupThreadID
    int DTid[3] = { 0, 0, 0 };   // uint3 DTid: SV_DispatchThreadID

    // TODO: get order from bundle
    const auto SV_GroupID = INPUT0_REGISTER + 0;
    const auto SV_GroupIndex = INPUT0_REGISTER + 1;
    const auto SV_GroupThreadID = INPUT0_REGISTER + 2;
    const auto SV_DispatchThreadID = INPUT0_REGISTER + 3;

    m_inputs[SV_GroupID]            = memory_view((uintptr_t)Gid,  3);
    m_inputs[SV_GroupIndex]         = memory_view((uintptr_t)Gi,   1);
    m_inputs[SV_GroupThreadID]      = memory_view((uintptr_t)GTid, 3);
    m_inputs[SV_DispatchThreadID]   = memory_view((uintptr_t)DTid, 3);

    for (int iGroupZ = 0; iGroupZ < nGroupZ; ++iGroupZ) {
        for (int iGroupY = 0; iGroupY < nGroupY; ++iGroupY) {
            for (int iGroupX = 0; iGroupX < nGroupX; ++iGroupX) {
                Gid[0] = iGroupX;
                Gid[1] = iGroupY;
                Gid[2] = iGroupZ;

                for (int iThreadZ = 0; iThreadZ < nThreadZ; ++iThreadZ) {
                    for (int iThreadY = 0; iThreadY < nThreadY; ++iThreadY) {
                        for (int iThreadX = 0; iThreadX < nThreadX; ++iThreadX) {
                            GTid[0] = iThreadX;
                            GTid[1] = iThreadY;
                            GTid[2] = iThreadZ;

                            DTid[0] = iGroupX * nThreadX + iThreadX;
                            DTid[1] = iGroupY * nThreadY + iThreadY;
                            DTid[2] = iGroupZ * nThreadZ + iThreadZ;

                            Gi[0] = iThreadZ * nThreadX * nThreadY + iThreadY * nThreadX + iThreadX;

                            Play();
                        }
                    }
                }
            }
        }
    }
}
    

void BUNDLE::SetInput(int slot, memory_view input) 
{
    m_inputs[slot] = input;
}

memory_view BUNDLE::GetInput(int slot) const
{
    return m_inputs[slot];
}

bool BUNDLE::SetConstant(std::string name, memory_view value) {
    // hidden way to set constants memory
    SetInput(CBUFFER0_REGISTER, memory_view((uintptr_t)m_constants.data(), (uint32_t)m_constants.size()));

    auto reflectionIter = find_if(begin(m_layout), end(m_layout), [&name](const BUNDLE_CONSTANT& x) { return x.name == name;});
    const auto& constants = GetInput(CBUFFER0_REGISTER);
    if (reflectionIter == m_layout.end()) {
        return false;
    }
    
    const BUNDLE_CONSTANT& reflection = *reflectionIter;
    int offset = reflection.offset;
    // only float is supported for now
    if (reflection.type == "float") *((float_t*)(constants.As<uint8_t>() + offset)) = *value.As<float>();
    if (reflection.type == "int")   *((int32_t*)(constants.As<uint8_t>() + offset)) = *value.As<int32_t>();
    if (reflection.type == "uint")  *((uint32_t*)(constants.As<uint8_t>() + offset)) = *value.As<uint32_t>();

    if (reflection.type == "float3") 
    {
        auto* dst = constants.As<uint8_t>() + offset;
        auto* src = value.As<uint8_t>();
        std::memcpy((void*)dst, (void*)src, sizeof(float) * 3);
    }

    if (reflection.type == "float4") 
    {
        auto* dst = constants.As<uint8_t>() + offset;
        auto* src = value.As<uint8_t>();
        std::memcpy((void*)dst, (void*)src, sizeof(float) * 4);
    }

    return true;
}



const BUNDLE::CONSTANT_VECTOR_T& BUNDLE::GetLayout() const
{
    return m_layout;
}

const BUNDLE::EXTERN_VECTOR_T& BUNDLE::GetExterns() const
{
    return m_externs;
}

// const BUNDLE_EXTERN* BUNDLE::GetExtern(std::string name) const
// {
//     auto iter = std::find_if(m_externs.begin(), m_externs.end(), 
//         [&name](const BUNDLE_EXTERN& ex) { return ex.name == name;});
//     if (iter == m_externs.end()) {
//         return nullptr;
//     }
//     return &(*iter);
// }
 
BUNDLE_UAV BUNDLE::CreateUAV(std::string name, uint32_t elementSize, uint32_t length, uint32_t reg)
{
    uint32_t counterSize = 4;                           // 4 bytes
    uint32_t size = counterSize + length * elementSize; // in bytes
    uint32_t index = UAV0_REGISTER + reg;
    
    assert((size % 4) == 0);
    uint32_t n = size >> 2;
    uint32_t* range = new uint32_t[n](); // zeroed
    memory_view buffer = memory_view((uintptr_t)range, n);
    memory_view data = memory_view((uintptr_t)(range + 1), n - 1);
    memory_view counter = memory_view((uintptr_t)range, 1);
    BUNDLE_UAV uav { name, elementSize, length, reg, data, buffer, index };
    // uav.minidump();
    return uav;
}

void BUNDLE::DestroyUAV(BUNDLE_UAV uav)
{
    delete[] uav.buffer.As<uint32_t>();
}

RESOURCE_VIEW BUNDLE::CreateBufferView(std::string name, uint32_t reg)
{
    return {name, reg, reg + SRV0_REGISTER};
}

RESOURCE_VIEW BUNDLE::CreateTextureView(std::string name, uint32_t reg)
{
    return {name, reg, reg + SRV0_REGISTER};
}


void BUNDLE::Load(memory_view data)
{
    std::map<int, memory_view> chunks;
    
    DecodeChunks(data.As<uint8_t>(), data.ByteLength(), chunks);

    memory_view codeChunk = chunks[CHUNK_TYPES::CODE];
    memory_view constChunk = chunks[CHUNK_TYPES::CONSTANTS];
    memory_view layoutChunk = chunks[CHUNK_TYPES::LAYOUT];
    memory_view externsChunk = chunks[CHUNK_TYPES::EXTERNS];
    
    DecodeLayoutChunk(layoutChunk.As<uint8_t>(), m_layout);
    DecodeExternsChunk(externsChunk.As<uint8_t>(), m_externs);

    m_instructions.assign(codeChunk.Begin<uint32_t>(), codeChunk.End<uint32_t>());
    m_constants.assign(constChunk.Begin<uint32_t>(), constChunk.End<uint32_t>());

    auto undefFn = [&](const BUNDLE_EXTERN& ex, memory_view* iinput, uint8_t* args, uint8_t* ret) -> void {
        std::cout << "[ERROR] external call <" << ex.name << "()> is not defined" << std::endl;
    };

    m_ncalls.resize(m_externs.size(), undefFn);

    for (auto& ex : m_externs) 
    {
        if (ex.name == "trace") 
            SetExtern(ex.id, DebugTrace);
        // if (ex.name == "trace2") 
        //     SetExtern(ex.id, trace2);
    }

    // std::cout << "======" << std::endl;
}

}
