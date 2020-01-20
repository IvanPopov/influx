#ifndef SYSTEM_FX
#define SYSTEM_FX

// make sure the define scaner finds it
#if defined(_AP_PC)
#endif

#if defined(_API_DX11)
   #if defined(_AP_PC) || defined(_AP_DURANGO)
   
      #define EQUAL(x, y) (x == y)
      #define NOT_EQUAL(x, y) (x != y)
      #define LESS_THAN(x, y) (x < y)
      #define LESS_OR_EQUAL_THAN(x, y) (x <= y)
      #define GREATER_THAN(x, y) (x > y)
      #define GREATER_OR_EQUAL_THAN(x, y) (x >= y)
      #define VECTOR_SELECT(b, x, y) (b) ? x : y
   
      #define ZERO_OUT(x) (x)0
      #define SET_VECTOR(TYPE, VALUE) (TYPE)(VALUE)
   
      #define SV_POSITION                 SV_Position
      #define SV_TARGET(i)                SV_Target##i
      #define SV_DEPTH                    SV_Depth
      #define SV_DEPTH_GE                 SV_DepthGreaterEqual
      #define SV_DEPTH_LE                 SV_DepthLessEqual   
      #define SV_VERTEX_ID                SV_VertexID
      #define SV_INSTANCE_ID              SV_InstanceID
      #define SV_SAMPLE_INDEX             SV_SampleIndex
      #define SV_PRIMITIVE_ID             SV_PrimitiveID
      #define SV_GSINSTANCE_ID            SV_GsInstanceID
      #define SV_OUTPUT_CONTROL_POINT_ID  SV_OutputControlPointID
      #define SV_EDGE_TESS_FACTOR         SV_TessFactor
      #define SV_INSIDE_TESS_FACTOR       SV_InsideTessFactor
      #define SV_DOMAIN_LOCATION          SV_DomainLocation
      #define SV_DISPATCH_THREAD_ID       SV_DispatchThreadID
      #define SV_GROUP_ID                 SV_GroupID
      #define SV_GROUP_INDEX              SV_GroupIndex
      #define SV_GROUP_THREAD_ID          SV_GroupThreadID
      #define SV_IS_FRONT_FACE            SV_IsFrontFace
      #define SV_COVERAGE                 SV_Coverage
      #define SV_CLIP_DISTANCE(i)         SV_ClipDistance##i
      #define SV_CULL_DISTANCE(i)         SV_CullDistance##i
      #define SV_RENDER_TARGET_INDEX      SV_RenderTargetArrayIndex
      #define SV_VIEWPORT_INDEX           SV_ViewportArrayIndex
   
      #define HLSL_ATTRIB_ISOLATE                     [branch] if (COMMON_VP_PARAMS[0].x > -1.f)
      #define HLSL_ATTRIB_LOOP                        [loop]
      #define HLSL_ATTRIB_FLATTEN                     [flatten]
      #define HLSL_ATTRIB_UNROLL                      [unroll]
      #define HLSL_ATTRIB_BRANCH                      [branch]
      #define HLSL_ATTRIB_DOMAIN(type)                [domain(type)]
      #define HLSL_ATTRIB_PARTITIONING(type)          [partitioning(type)]
      #define HLSL_ATTRIB_OUTPUT_TOPOLOGY(type)       [outputtopology(type)]
      #define HLSL_ATTRIB_OUTPUT_CONTROL_POINTS(n)    [outputcontrolpoints(n)]
      #define HLSL_ATTRIB_PATCH_CONSTANT_FUNC(func)   [patchconstantfunc(func)]
      #define HLSL_ATTRIB_MAX_TESS_FACTOR(n)          [maxtessfactor(n)]
      #define HLSL_ATTRIB_NUM_THREADS(x, y, z)        [numthreads(x, y, z)]
      #define HLSL_ATTRIB_GS_INSTANCE(n)              [instance(n)]
      #define HLSL_ATTRIB_GS_MAX_VERTEX_COUNT(n)      [maxvertexcount(n)]
      #define HLSL_ATTRIB_EARLYDEPTHSTENCIL           [earlydepthstencil]
      #define PRECISE_VARIABLE(type, name, value)     type name = value;

      #define HLSL_DOMAIN_TRIANGLES "tri"
      #define HLSL_DOMAIN_QUADS     "quad"
      #define HLSL_DOMAIN_ISOLINES  "isoline"
      
      #define HLSL_PARTITIONING_EQUAL           "integer"
      #define HLSL_PARTITIONING_FRACTIONAL_EVEN "fractional_even"
      #define HLSL_PARTITIONING_FRACTIONAL_ODD  "fractional_odd"
      
      #define HLSL_OUTPUT_TOPOLOGY_POINT        "point"
      #define HLSL_OUTPUT_TOPOLOGY_LINE         "line"
      #define HLSL_OUTPUT_TOPOLOGY_TRIANGLE_CW  "triangle_cw"
      #define HLSL_OUTPUT_TOPOLOGY_TRIANGLE_CCW "triangle_ccw"
      
      #define GS_TRIANGLE              triangle
      #define GS_TRIANGLE_STREAM       TriangleStream
      
      #define CS_THREAD_GROUP_SHARED   groupshared
      #define CS_THREAD_GROUP_MEMORY_BARRIER_SYNC GroupMemoryBarrierWithGroupSync();
      
      #define RW_INCREMENT_COUNTER(buf) buf.IncrementCounter()
      #define RW_DECREMENT_COUNTER(buf) buf.DecrementCounter()
      
      #define INTERLOCKED_OUT_TYPE int
      #define INTERLOCKED_ADD(IN, ADD, DEST)                InterlockedAdd (IN, ADD, DEST)
      #define RW_INTERLOCKED_ADD(IN, COORD, ADD, DEST)      InterlockedAdd (IN[COORD], ADD, DEST)  
      #define RW_TEX_INTERLOCKED_ADD(IN, COORD, ADD, DEST)  InterlockedAdd (IN[COORD], ADD, DEST)  
      #define RW_INTERLOCKED_OR(IN, COORD, ADD, DEST)       InterlockedOr  (IN[COORD], ADD, DEST)  
      #define _RW_TEX_STORE(TEX, COORD, VALUE)  TEX[COORD] = VALUE
      #define _RW_TEX_LOAD(TEX, COORD)          TEX[COORD]
      
      #define RWTexture1D_UINT         RWTexture1D<uint>
      #define RWTexture2D_UINT         RWTexture2D<uint>
      #define RWTexture3D_UINT         RWTexture3D<uint>
      #define RWTexture1D_UINT2        RWTexture1D<uint2>
      #define RWTexture2D_UINT2        RWTexture2D<uint2>
      #define RWTexture3D_UINT2        RWTexture3D<uint2>
      #define RWTexture1D_INT          RWTexture1D<int>
      #define RWTexture2D_INT          RWTexture2D<int>
      #define RWTexture3D_INT          RWTexture3D<int>
      #define RWTexture1D_UNORM        RWTexture1D<unorm float>
      #define RWTexture2D_UNORM        RWTexture2D<unorm float>
      #define RWTexture3D_UNORM        RWTexture3D<unorm float>
      #define RWTexture1D_UNORM4       RWTexture1D<unorm float4>
      #define RWTexture2D_UNORM4       RWTexture2D<unorm float4>
      #define RWTexture3D_UNORM4       RWTexture3D<unorm float4>
      #define RWTexture1D_FLOAT        RWTexture1D<float>
      #define RWTexture2D_FLOAT        RWTexture2D<float>
      #define RWTexture3D_FLOAT        RWTexture3D<float>
      #define RWTexture1D_FLOAT2       RWTexture1D<float2>
      #define RWTexture2D_FLOAT2       RWTexture2D<float2>
      #define RWTexture3D_FLOAT2       RWTexture3D<float2>
      #define RWTexture1D_FLOAT3       RWTexture1D<float3>
      #define RWTexture2D_FLOAT3       RWTexture2D<float3>
      #define RWTexture3D_FLOAT3       RWTexture3D<float3>
      #define RWTexture2D_FLOAT4       RWTexture2D<float4>
   
      #define _SAMPLE(tex, samp, uv)                              tex.Sample(samp, uv)
      #define _SAMPLE_BAIS(tex, samp, uv, bais)                   tex.Sample(samp, uv, bais)
      #define _SAMPLE_LEVEL(tex, samp, uv, lod)                   tex.SampleLevel(samp, uv, lod)
      #define _SAMPLE_LEVEL_OFFS(tex, samp, uv, lod, offs)        tex.SampleLevel(samp, uv, lod, offs)
      #define _SAMPLE_CMP_LEVEL_0(tex, samp, uv, cval)            tex.SampleCmpLevelZero(samp, uv, cval)
      #define _SAMPLE_CMP_LEVEL_0_OFFS(tex, samp, uv, cval, offs) tex.SampleCmpLevelZero(samp, uv, cval, offs)
      #define _SAMPLE_GRAD(tex, samp, uv, ddx, ddy)               tex.SampleGrad(samp, uv, ddx, ddy)
      #define _SAMPLE_ARRAY(tex, samp, uv)                        _SAMPLE(tex, samp, uv)
      #define _SAMPLE_ARRAY_LEVEL(tex, samp, uv, lod)             _SAMPLE_LEVEL(tex, samp, uv, lod)
      #define _SAMPLE_CUBE(tex, samp, uv)                         _SAMPLE(tex, samp, uv)
      #define _SAMPLE_CUBE_LEVEL(tex, samp, uv, lod)              _SAMPLE_LEVEL(tex, samp, uv, lod)
      #define _SAMPLE_CUBE_ARRAY(tex, samp, uv)                   _SAMPLE(tex, samp, uv)
      #define _SAMPLE_CUBE_ARRAY_LEVEL(tex, samp, uv, lod)        _SAMPLE_LEVEL(tex, samp, uv, lod)
      #define _SAMPLE_1D(tex, samp, uv)                           _SAMPLE(tex, samp, uv)
      #define _SAMPLE_LEVEL_1D(tex, samp, uv, lod)                _SAMPLE_LEVEL(tex, samp, uv, lod)
      #define _SAMPLE_3D(tex, samp, uv)                           _SAMPLE(tex, samp, uv)
      #define _SAMPLE_LEVEL_3D(tex, samp, uv, lod)                _SAMPLE_LEVEL(tex, samp, uv, lod)
      
      #define _SAMPLE_GATHER(tex, samp, uv)                       tex.Gather(samp, uv)
      #define _SAMPLE_GATHER_OFFS(tex, samp, uv, offs)            tex.Gather(samp, uv, offs)
      
      #if defined(_API_DX11)
         #define _SAMPLE_CALC_LOD(tex, samp, uv) tex.CalculateLevelOfDetail(samp, uv)
      #endif
      
      #define INTERP_MOD_CENTROID        centroid
      #define INTERP_MOD_NOINTERPOLATION nointerpolation
      #define INTERP_MOD_NOPERSPECTIVE   noperspective
   
      // for ORBIS, Vulkan and NX64 platforms compatibility
      bool any1i(int  v) { return any(v); }
      bool any2i(int2 v) { return any(v); }
      bool any3i(int3 v) { return any(v); }
      bool any4i(int4 v) { return any(v); }
   
      bool any1u(uint  v) { return any(v); }
      bool any2u(uint2 v) { return any(v); }
      bool any3u(uint3 v) { return any(v); }
      bool any4u(uint4 v) { return any(v); }
   
      bool any1f(float  v) { return any(v); }
      bool any2f(float2 v) { return any(v); }
      bool any3f(float3 v) { return any(v); }
      bool any4f(float4 v) { return any(v); }
   
      bool all1i(int  v) { return all(v); }
      bool all2i(int2 v) { return all(v); }
      bool all3i(int3 v) { return all(v); }
      bool all4i(int4 v) { return all(v); }
   
      bool all1u(uint  v) { return all(v); }
      bool all2u(uint2 v) { return all(v); }
      bool all3u(uint3 v) { return all(v); }
      bool all4u(uint4 v) { return all(v); }
   
      bool all1f(float  v) { return all(v); }
      bool all2f(float2 v) { return all(v); }
      bool all3f(float3 v) { return all(v); }
      bool all4f(float4 v) { return all(v); }
   
   #elif defined(_AP_ORBIS)
   
   //   #pragma warning(disable : 4200)
      #pragma warning(disable : 5202) // implicit cast from 'float4' to 'float3'
      #pragma warning(disable : 5203) // parameter 'viewRefl' is unreferenced
      #pragma warning(disable : 5204) // assignment causes implicit cast from 'float' to 'half'
      #pragma warning(disable : 5205) // assignment causes implicit cast from 'float3' to 'half3'
      #pragma warning(disable : 5206) // local variable 'closestIdx' is unreferenced
      #pragma warning(disable : 5557) // vector or matrix accessed with dynamic index, user is responsible for ensuring that index is within bounds.
      #pragma warning(disable : 5581) // target architecture treats 'half' type as full-precision
      #pragma warning(disable : 5524) // unsupported compiler hint

      #define EQUAL(x, y) (x == y)
      #define NOT_EQUAL(x, y) (x != y)
      #define LESS_THAN(x, y) (x < y)
      #define LESS_OR_EQUAL_THAN(x, y) (x <= y)
      #define GREATER_THAN(x, y) (x > y)
      #define GREATER_OR_EQUAL_THAN(x, y) (x >= y)
      #define VECTOR_SELECT(b, x, y) (b) ? x : y
      
      #define ZERO_OUT(x) (x)0
      #define SET_VECTOR(TYPE, VALUE) (TYPE)(VALUE)
      
      #define HALF_DEFINED_AS_FLOAT
   
      #define half  float
      #define half2 float2
      #define half3 float3
      #define half4 float4
   
      #define SV_POSITION                 S_POSITION
      #define SV_TARGET(i)                S_TARGET_OUTPUT[i]
      #define SV_DEPTH                    S_DEPTH_OUTPUT
      #define SV_DEPTH_GE                 S_DEPTH_GE_OUTPUT
      #define SV_DEPTH_LE                 S_DEPTH_LE_OUTPUT      
      #define SV_VERTEX_ID                S_VERTEX_ID
      #define SV_INSTANCE_ID              S_INSTANCE_ID
      #define SV_SAMPLE_INDEX             S_SAMPLE_INDEX
      #define SV_PRIMITIVE_ID             S_PRIMITIVE_ID
      #define SV_GSINSTANCE_ID            S_GSINSTANCE_ID
      #define SV_OUTPUT_CONTROL_POINT_ID  S_OUTPUT_CONTROL_POINT_ID   
      #define SV_EDGE_TESS_FACTOR         S_EDGE_TESS_FACTOR
      #define SV_INSIDE_TESS_FACTOR       S_INSIDE_TESS_FACTOR
      #define SV_DOMAIN_LOCATION          S_DOMAIN_LOCATION
      #define SV_DISPATCH_THREAD_ID       S_DISPATCH_THREAD_ID
      #define SV_GROUP_ID                 S_GROUP_ID
      #define SV_GROUP_INDEX              S_GROUP_INDEX
      #define SV_GROUP_THREAD_ID          S_GROUP_THREAD_ID
      #define SV_IS_FRONT_FACE            S_FRONT_FACE
      #define SV_COVERAGE                 S_COVERAGE
      #define SV_CLIP_DISTANCE(i)         S_CLIP_DISTANCE##i
      #define SV_CULL_DISTANCE(i)         S_CULL_DISTANCE##i
      #define SV_RENDER_TARGET_INDEX      S_RENDER_TARGET_INDEX
      #define SV_VIEWPORT_INDEX           S_VIEWPORT_INDEX
   
      #define HLSL_ATTRIB_ISOLATE                     [isolate]
      #define HLSL_ATTRIB_LOOP                        [loop]
      #define HLSL_ATTRIB_FLATTEN                     [flatten]
      #define HLSL_ATTRIB_UNROLL                      [unroll]
      #define HLSL_ATTRIB_BRANCH                      [branch]
      #define HLSL_ATTRIB_DOMAIN(type)                [DOMAIN_PATCH_TYPE(type)]
      #define HLSL_ATTRIB_PARTITIONING(type)          [PARTITIONING_TYPE(type)]
      #define HLSL_ATTRIB_OUTPUT_TOPOLOGY(type)       [OUTPUT_TOPOLOGY_TYPE(type)]
      #define HLSL_ATTRIB_OUTPUT_CONTROL_POINTS(n)    [OUTPUT_CONTROL_POINTS(n)]
      #define HLSL_ATTRIB_PATCH_CONSTANT_FUNC(func)   [PATCH_CONSTANT_FUNC(func)]
      #define HLSL_ATTRIB_MAX_TESS_FACTOR(n)          [MAX_TESS_FACTOR(n)]
      #define HLSL_ATTRIB_NUM_THREADS(x, y, z)        [NUM_THREADS(x, y, z)]
      #define HLSL_ATTRIB_GS_INSTANCE(n)              [INSTANCE(n)]
      #define HLSL_ATTRIB_GS_MAX_VERTEX_COUNT(n)      [MAX_VERTEX_COUNT(n)]
      #define HLSL_ATTRIB_EARLYDEPTHSTENCIL           [earlydepthstencil]
      #define PRECISE_VARIABLE(type, name, value)     type name = __invariant(value);
      
      #define HLSL_DOMAIN_TRIANGLES "tri"
      #define HLSL_DOMAIN_QUADS     "quad"
      #define HLSL_DOMAIN_ISOLINES  "isoline"
      
      #define HLSL_PARTITIONING_EQUAL           "integer"
      #define HLSL_PARTITIONING_FRACTIONAL_EVEN "fractional_even"
      #define HLSL_PARTITIONING_FRACTIONAL_ODD  "fractional_odd"
      
      #define HLSL_OUTPUT_TOPOLOGY_POINT        "point"
      #define HLSL_OUTPUT_TOPOLOGY_LINE         "line"
      #define HLSL_OUTPUT_TOPOLOGY_TRIANGLE_CW  "triangle_cw"
      #define HLSL_OUTPUT_TOPOLOGY_TRIANGLE_CCW "triangle_ccw"
      
      #define GS_TRIANGLE              Triangle
      #define GS_TRIANGLE_STREAM       TriangleBuffer
      
      #define CS_THREAD_GROUP_SHARED   thread_group_memory
      #define CS_THREAD_GROUP_MEMORY_BARRIER_SYNC ThreadGroupMemoryBarrierSync();
      
      #define RW_INCREMENT_COUNTER(buf) buf.IncrementCount()
      #define RW_DECREMENT_COUNTER(buf) buf.DecrementCount()
   
      #define RWTexture1D_UINT         RW_Texture1D<uint>
      #define RWTexture2D_UINT         RW_Texture2D<uint>
      #define RWTexture3D_UINT         RW_Texture3D<uint>
      #define RWTexture1D_UINT2        RW_Texture1D<uint2>
      #define RWTexture2D_UINT2        RW_Texture2D<uint2>
      #define RWTexture3D_UINT2        RW_Texture3D<uint2>
      #define RWTexture1D_INT          RW_Texture1D<int>
      #define RWTexture2D_INT          RW_Texture2D<int>
      #define RWTexture3D_INT          RW_Texture3D<int>
      #define RWTexture1D_UNORM        RW_Texture1D<float>
      #define RWTexture2D_UNORM        RW_Texture2D<float>
      #define RWTexture3D_UNORM        RW_Texture3D<float>
      #define RWTexture1D_UNORM4       RW_Texture1D<float4>
      #define RWTexture2D_UNORM4       RW_Texture2D<float4>
      #define RWTexture3D_UNORM4       RW_Texture3D<float4>
      #define RWTexture1D_FLOAT        RW_Texture1D<float>
      #define RWTexture2D_FLOAT        RW_Texture2D<float>
      #define RWTexture3D_FLOAT        RW_Texture3D<float>
      #define RWTexture1D_FLOAT2       RW_Texture1D<float2>
      #define RWTexture2D_FLOAT2       RW_Texture2D<float2>
      #define RWTexture3D_FLOAT2       RW_Texture3D<float2>
      #define RWTexture1D_FLOAT3       RW_Texture1D<float3>
      #define RWTexture2D_FLOAT3       RW_Texture2D<float3>
      #define RWTexture3D_FLOAT3       RW_Texture3D<float3>
      #define RWTexture2D_FLOAT4       RW_Texture2D<float4>
      
      #define RWBuffer                 RW_RegularBuffer
      #define RWStructuredBuffer       RW_RegularBuffer
      #define Buffer                   RegularBuffer
      #define StructuredBuffer         RegularBuffer 
      #define AppendStructuredBuffer   AppendRegularBuffer
      #define firstbitlow              FirstSetBit_Lo
      #define firstbithigh             FirstSetBit_Hi
      #define reversebits              ReverseBits
      #define countbits                CountSetBits
   
      #define nointerpolation nointerp
      #define noperspective   nopersp
   
      #define Texture2DArray     Texture2D_Array
      #define TextureCubeArray   TextureCube_Array
   
      #define INTERLOCKED_OUT_TYPE int
      #define INTERLOCKED_ADD(IN, ADD, DEST)                AtomicAdd (IN, ADD, DEST)
      #define RW_INTERLOCKED_ADD(IN, COORD, ADD, DEST)      AtomicAdd (IN[COORD], ADD, DEST)
      #define RW_TEX_INTERLOCKED_ADD(IN, COORD, ADD, DEST)  AtomicAdd (IN[COORD], ADD, DEST)  
      #define RW_INTERLOCKED_OR(IN, COORD, ADD, DEST)       AtomicOr  (IN[COORD], ADD, DEST)
      #define _RW_TEX_STORE(TEX, COORD, VALUE)  TEX[COORD] = VALUE
      #define _RW_TEX_LOAD(TEX, COORD)          TEX[COORD]
      
      #define InterlockedAdd AtomicAdd
      #define InterlockedMin AtomicMin
      #define InterlockedMax AtomicMax
   
      #define _SAMPLE(tex, samp, uv)                              tex.Sample(samp, uv)
      #define _SAMPLE_BAIS(tex, samp, uv, bais)                   tex.Sample(samp, uv, bais)
      #define _SAMPLE_LEVEL(tex, samp, uv, lod)                   tex.SampleLOD(samp, uv, lod)
      #define _SAMPLE_LEVEL_OFFS(tex, samp, uv, lod, offs)        tex.SampleLOD(samp, uv, lod, offs)
      #define _SAMPLE_CMP_LEVEL_0(tex, samp, uv, cval)            tex.SampleCmpLOD0(samp, uv, cval)
      #define _SAMPLE_CMP_LEVEL_0_OFFS(tex, samp, uv, cval, offs) tex.SampleCmpLOD0(samp, uv, cval, offs)
      #define _SAMPLE_GRAD(tex, samp, uv, ddx, ddy)               tex.SampleGradient(samp, uv, ddx, ddy)
      #define _SAMPLE_CALC_LOD(tex, samp, uv)                     tex.GetLOD(samp, uv)
      #define _SAMPLE_ARRAY(tex, samp, uv)                        _SAMPLE(tex, samp, uv)
      #define _SAMPLE_ARRAY_LEVEL(tex, samp, uv, lod)             _SAMPLE_LEVEL(tex, samp, uv, lod)
      #define _SAMPLE_CUBE(tex, samp, uv)                         _SAMPLE(tex, samp, uv)
      #define _SAMPLE_CUBE_LEVEL(tex, samp, uv, lod)              _SAMPLE_LEVEL(tex, samp, uv, lod)
      #define _SAMPLE_CUBE_ARRAY(tex, samp, uv)                   _SAMPLE(tex, samp, uv)
      #define _SAMPLE_CUBE_ARRAY_LEVEL(tex, samp, uv, lod)        _SAMPLE_LEVEL(tex, samp, uv, lod)
      #define _SAMPLE_1D(tex, samp, uv)                           _SAMPLE(tex, samp, uv)
      #define _SAMPLE_LEVEL_1D(tex, samp, uv, lod)                _SAMPLE_LEVEL(tex, samp, uv, lod)
      #define _SAMPLE_3D(tex, samp, uv)                           _SAMPLE(tex, samp, uv)
      #define _SAMPLE_LEVEL_3D(tex, samp, uv, lod)                _SAMPLE_LEVEL(tex, samp, uv, lod)
      
      #define _SAMPLE_GATHER(tex, samp, uv)                       tex.Gather(samp, uv)
      #define _SAMPLE_GATHER_OFFS(tex, samp, uv, offs)            tex.Gather(samp, uv, offs)
         
      #define INTERP_MOD_CENTROID        centroid
      #define INTERP_MOD_NOINTERPOLATION nointerp
      #define INTERP_MOD_NOPERSPECTIVE   nopersp
   
      // Natively PSSL supports any/all only for bool operands
      // These implemenetations are based on HLSL disassembly
      bool any1i(int  v) { return v         != 0; }
      bool any2i(int2 v) { return dot(v, v) != 0; }
      bool any3i(int3 v) { return dot(v, v) != 0; }
      bool any4i(int4 v) { return dot(v, v) != 0; }
   
      bool any1u(uint  v) { return v         != 0; }
      bool any2u(uint2 v) { return dot(v, v) != 0; }
      bool any3u(uint3 v) { return dot(v, v) != 0; }
      bool any4u(uint4 v) { return dot(v, v) != 0; }
   
      bool any1f(float  v) { return v         != 0.f; }
      bool any2f(float2 v) { return dot(v, v) != 0.f; }
      bool any3f(float3 v) { return dot(v, v) != 0.f; }
      bool any4f(float4 v) { return dot(v, v) != 0.f; }
   
      bool all1i(int  v) { return v                         != 0; }
      bool all2i(int2 v) { return v.x * v.y                 != 0; }
      bool all3i(int3 v) { return v.x * v.y * v.z           != 0; }
      bool all4i(int4 v) { return (v.x * v.y) * (v.z * v.w) != 0; }
   
      bool all1u(uint  v) { return v                         != 0; }
      bool all2u(uint2 v) { return v.x * v.y                 != 0; }
      bool all3u(uint3 v) { return v.x * v.y * v.z           != 0; }
      bool all4u(uint4 v) { return (v.x * v.y) * (v.z * v.w) != 0; }
   
      bool all1f(float  v) { return v                         != 0.f; }
      bool all2f(float2 v) { return v.x * v.y                 != 0.f; }
      bool all3f(float3 v) { return v.x * v.y * v.z           != 0.f; }
      bool all4f(float4 v) { return (v.x * v.y) * (v.z * v.w) != 0.f; }
   #endif
