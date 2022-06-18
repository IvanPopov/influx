#pragma once

#include <stdio.h>
#include <iostream>
#include <emscripten/bind.h>
#include <algorithm>

#include "bundle.h"

// @lib/idl/bytecode
#define export // hack to include enum from ts
#include "../../../../idl/bytecode/EOperations.ts"

namespace em = emscripten;

void decodeChunks(uint8_t* data, uint32_t byteLength, std::map<int, memory_view>& chunks) 
{
    int type = *((uint32_t*)data);
    uint32_t contentByteLength = *((uint32_t*)(data + 4)) << 2;
    uint8_t* content = data + 8;

    chunks[type] = memory_view((uintptr_t)content, contentByteLength >> 2);

    uint8_t* nextChunk = content + contentByteLength;
    if (contentByteLength < byteLength - 8) {
        decodeChunks(nextChunk, byteLength - 8 - contentByteLength, chunks);
    } 
}

void decodeLayoutChunk(uint8_t* layoutChunk, std::vector<BUNDLE_CONSTANT>& layout) {
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

static std::vector<uint32_t> regs(512 * 4 * 4, 0);


BUNDLE::BUNDLE(std::string debugName, memory_view data): m_debugName(debugName)
{
    load(data);
}

BUNDLE::BUNDLE() {} 

memory_view BUNDLE::play()
{
    constexpr int STRIDE = 5;
 
    uint32_t* ilist = m_instructions.data();
    uint32_t length = m_instructions.size();

    int32_t*  iregs = (int32_t*)regs.data();
    uint32_t* uregs = (uint32_t*)regs.data();
    float_t*  fregs = (float_t*)regs.data();

    assert(m_inputs[CBUFFER0_REGISTER].ptr == (uintptr_t)m_constants.data());

    memory_view* iinput = m_inputs;

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
                assert(iinput[a].size > (iregs[c] + d));
                iregs[b] = iinput[a][iregs[c] + d];
                break;
            case EOperation::k_I32StoreInputPointer:
                assert(iinput[a].size > (iregs[b] + d));
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
                iregs[a] = std::min(iregs[b], iregs[c]);
                break;
            case EOperation::k_I32Max:
                iregs[a] = std::max(iregs[b], iregs[c]);
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
                fregs[a] = std::min(fregs[b], fregs[c]);
                break;
            case EOperation::k_F32Max:
                fregs[a] = std::max(fregs[b], fregs[c]);
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
                std::cout << m_debugName << " :: unknown operation found: " << op << ", addr: " << (ilist + i5) << std::endl;
        }
        i5 += STRIDE;
    }
    end:
    return memory_view((uintptr_t)regs.data(), regs.size());
}


// template <typename T>
// std::vector<T> vecFromJSArray(const em::val &v)
// {
//     std::vector<T> rv;

//     const auto l = v["length"].as<unsigned>();
//     rv.resize(l);

//     em::val memoryView{ em::typed_memory_view(l, rv.data()) };
//     memoryView.call<void>("set", v);

//     return rv;
// }  

