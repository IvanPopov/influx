#define FOO(t) t
#define _SAMPLE(tex, samp, uv)      tex.Sample(samp, FOO(FOO(uv)))
#define _SAMPLE_CUBE(tex, samp, uv) _SAMPLE(tex, samp, uv)
/*
half4 fetch_cube(TextureCube t, SamplerState s, float3 uv)
{
   return _SAMPLE_CUBE(t, s, uv.xyz);
   // ok: _SAMPLE(t, s, uv.xyz) is macro!                   
   // ok: prepare subs: tex => t, samp => s, uv => uv.xyz   | applyMacro
   // ok: switch lexer to _SAMPLE(tex, samp, uv)            | applyMacro
   // ok: get next token and exam                           | examMacro (from readToken)
   // ok: .... (process _SAMPLE, '(', tex, samp, uv, ')')
   //                                           ^^^^
   // ok: exam 'uv'                                         | examMacro
   // ok: switch lexer to uv.xyz                            | applyMacro
   // ok: get next token and exam                           | readToken
   // ok: exam 'uv'
   // ok: [recursion]
}
*/
/*
#define _SAMPLE(tex, samp, uv)      tex.Sample(samp, uv)
half4 fetch_cube(Texture2D t, SamplerState s, float3 tc)
{
   return _SAMPLE(t, s, tc.uv);
}
*/ 

/*

#define _SAMPLE(uv1)      uv1
#define _SAMPLE_CUBE(tex, samp, uv) _SAMPLE(uv.xxx)

float3 fetch_cube(TextureCube t, SamplerState s, float3 uv)
{
   return _SAMPLE_CUBE(t, s, uv.xyz);

}


*/

/*


#define _SAMPLE(uv1)      uv1
#define _SAMPLE_CUBE(uv) _SAMPLE(uv.xxx)

float3 fetch_cube(float3 uv)
{
   return _SAMPLE_CUBE(uv.xyz);

}


*/


// ----------------------------------------------------------------------------
// Get Z value from z-buffer texture (in [0, 1] range)
// ----------------------------------------------------------------------------
float sample_z(Texture2D t, SamplerState s, float2 tex)
{
   float4 depth = _SAMPLE(t, s, tex);
   return depth.x;
}