#elif defined(_API_VULKAN) || defined(_AP_NX64)

   #define float2x2 mat2
   #define float3x3 mat3
   #define float4x4 mat4
   
   #define float2x4 mat2x4
   #define float3x4 mat3x4
         
   #define float2 vec2
   #define float3 vec3
   #define float4 vec4
   
   #define uint2 uvec2
   #define uint3 uvec3
   #define uint4 uvec4
   
   #define int2 ivec2
   #define int3 ivec3
   #define int4 ivec4

   #define bool2 bvec2
   #define bool3 bvec3
   #define bool4 bvec4

   #define EQUAL(x, y) equal(x,y)
   #define NOT_EQUAL(x, y) notEqual(x,y)
   #define LESS_THAN(x, y) lessThan(x, y)
   #define LESS_OR_EQUAL_THAN(x, y) lessThanEqual(x, y)
   #define GREATER_THAN(x, y) greaterThan(x, y)
   #define GREATER_OR_EQUAL_THAN(x, y) greaterThanEqual(x, y)
   #define VECTOR_SELECT(b, x, y) mix(y , x, (b))
   
   #define ZERO_OUT(x) x(0)
   #define SET_VECTOR(TYPE, VALUE) TYPE(VALUE)
   
   #define HALF_DEFINED_AS_FLOAT
      
   #define half  float
   #define half2 vec2
   #define half3 vec3
   #define half4 vec4
   
   #define atan2(y,x) atan(y,x)
   #define ddx dFdx
   #define ddx_coarse dFdxCoarse
   #define ddx_fine dFdxFine
   #define ddy dFdy
   #define ddy_coarse dFdyCoarse
   #define ddy_fine dFdyFine
   #define EvaluateAttributeAtCentroid interpolateAtCentroid
   #define EvaluateAttributeAtSample interpolateAtSample
   #define EvaluateAttributeSnapped interpolateAtOffset
   #define frac fract
   #define lerp mix
   #define mad fma
   #define saturate(x) clamp(x, 0.0, 1.0)
   #define sincos(x,s,c) s = sin(x); c = cos(x)
   #define ldexp(x, y) ldexp(x, int(y))
   #define mul(x, y) x * y
   #define fmod(x, y) mod(x, y) * sign(x)
   #define rsqrt(x) (1 / sqrt(x))
   #define rcp(x) (1 / x)
   #define clip(x) if(x < 0) discard
   #define log10(x) (log(x) / log(10))
   
   #define f16tof32(_x) unpackHalf2x16(_x).x
   #define f32tof16(x) packHalf2x16(vec2(x, 0))
   
   #define isfinite(x) (!isinf(x) && !isnan(x))
   
   #define asfloat uintBitsToFloat
   #define asint floatBitsToInt
   #define asuint floatBitsToUint
   
   // static is a reserved word so just get rid of it
   #define static 
   // inline is a reserved word so just get rid of it
   #define inline
   // extern is a reserved word so just get rid of it
   #define extern
   // input is a reserved word so just rename it
   #define input _VULKAN_INPUT
   // output is a reserved word so just rename it
   #define output _VULKAN_OUTPUT
   // filter is a reserved word so just rename it
   #define filter _VULKAN_FILTER
   // varying is a reserved word so just rename it
   #define varying _VULKAN_VARYING
   
   #define HLSL_ATTRIB_DOMAIN(type)                layout(type) in;
   #define HLSL_ATTRIB_PARTITIONING(type)          layout(type) in;
   #define HLSL_ATTRIB_OUTPUT_TOPOLOGY(type)       layout(type) in;
   #define HLSL_ATTRIB_OUTPUT_CONTROL_POINTS(n)    layout(vertices = n) out;
   #define HLSL_ATTRIB_PATCH_CONSTANT_FUNC(func)   
   #define HLSL_ATTRIB_MAX_TESS_FACTOR(n)          
   #define HLSL_ATTRIB_NUM_THREADS(x, y, z)        layout(local_size_x = x, local_size_y = y, local_size_z = z) in;
   #define HLSL_ATTRIB_GS_INSTANCE(n)              layout(invocations = n) in;
   #define HLSL_ATTRIB_GS_MAX_VERTEX_COUNT(n)      layout(max_vertices = n) out;
   #define HLSL_ATTRIB_EARLYDEPTHSTENCIL           layout(early_fragment_tests) in;
   #define PRECISE_VARIABLE(type, name, value)     type name = value;
   
   #define HLSL_DOMAIN_TRIANGLES triangles
   #define HLSL_DOMAIN_QUADS     quads
   #define HLSL_DOMAIN_ISOLINES  isolines
   
   #define HLSL_PARTITIONING_EQUAL           equal_spacing
   #define HLSL_PARTITIONING_FRACTIONAL_EVEN fractional_even_spacing
   #define HLSL_PARTITIONING_FRACTIONAL_ODD  fractional_odd_spacing
   
   #define HLSL_OUTPUT_TOPOLOGY_POINT  
   #define HLSL_OUTPUT_TOPOLOGY_LINE
   #define HLSL_OUTPUT_TOPOLOGY_TRIANGLE_CW  cw
   #define HLSL_OUTPUT_TOPOLOGY_TRIANGLE_CCW ccw
   
   #define CS_THREAD_GROUP_SHARED   shared
   #define CS_THREAD_GROUP_MEMORY_BARRIER_SYNC groupMemoryBarrier(); barrier();

   #define RWTexture1D_UINT         uimage1D
   #define RWTexture2D_UINT         uimage2D
   #define RWTexture3D_UINT         uimage3D
   #define RWTexture1D_UINT2        uimage1D
   #define RWTexture2D_UINT2        uimage2D
   #define RWTexture3D_UINT2        uimage3D
   #define RWTexture1D_INT          iimage1D
   #define RWTexture2D_INT          iimage2D
   #define RWTexture3D_INT          iimage3D
   #define RWTexture1D_UNORM        image1D
   #define RWTexture2D_UNORM        image2D
   #define RWTexture3D_UNORM        image3D
   #define RWTexture1D_UNORM4       image1D
   #define RWTexture2D_UNORM4       image2D
   #define RWTexture3D_UNORM4       image3D
   #define RWTexture1D_FLOAT        image1D
   #define RWTexture2D_FLOAT        image2D
   #define RWTexture3D_FLOAT        image3D
   #define RWTexture1D_FLOAT2       image1D
   #define RWTexture2D_FLOAT2       image2D
   #define RWTexture3D_FLOAT2       image3D
   #define RWTexture1D_FLOAT3       image1D
   #define RWTexture2D_FLOAT3       image2D
   #define RWTexture3D_FLOAT3       image3D
   #define RWTexture2D_FLOAT4       image2D

   #define INTERLOCKED_OUT_TYPE uint   
   #define INTERLOCKED_ADD(IN, ADD, DEST)            DEST = atomicAdd(IN, ADD)
   #define RW_INTERLOCKED_ADD(SRC, INDEX, ADD, DEST) DEST = atomicAdd(SRC[INDEX], ADD)  
   #define RW_TEX_INTERLOCKED_ADD(TEX, COORD, ADD, DEST) DEST = imageAtomicAdd(TEX, COORD, ADD)  
   #define RW_INTERLOCKED_OR(SRC, INDEX, OR, DEST) DEST = atomicOr(SRC[INDEX], OR)  
   #define _RW_TEX_STORE(TEX, COORD, VALUE)  imageStore(TEX, COORD, VALUE)
   #define _RW_TEX_LOAD(TEX, COORD)          imageLoad(TEX, COORD)
      
   #define RW_INCREMENT_COUNTER(buf) atomicAdd(buf##_COUNTER[0],  1)
   #define RW_DECREMENT_COUNTER(buf) atomicAdd(buf##_COUNTER[0], -1)
   
   #define InterlockedMin atomicMin
   #define InterlockedMax atomicMax
      
   #define firstbitlow              findLSB
   #define firstbithigh             findMSB
   #define reversebits              bitfieldReverse
   #define countbits                bitCount

   #define INTERP_MOD_CENTROID        
   #define INTERP_MOD_NOINTERPOLATION 
   // @TODO : glsl equivalent?
   #define INTERP_MOD_NOPERSPECTIVE

   #ifdef _API_VULKAN
      #define GLSL_INSTANCE_INDEX gl_InstanceIndex
      #define GLSL_VERTEX_INDEX gl_VertexIndex
         
      #extension GL_EXT_control_flow_attributes : enable
      #define HLSL_ATTRIB_ISOLATE
      #define HLSL_ATTRIB_BRANCH                      [[branch]]
      #define HLSL_ATTRIB_UNROLL                      [[unroll]]
      #define HLSL_ATTRIB_LOOP                        [[dont_unroll]]
      #define HLSL_ATTRIB_FLATTEN                     [[flatten]]
      
      #define SamplerState             sampler
      #define SamplerComparisonState   samplerShadow

      #define Texture1D                texture1D
      #define Texture2D                texture2D
      #define Texture2DArray           texture2DArray
      #define Texture3D                texture3D
      #define TextureCube              textureCube
      #define TextureCubeArray         textureCubeArray
      
      #define COMB(tex, samp) tex,samp
   #else // _AP_NX64
      #define GLSL_INSTANCE_INDEX gl_InstanceID
      #define GLSL_VERTEX_INDEX gl_VertexID

      #define HLSL_ATTRIB_ISOLATE
      #define HLSL_ATTRIB_BRANCH
      #define HLSL_ATTRIB_UNROLL
      #define HLSL_ATTRIB_LOOP
      #define HLSL_ATTRIB_FLATTEN   
   
      #define SamplerState             uint64_t
      #define SamplerComparisonState   uint64_t

      #define Texture1D                uint64_t
      #define Texture2D                uint64_t
      #define Texture2DArray           uint64_t
      #define Texture3D                uint64_t
      #define TextureCube              uint64_t
      #define TextureCubeArray         uint64_t
      
      #define COMB(tex, samp) tex|samp
   #endif

   #define _SAMPLE(tex, samp, uv)                              texture(sampler2D(COMB(tex, samp)), uv)
   #define _SAMPLE_BAIS(tex, samp, uv, bais)                   texture(sampler2D(COMB(tex, samp)), uv, bais)
   #define _SAMPLE_LEVEL(tex, samp, uv, lod)                   textureLod(sampler2D(COMB(tex, samp)), uv, lod)
   #define _SAMPLE_LEVEL_OFFS(tex, samp, uv, lod, offs)        textureLodOffset(sampler2D(COMB(tex, samp)), uv, lod, offs)
   #define _SAMPLE_CMP_LEVEL_0(tex, samp, uv, cval)            textureLod(sampler2DShadow(COMB(tex, samp)), float3(uv, cval), 0)
   #define _SAMPLE_CMP_LEVEL_0_OFFS(tex, samp, uv, cval, offs) textureLodOffset(sampler2DShadow(COMB(tex, samp)), float3(uv, cval), 0, offs)
   #define _SAMPLE_GRAD(tex, samp, uv, ddx, ddy)               textureGrad(sampler2D(COMB(tex, samp)), uv, ddx, ddy)
   #define _SAMPLE_CALC_LOD(tex, samp, uv)                     textureQueryLod(sampler2D(COMB(tex, samp)), uv)
   #define _SAMPLE_ARRAY(tex, samp, uv)                        texture(sampler2DArray(COMB(tex, samp)), uv)
   #define _SAMPLE_ARRAY_LEVEL(tex, samp, uv, lod)             textureLod(sampler2DArray(COMB(tex, samp)), uv, lod)
   #define _SAMPLE_CUBE(tex, samp, uv)                         texture(samplerCube(COMB(tex, samp)), uv)
   #define _SAMPLE_CUBE_LEVEL(tex, samp, uv, lod)              textureLod(samplerCube(COMB(tex, samp)), uv, lod)
   #define _SAMPLE_CUBE_ARRAY(tex, samp, uv)                   texture(samplerCubeArray(COMB(tex, samp)), uv)
   #define _SAMPLE_CUBE_ARRAY_LEVEL(tex, samp, uv, lod)        textureLod(samplerCubeArray(COMB(tex, samp)), uv, lod)
   #define _SAMPLE_1D(tex, samp, uv)                           texture(sampler1D(COMB(tex, samp)), uv)
   #define _SAMPLE_LEVEL_1D(tex, samp, uv, lod)                textureLod(sampler1D(COMB(tex, samp)), uv, lod)
   #define _SAMPLE_3D(tex, samp, uv)                           texture(sampler3D(COMB(tex, samp)), uv)
   #define _SAMPLE_LEVEL_3D(tex, samp, uv, lod)                textureLod(sampler3D(COMB(tex, samp)), uv, lod)

   #define _SAMPLE_GATHER(tex, samp, uv)                       textureGather(sampler2D(COMB(tex, samp)), uv)
   #define _SAMPLE_GATHER_2D_ARRAY(tex, samp, uv)              textureGather(sampler2DArray(COMB(tex, samp)), uv)
   #define _SAMPLE_GATHER_CUBE_ARRAY(tex, samp, uv)            textureGather(samplerCubeArray(COMB(tex, samp)), uv)
   #define _SAMPLE_GATHER_OFFS(tex, samp, uv, offs)            textureGatherOffset(sampler2D(COMB(tex, samp)), uv, offs)
   
   // Natively GLSL supports any/all only for bool operands
   // These implemenetations are based on HLSL disassembly
   bool any1i(int  v) { return v         != 0; }
   bool any2i(int2 v) { return dot(v, v) != 0; }
   bool any3i(int3 v) { return dot(v, v) != 0; }
   bool any4i(int4 v) { return dot(v, v) != 0; }

   bool any1u(uint  v) { return v         != 0; }
   bool any2u(uint2 v) { return dot(v, v) != 0; }
   bool any3u(uint3 v) { return dot(v, v) != 0; }
   bool any4u(uint4 v) { return dot(v, v) != 0; }

   bool any1f(float  v) { return v         != 0.f; }
   bool any2f(float2 v) { return dot(v, v) != 0.f; }
   bool any3f(float3 v) { return dot(v, v) != 0.f; }
   bool any4f(float4 v) { return dot(v, v) != 0.f; }

   bool all1i(int  v) { return v                         != 0; }
   bool all2i(int2 v) { return v.x * v.y                 != 0; }
   bool all3i(int3 v) { return v.x * v.y * v.z           != 0; }
   bool all4i(int4 v) { return (v.x * v.y) * (v.z * v.w) != 0; }

   bool all1u(uint  v) { return v                         != 0; }
   bool all2u(uint2 v) { return v.x * v.y                 != 0; }
   bool all3u(uint3 v) { return v.x * v.y * v.z           != 0; }
   bool all4u(uint4 v) { return (v.x * v.y) * (v.z * v.w) != 0; }

   bool all1f(float  v) { return v                         != 0.f; }
   bool all2f(float2 v) { return v.x * v.y                 != 0.f; }
   bool all3f(float3 v) { return v.x * v.y * v.z           != 0.f; }
   bool all4f(float4 v) { return (v.x * v.y) * (v.z * v.w) != 0.f; }

