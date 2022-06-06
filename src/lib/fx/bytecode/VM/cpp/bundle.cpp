#pragma once

#include <stdio.h>
#include <iostream>
#include <emscripten/bind.h>
#include <algorithm>

#include "bundle.h"

// @lib/idl/bytecode
#define export // hack to include enum from ts
#include "../../../../idl/bytecode/EOperations.ts"

using namespace emscripten; 
using namespace std;


void decodeChunks(uint8_t* data, uint32_t byteLength, map<int, u32_array_t>& chunks) 
{
    int type = *((uint32_t*)data);
    uint32_t contentByteLength = *((uint32_t*)(data + 4)) << 2;
    uint8_t* content = data + 8;

    chunks[type] = { (uintptr_t)content, contentByteLength >> 2 };

    uint8_t* nextChunk = content + contentByteLength;
    if (contentByteLength < byteLength - 8) {
        decodeChunks(nextChunk, byteLength - 8 - contentByteLength, chunks);
    }
}

void decodeLayoutChunk(uint8_t* layoutChunk, vector<BUNDLE_CONSTANT>& layout) {
    uint32_t count = *((uint32_t*)layoutChunk);
    layoutChunk += 4;

    for (uint32_t i = 0; i < count; ++i) {
        uint32_t nameLength = *((uint32_t*)layoutChunk);
        layoutChunk += 4;
        string name((const char*)layoutChunk, nameLength);
        layoutChunk += nameLength;

        uint32_t typeLength = *((uint32_t*)layoutChunk);
        layoutChunk += 4;
        string type((const char*)layoutChunk, typeLength);
        layoutChunk += typeLength;

        uint32_t semanticLength = *((uint32_t*)layoutChunk);
        layoutChunk += 4;
        string semantic((const char*)layoutChunk, semanticLength);
        layoutChunk += semanticLength;

        uint32_t offset = *((uint32_t*)layoutChunk);
        layoutChunk += 4;
        uint32_t size = *((uint32_t*)layoutChunk);
        layoutChunk += 4;
        
        layout.push_back({ name, size, offset, semantic, type }); 
    }
} 

static vector<uint32_t> regs(512 * 4 * 4, 0);


BUNDLE::BUNDLE(string debugName, u32_array_t data): m_debugName(debugName)
{
    load(data);
}

BUNDLE::BUNDLE() {}

u32_array_t BUNDLE::play()
{
    constexpr int STRIDE = 5;

    uint32_t* ilist = m_instructions.data();
    uint32_t length = m_instructions.size();

    int32_t*  iregs = (int32_t*)regs.data();
    uint32_t* uregs = (uint32_t*)regs.data();
    float_t*  fregs = (float_t*)regs.data();

    u32_array_t* iinput = m_inputs;

    int i5 = 0;                      // current instruction;

    while (i5 < length) {
        auto op = ilist[i5];
        auto a = ilist[i5 + 1];
        auto b = ilist[i5 + 2];
        auto c = ilist[i5 + 3];
        auto d = ilist[i5 + 4];
        
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

            case EOperation::k_I32Mad:
                iregs[a] = iregs[b] + iregs[c] * iregs[d];
                break;
            
            case EOperation::k_I32Min:
                iregs[a] = min(iregs[b], iregs[c]);
                break;
            case EOperation::k_I32Max:
                iregs[a] = max(iregs[b], iregs[c]);
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


            //
            // Relational operations
            //

            case EOperation::k_U32LessThan:
                iregs[a] = +(uregs[b] < uregs[c]);
                break;
            case EOperation::k_U32GreaterThanEqual:
                iregs[a] = +(uregs[b] >= uregs[c]);
                break;
            case EOperation::k_I32LessThan:
                iregs[a] = +(iregs[b] < iregs[c]);
                break;
            case EOperation::k_I32GreaterThanEqual:
                iregs[a] = +(iregs[b] >= iregs[c]);
                break;
            case EOperation::k_I32Equal:
                iregs[a] = +(iregs[b] == iregs[c]);
                break;
            case EOperation::k_I32NotEqual:
                iregs[a] = +(iregs[b] != iregs[c]);
                break;
            case EOperation::k_I32Not:
                iregs[a] = +(!iregs[b]);
                break;

            case EOperation::k_F32LessThan:
                fregs[a] = +(fregs[b] < fregs[c]);
                break;
            case EOperation::k_F32GreaterThanEqual:
                fregs[a] = +(fregs[b] >= fregs[c]);
                break;

            //
            // Logical operations
            //


            case EOperation::k_I32LogicalOr:
                iregs[a] = +(iregs[b] || iregs[c]);
                break;
            case EOperation::k_I32LogicalAnd:
                iregs[a] = +(iregs[b] && iregs[c]);
                break;

            //
            // intrinsics
            //

            case EOperation::k_F32Frac:
                // same as frac() in HLSL
                fregs[a] = fregs[b] - floor(fregs[b]);
                break;
            case EOperation::k_F32Floor:
                fregs[a] = floor(fregs[b]);
                break;
            case EOperation::k_F32Ceil:
                fregs[a] = ceil(fregs[b]);
                break;

            case EOperation::k_F32Sin:
                fregs[a] = sin(fregs[b]);
                break;
            case EOperation::k_F32Cos:
                fregs[a] = cos(fregs[b]);
                break;

            case EOperation::k_F32Abs:
                fregs[a] = abs(fregs[b]);
                break;
            case EOperation::k_F32Sqrt:
                fregs[a] = sqrt(fregs[b]);
                break;
            case EOperation::k_F32Min:
                fregs[a] = min(fregs[b], fregs[c]);
                break;
            case EOperation::k_F32Max:
                fregs[a] = max(fregs[b], fregs[c]);
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
                // TODO: don't use multiplication here
                i5 = a;
                continue;
            case EOperation::k_JumpIf:
                i5 = iregs[a] != 0
                    ? i5 + STRIDE                   /* skip one instruction */
                    : i5;                           /* do nothing (cause next instruction must always be Jump) */
                break;
            case EOperation::k_Ret:
                {
                    goto end;
                }
                break;
            default:
                cout << m_debugName << " :: unknown operation found: " << op << ", addr: " << (ilist + i5) << endl;
        }
        i5 += STRIDE;
    }
    end:
    return { (uintptr_t)regs.data(), regs.size() };
}


