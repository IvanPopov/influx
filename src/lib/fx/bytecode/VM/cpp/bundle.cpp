#include <stdio.h>
#include <iostream>
#include <algorithm>
#include <cmath>
#include <map>

#include "bundle.h"

#pragma warning(disable:4244)

// @lib/idl/bytecode
#define export // hack to include enum from ts
#include "../../../../idl/bytecode/EOperations.ts"

namespace VM
{

const int CBUFFER0_REGISTER = 0;
const int INPUT0_REGISTER = 1;
const int UAV0_REGISTER = 17;

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

void DecodeLayoutChunk(uint8_t* layoutChunk, std::vector<BUNDLE_CONSTANT>& layout) {
    uint32_t count = *((uint32_t*)layoutChunk);
    layoutChunk += 4;

    for (uint32_t i = 0; i < count; ++i) {
        uint32_t nameLength = *((uint32_t*)layoutChunk);
        layoutChunk += 4;
        std::string name((const char*)layoutChunk, nameLength);
        layoutChunk += nameLength;

        uint32_t typeLength = *((uint32_t*)layoutChunk);
        layoutChunk += 4;
        std::string type((const char*)layoutChunk, typeLength);
        layoutChunk += typeLength;

        uint32_t semanticLength = *((uint32_t*)layoutChunk);
        layoutChunk += 4;
        std::string semantic((const char*)layoutChunk, semanticLength);
        layoutChunk += semanticLength;

        uint32_t offset = *((uint32_t*)layoutChunk);
        layoutChunk += 4;
        uint32_t size = *((uint32_t*)layoutChunk);
        layoutChunk += 4;
        
        layout.push_back({ name, size, offset, semantic, type }); 
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

memory_view BUNDLE::Play()
{
    const INSTRUCTION* ilist = (INSTRUCTION*)m_instructions.data();

    uint32_t  regs[8192]; // {}
    int32_t*  iregs = reinterpret_cast<int32_t*>(regs);
    uint32_t* uregs = reinterpret_cast<uint32_t*>(regs);
    float_t*  fregs = reinterpret_cast<float_t*>(regs);

    memory_view* iinput = m_inputs;

    int pc = 0;
    while (1) {
        const auto& [ op, a, b, c, d ] = ilist[pc];
        
        switch (op) {
            // registers
            case EOperation::k_I32SetConst:
                iregs[a] =  *((int*)&b);
                break;
            case EOperation::k_I32LoadRegister:
                iregs[a] = iregs[b];
                break;
            // inputs
            case EOperation::k_I32LoadInput:
                iregs[b] = iinput[a][c];
                break;
            case EOperation::k_I32StoreInput:
                iinput[a][b] = iregs[c];
                break;
            // registers pointers    
            // a => dest
            // b => source pointer
            // c => offset
            case EOperation::k_I32LoadRegistersPointer:
                iregs[a] = iregs[iregs[b] + c];
                break;
            case EOperation::k_I32StoreRegisterPointer:
                iregs[iregs[a] + c] = iregs[b];
                break;
            // input pointers
            // a => input index
            // b => dest
            // c => source pointer
            // d => offset
            case EOperation::k_I32LoadInputPointer:
                iregs[b] = iinput[a][iregs[c] + d];
                break;
            case EOperation::k_I32StoreInputPointer:
                iinput[a][iregs[b] + d] = iregs[c];
                break;

            //
            // Arithmetic operations
            //

            case EOperation::k_I32Add:
                iregs[a] = iregs[b] + iregs[c];
                break;
            case EOperation::k_I32Sub:
                iregs[a] = iregs[b] - iregs[c];
                break;
            case EOperation::k_I32Mul:
                iregs[a] = iregs[b] * iregs[c];
                break;
            case EOperation::k_I32Div:
                iregs[a] = iregs[b] / iregs[c];
                break;
            case EOperation::k_I32Mod:
                // IP: temp hack to avoid runtine error
                iregs[a] = iregs[c] != 0 ? iregs[b] % iregs[c] : 0;
                break;
            
            case EOperation::k_I32Mad:
                iregs[a] = iregs[b] + iregs[c] * iregs[d];
                break;
            
            case EOperation::k_I32Min:
                iregs[a] = iregs[b] < iregs[c] ? iregs[b] : iregs[c];
                break;
            case EOperation::k_I32Max:
                iregs[a] = iregs[b] < iregs[c] ? iregs[c] : iregs[b];
                break;

            case EOperation::k_F32Add:
                fregs[a] = fregs[b] + fregs[c];
                break;
            case EOperation::k_F32Sub:
                fregs[a] = fregs[b] - fregs[c];
                break;
            case EOperation::k_F32Mul:
                fregs[a] = fregs[b] * fregs[c];
                break;
            case EOperation::k_F32Div:
                fregs[a] = fregs[b] / fregs[c];
                break;
            case EOperation::k_F32Mod:
                fregs[a] = std::fmod(fregs[b], fregs[c]);
                break;


            //
            // Relational operations
            //

            case EOperation::k_U32LessThan:
                iregs[a] = uregs[b] < uregs[c];
                break;
            case EOperation::k_U32GreaterThanEqual:
                iregs[a] = uregs[b] >= uregs[c];
                break;
            case EOperation::k_I32LessThan:
                iregs[a] = iregs[b] < iregs[c];
                break;
            case EOperation::k_I32GreaterThanEqual:
                iregs[a] = iregs[b] >= iregs[c];
                break;
            case EOperation::k_I32Equal:
                iregs[a] = iregs[b] == iregs[c];
                break;
            case EOperation::k_I32NotEqual:
                iregs[a] = iregs[b] != iregs[c];
                break;
            case EOperation::k_I32Not:
                iregs[a] = !iregs[b];
                break;

            case EOperation::k_F32LessThan:
                fregs[a] = fregs[b] < fregs[c];
                break;
            case EOperation::k_F32GreaterThanEqual:
                fregs[a] = fregs[b] >= fregs[c];
                break;

            //
            // Logical operations
            //


            case EOperation::k_I32LogicalOr:
                iregs[a] = iregs[b] || iregs[c];
                break;
            case EOperation::k_I32LogicalAnd:
                iregs[a] = iregs[b] && iregs[c];
                break;

            //
            // intrinsics
            //

            case EOperation::k_F32Frac:
                // same as frac() in HLSL
                fregs[a] = fregs[b] - std::floor(fregs[b]);
                break;
            case EOperation::k_F32Floor:
                fregs[a] = std::floor(fregs[b]);
                break;
            case EOperation::k_F32Ceil:
                fregs[a] = std::ceil(fregs[b]);
                break;

            case EOperation::k_F32Sin:
                fregs[a] = std::sin(fregs[b]);
                break;
            case EOperation::k_F32Cos:
                fregs[a] = std::cos(fregs[b]);
                break;

            case EOperation::k_F32Abs:
                fregs[a] = std::abs(fregs[b]);
                break;
            case EOperation::k_F32Sqrt:
                fregs[a] = std::sqrt(fregs[b]);
                break;
            case EOperation::k_F32Min:
                fregs[a] = fregs[b] < fregs[c] ? fregs[b] : fregs[c];
                break;
            case EOperation::k_F32Max:
                fregs[a] = fregs[b] < fregs[c] ? fregs[c] : fregs[b];
                break;

            //
            // Cast
            //


            case EOperation::k_U32ToF32:
                fregs[a] = (float_t)uregs[b];
                break;
            case EOperation::k_I32ToF32:
                fregs[a] = (float_t)iregs[b];
                break;
            case EOperation::k_F32ToU32:
                uregs[a] = (uint32_t)fregs[b];
                break;
            case EOperation::k_F32ToI32:
                iregs[a] = (int32_t)fregs[b];
                break;

            //
            // Flow controls
            //

            case EOperation::k_Jump:
                pc = a;
                continue;
            case EOperation::k_JumpIf:
                pc = iregs[a] != 0
                    ? pc + 1                         /* skip one instruction */
                    : pc;                           /* do nothing (cause next instruction must always be Jump) */
                break;
            case EOperation::k_Ret:
                {
                    goto end;
                }
                break;
            default:
                std::cout << m_debugName << " :: unknown operation found: " << op << ", addr: " << (ilist + pc) << std::endl;
        }
        pc ++;
    }
    end:
    return memory_view((uintptr_t)regs, sizeof(regs) / sizeof(regs[0]));
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
    

void BUNDLE::SetInput(int slot, memory_view input) {
    m_inputs[slot] = input;
}

memory_view BUNDLE::GetInput(int slot) 
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

    return true;
}

const std::vector<BUNDLE_CONSTANT>& BUNDLE::GetLayout() const
{
    return m_layout;
}


 
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

void BUNDLE::Load(memory_view data)
{
    std::map<int, memory_view> chunks;
    
    DecodeChunks(data.As<uint8_t>(), data.ByteLength(), chunks);

    memory_view codeChunk = chunks[CHUNK_TYPES::CODE];
    memory_view constChunk = chunks[CHUNK_TYPES::CONSTANTS];
    memory_view layoutChunk = chunks[CHUNK_TYPES::LAYOUT];
    
    DecodeLayoutChunk(layoutChunk.As<uint8_t>(), m_layout);

    m_instructions.assign(codeChunk.Begin<uint32_t>(), codeChunk.End<uint32_t>());
    m_constants.assign(constChunk.Begin<uint32_t>(), constChunk.End<uint32_t>());
}

}