#else

   #error Platform macro is missing

#endif

#if !defined(_API_VULKAN) && !defined(_AP_NX64)
   #if defined(_AP_ORBIS)
      uint   packHalf2x16   (float2 v)  { return PackFloat2ToUInt(v.x, v.y); }
      float2 unpackHalf2x16 (uint pack) { return float2(f16tof32(pack), f16tof32(pack >> 16)); }
   #else
      uint   packHalf2x16   (float2 v)  { return f32tof16(v.x) | (f32tof16(v.y) << 16); }
      float2 unpackHalf2x16 (uint pack) { return float2(f16tof32(pack), f16tof32(pack >> 16)); }
   #endif
#endif

#define HALF2(x)  SET_VECTOR(half2, x)
#define HALF3(x)  SET_VECTOR(half3, x)
#define HALF4(x)  SET_VECTOR(half4, x)
#define FLOAT2(x) SET_VECTOR(float2, x)
#define FLOAT3(x) SET_VECTOR(float3, x)
#define FLOAT4(x) SET_VECTOR(float4, x)

#define ZEROH4 HALF4(0.0)
#define ZEROH3 HALF3(0.0)
#define ZEROH2 HALF2(0.0)
#define ZEROF4 FLOAT4(0.0)
#define ZEROF3 FLOAT3(0.0)
#define ZEROF2 FLOAT2(0.0)