void BUNDLE::dispatch(BUNDLE_NUMGROUPS numgroups, BUNDLE_NUMTHREADS numthreads) 
{
    const auto [ nGroupX, nGroupY, nGroupZ ] = numgroups;
    const auto [ nThreadX, nThreadY, nThreadZ ] = numthreads;

    static vector<int> Gid  (3, 0);     // uint3 Gid: SV_GroupID    
    static vector<int> Gi   (1, 0);      // uint GI: SV_GroupIndex
    static vector<int> GTid (3, 0);    // uint3 GTid: SV_GroupThreadID
    static vector<int> DTid (3, 0);    // uint3 DTid: SV_DispatchThreadID

    // TODO: get order from bundle
    const auto SV_GroupID = INPUT0_REGISTER + 0;
    const auto SV_GroupIndex = INPUT0_REGISTER + 1;
    const auto SV_GroupThreadID = INPUT0_REGISTER + 2;
    const auto SV_DispatchThreadID = INPUT0_REGISTER + 3;

    m_inputs[SV_GroupID] = { (uintptr_t)Gid.data(), (uint32_t)Gid.size() } ;
    m_inputs[SV_GroupIndex] = { (uintptr_t)Gi.data(), (uint32_t)Gi.size() } ;;
    m_inputs[SV_GroupThreadID] = { (uintptr_t)GTid.data(), (uint32_t)GTid.size() } ;
    m_inputs[SV_DispatchThreadID] = { (uintptr_t)DTid.data(), (uint32_t)DTid.size() } ;

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

                            play();
                        }
                    }
                }
            }
        }
    }
}
    

void BUNDLE::setInput(int slot, u32_array_t input) {
    m_inputs[slot] = input;
}

u32_array_t BUNDLE::getInput(int slot)
{
    return m_inputs[slot];
}

bool BUNDLE::setConstant(string name, float value) {
    auto reflectionIter = find_if(begin(m_layout), end(m_layout), [&name](const BUNDLE_CONSTANT& x) { return x.name == name;});
    const auto& constants = m_inputs[CBUFFER0_REGISTER];

    if (reflectionIter == m_layout.end()) {
        return false;
    }

    const BUNDLE_CONSTANT& reflection = *reflectionIter;

    int offset = reflection.offset;

    if (reflection.type == "float") *((float_t*)(((uint8_t*)constants.ptr) + offset)) = (float_t)value;
    if (reflection.type == "int")   *((int32_t*)(((uint8_t*)constants.ptr) + offset)) = (int32_t)value;
    if (reflection.type == "uint")  *((uint32_t*)(((uint8_t*)constants.ptr) + offset)) = (uint32_t)value;
    
    return true;
}