void BUNDLE::dispatch(BUNDLE_NUMGROUPS numgroups, BUNDLE_NUMTHREADS numthreads) 
{
    const auto [ nGroupX, nGroupY, nGroupZ ] = numgroups;
    const auto [ nThreadX, nThreadY, nThreadZ ] = numthreads;

    static std::vector<int> Gid  (3, 0);    // uint3 Gid: SV_GroupID    
    static std::vector<int> Gi   (1, 0);    // uint GI: SV_GroupIndex
    static std::vector<int> GTid (3, 0);    // uint3 GTid: SV_GroupThreadID
    static std::vector<int> DTid (3, 0);    // uint3 DTid: SV_DispatchThreadID

    // TODO: get order from bundle
    const auto SV_GroupID = INPUT0_REGISTER + 0;
    const auto SV_GroupIndex = INPUT0_REGISTER + 1;
    const auto SV_GroupThreadID = INPUT0_REGISTER + 2;
    const auto SV_DispatchThreadID = INPUT0_REGISTER + 3;

    m_inputs[SV_GroupID] = memory_view((uintptr_t)Gid.data(), (uint32_t)Gid.size());
    m_inputs[SV_GroupIndex] = memory_view((uintptr_t)Gi.data(), (uint32_t)Gi.size());
    m_inputs[SV_GroupThreadID] = memory_view((uintptr_t)GTid.data(), (uint32_t)GTid.size());
    m_inputs[SV_DispatchThreadID] = memory_view((uintptr_t)DTid.data(), (uint32_t)DTid.size());

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
    

void BUNDLE::setInput(int slot, memory_view input) {
    m_inputs[slot] = input;
}

memory_view BUNDLE::getInput(int slot) 
{
    return m_inputs[slot];
}

bool BUNDLE::setConstant(std::string name, float value) {
    auto reflectionIter = find_if(begin(m_layout), end(m_layout), [&name](const BUNDLE_CONSTANT& x) { return x.name == name;});
    const auto& constants = m_inputs[CBUFFER0_REGISTER];
    if (reflectionIter == m_layout.end()) {
        return false;
    }

    const BUNDLE_CONSTANT& reflection = *reflectionIter;
    int offset = reflection.offset;
    // only float is supported for now
    assert(reflection.type == "float");
    if (reflection.type == "float") *((float_t*)(constants.as<uint8_t>() + offset)) = (float_t)value;
    if (reflection.type == "int")   *((int32_t*)(constants.as<uint8_t>() + offset)) = (int32_t)value;
    if (reflection.type == "uint")  *((uint32_t*)(constants.as<uint8_t>() + offset)) = (uint32_t)value;
    return true;
}

const std::vector<BUNDLE_CONSTANT>& BUNDLE::getLayout() const
{
    return m_layout;
}

void BUNDLE::resetRegisters()
{
    memset(regs.data(), 0, regs.size() * sizeof(decltype(regs)::value_type));
}
 
BUNDLE_UAV BUNDLE::createUAV(std::string name, uint32_t elementSize, uint32_t length, uint32_t reg)
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

void BUNDLE::destroyUAV(BUNDLE_UAV uav)
{
    delete[] uav.buffer.as<uint32_t>();
}

void BUNDLE::load(memory_view data)
{
    std::map<int, memory_view> chunks;
    
    decodeChunks(data.as<uint8_t>(), data.byteLength(), chunks);

    memory_view codeChunk = chunks[CHUNK_TYPES::CODE];
    memory_view constChunk = chunks[CHUNK_TYPES::CONSTANTS];
    memory_view layoutChunk = chunks[CHUNK_TYPES::LAYOUT];
    
    decodeLayoutChunk(layoutChunk.as<uint8_t>(), m_layout);

    m_instructions.assign(codeChunk.begin<uint32_t>(), codeChunk.end<uint32_t>());
    m_constants.assign(constChunk.begin<uint32_t>(), constChunk.end<uint32_t>());
    m_inputs[CBUFFER0_REGISTER] = memory_view((uintptr_t)m_constants.data(), (uint32_t)m_constants.size());
}
 

EMSCRIPTEN_BINDINGS(bundle)
{ 
    em::value_object<memory_view>("Memory")
        .field("heap", &memory_view::ptr) 
        .field("size", &memory_view::size);
    em::value_object<BUNDLE_NUMGROUPS>("Numgroups")
        .field("x", &BUNDLE_NUMGROUPS::x)
        .field("y", &BUNDLE_NUMGROUPS::y)
        .field("z", &BUNDLE_NUMGROUPS::z);
    em::value_object<BUNDLE_NUMTHREADS>("Numthreads")
        .field("x", &BUNDLE_NUMTHREADS::x)
        .field("y", &BUNDLE_NUMTHREADS::y)
        .field("z", &BUNDLE_NUMTHREADS::z);
    em::value_object<BUNDLE_CONSTANT>("Constant")
        .field("name", &BUNDLE_CONSTANT::name)
        .field("size", &BUNDLE_CONSTANT::size)
        .field("offset", &BUNDLE_CONSTANT::offset) 
        .field("semantic", &BUNDLE_CONSTANT::semantic)
        .field("type", &BUNDLE_CONSTANT::type);
    em::value_object<BUNDLE_UAV>("Uav")
        .field("name", &BUNDLE_UAV::name) 
        .field("elementSize", &BUNDLE_UAV::elementSize) 
        .field("length", &BUNDLE_UAV::length)
        .field("register", &BUNDLE_UAV::reg)
        .field("data", &BUNDLE_UAV::data)
        .field("buffer", &BUNDLE_UAV::buffer)
        .field("index", &BUNDLE_UAV::index);

    em::register_vector<BUNDLE_CONSTANT>("vector<BUNDLE_CONSTANT>");

    em::class_<BUNDLE>("Bundle")
        .constructor<std::string, memory_view>()
        // .function("play", optional_override([](BUNDLE& self) {
        //     memory_view result = self.BUNDLE::play();
        //     return em::val(em::typed_memory_view(result.size * 4, (char*)result.ptr));
        // }))
        .function("play", &BUNDLE::play)
        .function("dispatch", &BUNDLE::dispatch)
        .function("getInput", &BUNDLE::getInput)
        .function("setConstant", &BUNDLE::setConstant)
        .function("setInput", &BUNDLE::setInput)
        // .function("getLayout", &BUNDLE::getLayout)
        .function("getLayout", em::optional_override([](BUNDLE& self) {
            return em::val::array(self.BUNDLE::getLayout());
          }))
        .class_function("createUAV", &BUNDLE::createUAV)
        .class_function("destroyUAV", &BUNDLE::destroyUAV) 
        .class_function("resetRegisters", &BUNDLE::resetRegisters);
}