#define VID_USE_INVERTED_Z

#ifdef COMMON_SHADER_INVALID_BLOCK
   #error @INVALID_DEFINES@
#endif

#if defined(_AP_DURANGO)
   #define ALU64_INTRINSICS
   
   #define uint64_t uint2
   #define  int64_t uint2
   
   #define PackInt2x32     int2
   #define PackUint2x32   uint2
   #define UnpackInt2x32  
   #define UnpackUint2x32 
   
   #define Int64To32(i64)  ((i64)[1])
   #define Uint64To32(u64) ((u64)[1])
   
   #define AddI64(a, b) __XB_AddI64((a), (b))
   #define SubI64(a, b) __XB_SubI64((a), (b))
   #define DivI64(a, b) __XB_DivI64((a), (b))
   #define DivU64(a, b) __XB_DivU64((a), (b))
   
   #define MaxI64(a, b) __XB_MaxI64((a), (b))
   #define MaxU64(a, b) __XB_MaxU64((a), (b))
   #define MinI64(a, b) __XB_MinI64((a), (b))
   #define MinU64(a, b) __XB_MinU64((a), (b))

   #define ModI64(a, b) __XB_ModI64((a), (b))
   #define ModU64(a, b) __XB_ModU64((a), (b))
   #define MulI64(a, b) __XB_MulI64((a), (b))
   #define MulU64(a, b) __XB_MulU64((a), (b))
   
   #define NegI64(a)    __XB_NegI64((a))
   
   #define ShlU64(u64, shift) uint2(((u64)[0] << (shift)) | (((u64)[1] >> (32 - (shift))) & ((1 << (shift)) - 1)), (u64)[1] << (shift))
   #define ShrU64(u64, shift) uint2(((u64)[1] >> (shift)) | ( (u64)[0] << (32 - (shift))), ((u64)[0] >> (shift))).yx
   #define ShrI64(i64, shift) __XB_ShrI64((i64), (shift))
   
   #define  Or64_32(a, b) uint2((a)[0], (a)[1] | (b))
   #define And64_32(a, b) uint2((a)[0], (a)[1] & (b))
   