const vector<BUNDLE_CONSTANT>& BUNDLE::getLayout() 
{
    return m_layout;
}

void BUNDLE::resetRegisters()
{
    memset(regs.data(), 0, regs.size() * sizeof(decltype(regs)::value_type));
}

BUNDLE_UAV BUNDLE::createUAV(string name, uint32_t elementSize, uint32_t length, uint32_t reg)
{
    uint32_t counterSize = 4;                           // 4 bytes
    uint32_t size = counterSize + length * elementSize; // in bytes
    uint32_t index = UAV0_REGISTER + reg;
    uint32_t n = (size + 3) >> 2;

    u32_array_t memory = { (uintptr_t)(new uint32_t[n]), n };
    u32_array_t data = { (uintptr_t)(((uint32_t*)memory.ptr) + 1), n - 1 };
    u32_array_t counter = { memory.ptr, 1 };

    *((uint32_t*)counter.ptr) = 0;
    //memset((void*)memory.ptr, 0, size);

    return { name, elementSize, length, reg, data, memory, index };
}

void BUNDLE::destroyUAV(BUNDLE_UAV uav)
{
    delete[] ((uint32_t*)uav.buffer.ptr);
}


void BUNDLE::load(u32_array_t data)
{
    map<int, u32_array_t> chunks;
    
    decodeChunks((uint8_t*)data.ptr, /*byteLength (!)*/data.size << 2, chunks);

    u32_array_t codeChunk = chunks[CHUNK_TYPES::CODE];
    u32_array_t constChunk = chunks[CHUNK_TYPES::CONSTANTS];
    u32_array_t layoutChunk = chunks[CHUNK_TYPES::LAYOUT];
    
    decodeLayoutChunk((uint8_t*)layoutChunk.ptr, m_layout);

    m_instructions.assign(begin(codeChunk), end(codeChunk));

    m_constants.assign(begin(constChunk), end(constChunk));
    m_inputs[CBUFFER0_REGISTER] = { (uintptr_t)m_constants.data(), (uint32_t)m_constants.size() };
}
 

EMSCRIPTEN_BINDINGS(bundle)
{ 
    value_object<u32_array_t>("Memory")
        .field("heap", &u32_array_t::ptr)
        .field("size", &u32_array_t::size);
    value_object<BUNDLE_NUMGROUPS>("Numgroups")
        .field("x", &BUNDLE_NUMGROUPS::x)
        .field("y", &BUNDLE_NUMGROUPS::y)
        .field("z", &BUNDLE_NUMGROUPS::z);
    value_object<BUNDLE_NUMTHREADS>("Numthreads")
        .field("x", &BUNDLE_NUMTHREADS::x)
        .field("y", &BUNDLE_NUMTHREADS::y)
        .field("z", &BUNDLE_NUMTHREADS::z);
    value_object<BUNDLE_CONSTANT>("Constant")
        .field("name", &BUNDLE_CONSTANT::name)
        .field("size", &BUNDLE_CONSTANT::size)
        .field("offset", &BUNDLE_CONSTANT::offset)
        .field("semantic", &BUNDLE_CONSTANT::semantic)
        .field("type", &BUNDLE_CONSTANT::type);
    value_object<BUNDLE_UAV>("Uav")
        .field("name", &BUNDLE_UAV::name)
        .field("elementSize", &BUNDLE_UAV::elementSize)
        .field("length", &BUNDLE_UAV::length)
        .field("register", &BUNDLE_UAV::reg)
        .field("data", &BUNDLE_UAV::data)
        .field("buffer", &BUNDLE_UAV::buffer)
        .field("index", &BUNDLE_UAV::index);
    class_<BUNDLE>("Bundle")
        .constructor<string, u32_array_t>()
        // .function("play", optional_override([](BUNDLE& self) {
        //     u32_array_t result = self.BUNDLE::play();
        //     return emscripten::val(emscripten::typed_memory_view(result.size * 4, (char*)result.ptr));
        // }))
        .function("play", &BUNDLE::play)
        .function("dispatch", &BUNDLE::dispatch)
        .function("getInput", &BUNDLE::getInput)
        .function("setConstant", &BUNDLE::setConstant)
        .function("setInput", &BUNDLE::setInput)
        .function("getLayout", &BUNDLE::getLayout)
        .class_function("createUAV", &BUNDLE::createUAV)
        .class_function("destroyUAV", &BUNDLE::destroyUAV)
        .class_function("resetRegisters", &BUNDLE::resetRegisters);

    register_vector<BUNDLE_CONSTANT>("vector<BUNDLE_CONSTANT>");
}