#elif defined(_API_VULKAN) || defined(_AP_ORBIS) || defined(_AP_NX64)
   #define ALU64_INTRINSICS
   
   #if defined(_API_VULKAN)
      #extension GL_ARB_gpu_shader_int64 : enable
      // uint64_t int64_t notation
      
      #define PackInt2x32(h, l)   packInt2x32(int2((l), (h)))
      #define PackUint2x32(h, l)  packUint2x32(uint2((l), (h)))
      #define UnpackInt2x32(i64)  unpackInt2x32(i64).yx
      #define UnpackUint2x32(u64) unpackUint2x32(u64).yx
   
   #else
   
      #if defined(_AP_ORBIS)
         #define uint64_t unsigned long
         #define  int64_t long
      #endif
      
      #define PackInt2x32(h, l)     (( int64_t(h) << 32) |  int64_t(l))
      #define PackUint2x32(h, l)    ((uint64_t(h) << 32) | uint64_t(l))
      #define UnpackInt2x32(i64)     int2( int((i64) & 0xFFFFFFFF),  int(((i64) >> 32) & 0xFFFFFFFF)).yx
      #define UnpackUint2x32(u64)   uint2(uint((u64) & 0xFFFFFFFF), uint(((u64) >> 32) & 0xFFFFFFFF)).yx
   #endif
   
   #define Int64To32(i64)   int(i64)
   #define Uint64To32(u64) uint(u64)
   
   #define AddI64(a, b) ((a) + (b))
   #define SubI64(a, b) ((a) - (b))
   #define DivI64(a, b) ((a) / (b))
   #define DivU64(a, b) ((a) / (b))
   
   #define MaxI64(a, b) max((a), (b))
   #define MaxU64(a, b) max((a), (b))
   #define MinI64(a, b) min((a), (b))
   #define MinU64(a, b) min((a), (b))

   #define ModI64(a, b) ((a) % (b))
   #define ModU64(a, b) ((a) % (b))
   #define MulI64(a, b) ((a) * (b))
   #define MulU64(a, b) ((a) * (b))
   
   #define NegI64(a)    (-(a))
   
   #define ShlU64(u64, shift) ((u64) << (shift))
   #define ShrU64(u64, shift) ((u64) >> (shift))
   #define ShrI64(i64, shift) ((i64) >> (shift))
   
   #define  Or64_32(a, b) ((a) | (b))
   #define And64_32(a, b) ((a) & (b))
   
#elif defined(_AP_PC) && defined(_API_DX11)
   #define uint64_t uint2
   #define  int64_t uint2
   
   #define PackInt2x32     int2
   #define PackUint2x32   uint2
   #define UnpackInt2x32 
   #define UnpackUint2x32
   
   #define Int64To32(i64)  ((i64)[1])
   #define Uint64To32(u64) ((u64)[1])
   
   #define ShlU64(u64, shift) uint2(((u64)[0] << (shift)) | (((u64)[1] >> (32 - (shift))) & ((1 << (shift)) - 1)), (u64)[1] << (shift))
   
   // compiler is messing with operations order and adds extra mov when u64 no longer needed. Set explicit order and revert result
   #define ShrU64(u64, shift) uint2(((u64)[1] >> (shift)) | ( (u64)[0] << (32 - (shift))), ((u64)[0] >> (shift))).yx
   
   #define  Or64_32(a, b) uint2((a)[0], (a)[1] | (b))
   #define And64_32(a, b) uint2((a)[0], (a)[1] & (b))
   
#endif

#if defined(_API_VULKAN) && defined(USE_FP16)
   #extension GL_AMD_gpu_shader_half_float : enable
   #extension GL_AMD_gpu_shader_int16 : enable
   
   #define fp16_t4 f16vec4
   #define fp16_t3 f16vec3
   #define fp16_t2 f16vec2
   #define fp16_t  float16_t
   
   #define i16_t4 i16vec4
   #define i16_t3 i16vec3
   #define i16_t2 i16vec2
   #define i16_t  int16_t   
 
#else
   #define fp16_t4 float4
   #define fp16_t3 float3
   #define fp16_t2 float2
   #define fp16_t  float
   
   #define i16_t4 int4
   #define i16_t3 int3
   #define i16_t2 int2
   #define i16_t  int  
#endif

// Wave intrinsics
#if defined(_API_VULKAN)

   #define WAVE_INTRINSICS 
   #extension GL_KHR_shader_subgroup_basic : enable
   uint WaveGetLaneCount() { return gl_SubgroupSize; }
   //#define WaveLaneIndex      gl_SubgroupInvocationID
   //#define WaveIsFirstLane    subgroupElect
   
   #extension GL_KHR_shader_subgroup_vote : enable
   #define WaveActiveAnyTrue  subgroupAny
   #define WaveActiveAllTrue  subgroupAll
   //#define WaveActiveAllEqual subgroupAllEqual
   
   #extension GL_KHR_shader_subgroup_ballot : enable
   #define WaveReadLaneAt     subgroupBroadcast
   #define WaveReadLaneFirst  subgroupBroadcastFirst
   
   #extension GL_KHR_shader_subgroup_arithmetic : enable
   #define WaveActiveSum      subgroupAdd
   #define WaveActiveBitAnd   subgroupAnd
   #define WaveActiveBitOr    subgroupOr
   #define WaveActiveMax      subgroupMax
   #define WaveActiveMin      subgroupMin
   
#elif defined(_AP_ORBIS)
   #define WAVE_INTRINSICS
   
   uint WaveGetLaneCount() { return 64u; }
   
   #define WaveActiveAnyTrue(x)  (ballot((x)) != 0)
   #define WaveActiveAllTrue(x)  (ballot((x)) == ballot(true))
   
   float  WaveReadLaneFirst(float  x) { return ReadFirstLane(x); }
   float2 WaveReadLaneFirst(float2 x) { return ReadFirstLane(x); }
   float3 WaveReadLaneFirst(float3 x) { return ReadFirstLane(x); }
   float4 WaveReadLaneFirst(float4 x) { return ReadFirstLane(x); }
   
   int    WaveReadLaneFirst(int  x)   { return ReadFirstLane(x); }
   int2   WaveReadLaneFirst(int2 x)   { return ReadFirstLane(x); }
   int3   WaveReadLaneFirst(int3 x)   { return ReadFirstLane(x); }
   int4   WaveReadLaneFirst(int4 x)   { return ReadFirstLane(x); }
   
   uint   WaveReadLaneFirst(uint  x)  { return ReadFirstLane(x); }
   uint2  WaveReadLaneFirst(uint2 x)  { return ReadFirstLane(x); }
   uint3  WaveReadLaneFirst(uint3 x)  { return ReadFirstLane(x); }
   uint4  WaveReadLaneFirst(uint4 x)  { return ReadFirstLane(x); }
   
   bool   WaveReadLaneFirst(bool x)   { return (bool)ReadFirstLane((uint)x); }
   
   
   float  WaveReadLaneAt(float  x, const uint laneId) { return ReadLane(x, laneId); }
   float2 WaveReadLaneAt(float2 x, const uint laneId) { return ReadLane(x, laneId); }
   float3 WaveReadLaneAt(float3 x, const uint laneId) { return ReadLane(x, laneId); }
   float4 WaveReadLaneAt(float4 x, const uint laneId) { return ReadLane(x, laneId); }
   
   int    WaveReadLaneAt(int  x, const uint laneId)   { return ReadLane(x, laneId); }
   int2   WaveReadLaneAt(int2 x, const uint laneId)   { return ReadLane(x, laneId); }
   int4   WaveReadLaneAt(int4 x, const uint laneId)   { return ReadLane(x, laneId); }
   
   uint   WaveReadLaneAt(uint  x, const uint laneId)  { return ReadLane(x, laneId); }
   uint2  WaveReadLaneAt(uint2 x, const uint laneId)  { return ReadLane(x, laneId); }
   uint3  WaveReadLaneAt(uint3 x, const uint laneId)  { return ReadLane(x, laneId); }
   uint4  WaveReadLaneAt(uint4 x, const uint laneId)  { return ReadLane(x, laneId); }
   
   bool   WaveReadLaneAt(bool x, const uint laneId)   { return (bool)ReadLane((uint)x, laneId); }
   
   #define WaveActiveSum      CrossLaneAdd
   #define WaveActiveBitAnd   CrossLaneAnd
   #define WaveActiveBitOr    CrossLaneOr
   #define WaveActiveMax      CrossLaneMax
   #define WaveActiveMin      CrossLaneMin
   
#elif defined(_AP_DURANGO)
   #define WAVE_INTRINSICS

   uint WaveGetLaneCount() { return 64u; }
   //#define WaveLaneIndex      __XB_GetLaneID
   
   #define WaveActiveAnyTrue(x)  any2u(__XB_Ballot64((x)))
   #define WaveActiveAllTrue(x)  (!any2u(__XB_GetEntryActiveMask64() - __XB_Ballot64((x))))
   
   #define WaveReadLaneAt     __XB_ReadLane
   #define WaveReadLaneFirst  __XB_MakeUniform
   
   #define WaveActiveSum      __XB_WaveAdd_F32
   #define WaveActiveBitAnd   __XB_WaveAND
   #define WaveActiveBitOr    __XB_WaveOR
   
   float WaveActiveMax(in float x) { return __XB_WaveMax_F32(x); }
   int   WaveActiveMax(in int x)   { return __XB_WaveMax_I32(x); }
   uint  WaveActiveMax(in uint x)  { return __XB_WaveMax_U32(x); }
   
   float WaveActiveMin(in float x) { return __XB_WaveMin_F32(x); }
   int   WaveActiveMin(in int x)   { return __XB_WaveMin_I32(x); }
   uint  WaveActiveMin(in uint x)  { return __XB_WaveMin_U32(x); }
   
#else
   //stub to avoid lots of #ifdefs 
   #define WaveReadLaneFirst 
#endif

#endif // SYSTEM_FX
