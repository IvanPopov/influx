/* created: Tue Jan 10 2023 21:36:40 GMT+0300 (Moscow Standard Time) */

#include <lib.hlsl>

#define M_PI 3.1415926535897932
#define OFFSET float3(0, 0, 0)

// do not change this layout (!)
struct Vert
{
    float3 pos: POSITION0;
    float3 norm: NORMAL0;
    float2 uv: TEXCOORD0;
}; 

Texture2D albedo<string name = "uv_checker.png";>; 
// Texture2D albedo

struct Part {
    float3 v1;
    float3 v2;
    float3 v3;
    float2 uv1;
    float2 uv2;
    float2 uv3;
    float3 norm;
    float timelife;
    float3 pos;
    float3 dir;
    float3 up;
    float3 right;
    float4 color;
    float id;
};

float SegCount<
  string UIName = "Segment Count";
  string UIType = "slider";
  float UIMin = 0.0f;
  float UIMax = 32.0f;
  float UIStep = 1.0f;  
> = 16.0f;

float SegDiv<
  string UIName = "Segment Div";
  string UIType = "slider";
  float UIMin = 2.0f;
  float UIMax = 16.0f;
  float UIStep = 1.0f; 
> = 6.0f;

float SegRadius<
  string UIName = "Segment Radius";
  string UIType = "slider";
  float UIMin = 0.0f;
  float UIMax = 1.0f;  
> = 0.6f;

float SegLnegth<
  string UIName = "Segment Length";
  string UIType = "slider";
  float UIMin = 0.0f;
  float UIMax = 2.0f;  
> = 1.0f;

float Speed<
  string UIName = "Speed";
  string UIType = "slider";
  float UIMin = 0.f;
  float UIMax = 4.0f;  
> = 0.5f;

float Amplitude<
  string UIName = "Amplitude";
  string UIType = "slider";
  float UIMin = 0.f;
  float UIMax = 2.0f;  
> = 1.f;

int ShowArrows<
  string UIName = "Show Arrows";
  string UIType = "slider";
  int UIMin = 0;
  int UIMax = 1;
  int UIStep = 1;  
> = 0;


float getSegTris()
{
    return SegDiv * 2.0;
}

void initFace(out Part part, int partId: PART_ID, uint spawnId: SPAWN_ID, uint face)
{
    // following values will not use

    float scale = 0.1;

    float3 v1 = float3(0, 1, 0) * scale;
    float3 v2 = float3(-0.5, 0, 0) * scale;
    float3 v3 = float3(0.5, 0, 0) * scale;
    
    part.v1 = float3(0, 10, 0) * scale;
    part.v2 = float3(-0.5, 0, 0) * scale;
    part.v3 = float3(0.5, 0, 0) * scale;
    
    
    part.uv1 = float2(0.5,0);
    part.uv2 = float2(1,1);
    part.uv3 = float2(0,1);
    part.timelife = 0.f;
    float3 n = -normalize(cross(v3 - v2, v3 - v1));

    float id = float(spawnId);

    part.id = id;

    part.pos = float3(id * scale - 2.0, 0, 0);
    part.dir = float3(0, 0, 0);
    part.norm = n;

    part.color = float4(1,1,1,1);
}


void spawner() {
    if (frameNumber == 0u) {
        float segTris = SegDiv * 2.0;
        float totalTris = segTris * SegCount;
        spawn(int(totalTris)) initFace(0u);
    }
}


float _smoothstep(float edge0, float edge1, float x)
{
   if (x < edge0) return 0.0f;
   if (x >= edge1) return 1.0f;
   // Scale/bias into [0..1] range
   x = (x - edge0) / (edge1 - edge0);
   return x * x * (3.0f - 2.0f * x);
}


float2 rotate(float id)
{
    float da = M_PI / 180.0 * (360.0 / getSegTris() * 2.0);
    float a = da * id;

    float2 v = float2(cos(a), sin(a));
    v *= 0.3;
    return v;
}


float3 _transform(float3 v, float3 r, float3 u, float3 d, float3 p = float3(0, 0, 0))
{
    float3 o;
    o.x = dot(v, r);
    o.y = dot(v, u);
    o.z = dot(v, d);
    return o + p;
}


float3x3 getTbn(float3 p1, float3 p2)
{
    float3 dir = normalize(p2 - p1);
    float3 fdir = normalize(p2 - p1);
    fdir.y = 0.0;
    fdir = normalize(fdir);
    float3 right = cross(fdir, float3(0, 1, 0));
    right = normalize(right);
    float3 up = cross(right, dir);
    up = normalize(up);

    return float3x3(right, up, dir);
}


void getTbn2(float3 p1, float3 p2, out float3 r, out float3 u, out float3 d)
{
    float3 dir = normalize(p2 - p1);
    
    float3 fdir = normalize(p2 - p1);
    fdir.y = 0.0;
    fdir = normalize(fdir);

    float3 up = float3(0, 1, 0);
    float3 right = cross(up, fdir);
    right = normalize(right);
    
    up = cross(dir, right);
    up = normalize(up);

    r = right;
    u = up;
    d = dir;
    
    // transpose
    r = float3(right.x, up.x, dir.x);
    u = float3(right.y, up.y, dir.y);
    d = float3(right.z, up.z, dir.z);
}

struct Matrix {
    float3 c0;
    float3 c1;
    float3 c2;
};

Matrix _transpose(Matrix m) {
    Matrix r;
    r.c0 = float3(m.c0.x, m.c1.x, m.c2.x);
    r.c1 = float3(m.c0.y, m.c1.y, m.c2.y);
    r.c2 = float3(m.c0.z, m.c1.z, m.c2.z);
    return r;
}

float3 _mul(Matrix m, float3 v)
{
    float3 r;
    r.x = dot(m.c0, v);
    r.y = dot(m.c1, v);
    r.z = dot(m.c2, v);
    return r;
}

Matrix getRotMatrix(float3 dir)
{
    dir = normalize(dir);
    
    float3 fdir = dir;
    fdir.y = 0.0;
    fdir = normalize(fdir);

    float3 up = float3(0, 1, 0);
    float3 right = cross(up, fdir);
    right = normalize(right);
    
    up = cross(dir, right);
    up = normalize(up);

    Matrix m;
    m.c0 = right;
    m.c1 = up;
    m.c2 = dir;
    m = _transpose(m);
    return m;
}

bool update(inout Part part) {
    part.timelife = part.timelife + elapsedTime;

    float segTris = getSegTris();

    const float pid = mod(part.id, segTris);      // Particle (triangle) Index
    const float qid = floor(pid / 2.0);           // Quad Index
    const float sid = floor(part.id / segTris);   // Segment Index
    const float3 sids = float3(sid, sid + 1.0, sid + 2.0);


    const float3 animationMask = float3(1, 1, 1);
    float3 length = sqrt(sids) * SegLnegth;  // segments length
    float3 amplitude = float3(Amplitude, Amplitude, 1.0);
    
    float3 animFactor = sids / SegCount;

    float destruct = part.timelife * Speed;

    // current segment begin
    float3 p0 = float3(0, 0, length.x) + OFFSET;
    p0.x = cos(destruct + length.x);
    p0.x *= animFactor.x;
    p0.y = sin(destruct + length.x);
    p0.y *= animFactor.x;
    
    // next segment begin (current segment end)
    float3 p1 = float3(0, 0, length.y) + OFFSET;
    p1.x = cos(destruct + length.y);
    p1.x *= animFactor.y;
    p1.y = sin(destruct + length.y);
    p1.y *= animFactor.y;

    // next segment end
    float3 p2 = float3(0, 0, length.z) + OFFSET;
    p2.x = cos(destruct + length.z);
    p2.x *= animFactor.z;
    p2.y = sin(destruct + length.z);
    p2.y *= animFactor.z;

    //float stepY = 2.0;
    //p0.y = stepY * sids.x * sids.x / SegCount;
    //p1.y = stepY * sids.y * sids.y / SegCount;
    //p2.y = stepY * sids.z * sids.z / SegCount;

    p0 *= animationMask * amplitude;
    p1 *= animationMask * amplitude;
    p2 *= animationMask * amplitude;

    float3 d0 = p1 - p0;
    float3 d1 = p2 - p1;

    if (sids.x == 0.0) {
      d0 = float3(0, 0, 1);
    }

    // Rotation matrix of current segment
    Matrix m0 = getRotMatrix(d0);
    // Rotation matrix of next segment
    Matrix m1 = getRotMatrix(d1);

    {
        // scale of current segment
        float s0 = 1.0;
        s0 = pow(SegCount - sids.x, 0.3);

        // scale of next segment
        float s1 = 1.0;
        s1 = pow(SegCount - sids.y, 0.3);

        // start radius
        const float radius = SegRadius;

        float2 t0 = rotate(qid);
        float2 t1 = rotate(qid + 1.0);
        
        // current circle point in local space
        float3 c0 = float3(t0.xy, 0) * radius;
        // next circle point in local space
        float3 c1 = float3(t1.xy, 0) * radius;

        // circle points in current segment space
        float3 v1 = _mul(m0, c0 * s0) + p0;
        float3 v2 = _mul(m0, c1 * s0) + p0;
        
        // circle points in next segment space
        float3 v3 = _mul(m1, c0 * s1) + p1;
        float3 v4 = _mul(m1, c1 * s1) + p1;

        if (mod(pid, 2.0) == 0.0) {
            // first triangle of current segment quad
            part.v1 = v1;
            part.v2 = v2;
            part.v3 = v3;
        } else {
            // second triangle of current segment quad
            part.v1 = v3;
            part.v2 = v2;
            part.v3 = v4;
        }
    }

    part.pos = p0;
    part.dir   = normalize(_mul(m0, float3(0,0,1)));
    part.up    = normalize(_mul(m0, float3(0,1,0)));
    part.right = normalize(_mul(m0, float3(1,0,0)));

    float3 n = -normalize(cross(part.v3 - part.v2, part.v3 - part.v1));
    part.norm = n;

    // UVs
    float2 uv1 = float2(0.0, qid / segTris * 2.0);
    float2 uv2 = float2(0.0, (qid + 1.0) / segTris * 2.0);
    float2 uv3 = float2(1.0, uv1.y);

    if (mod(pid, 2.0) != 0.0) {
        uv1.x = 1.0;
        uv2.x = 0.0;
        uv3.y = uv2.y;
    }

    part.uv1 = uv1;
    part.uv2 = uv2;
    part.uv3 = uv3;

    part.color = float4(1, 1, 1, 1);

    // draw segment dir, up, right
    if (ShowArrows == 1 && sids.y < SegCount && pid == 0.0) {
        draw Dir(part);
        draw Right(part);
        draw Up(part);
    }

    return part.timelife < 1000.f; 
}


////////

struct TriInstance
{
    float3 v1 : VERTEX1;
    float3 v2 : VERTEX2;
    float3 v3 : VERTEX3;
    float2 uv1: TEXCOORD1;
    float2 uv2: TEXCOORD2;
    float2 uv3: TEXCOORD3;
    float3 norm : NORMAL;

    float3 pos: CENTER;
    float4 color : COLOR0;
};


int prerenderTriangles(in Part part, out TriInstance tri)
{
    tri.v1 = part.v1;
    tri.v2 = part.v2;
    tri.v3 = part.v3;
    tri.uv1 = part.uv1;
    tri.uv2 = part.uv2;
    tri.uv3 = part.uv3;
    tri.norm = part.norm;
    tri.pos = part.pos;
    tri.color = part.color;

    return asint(distance(part.v1, cameraPosition));
}

struct VSOut
{
    float4 pos : POSITION;
    float4 color : COLOR0;
    float2 uv : TEXCOORD0;
};

struct Geometry {
    float3 position: POSITION0;
    float3 normal: NORMAL0;
    float2 uv: TEXCOORD0;
};


uniform float4x4 modelMatrix;
uniform float4x4 viewMatrix;
uniform float4x4 projectionMatrix;


VSOut VSTriangles(TriInstance inst, Geometry geom, uint vertexID: SV_VertexID)
{
    VSOut res;
    res.pos = float4(geom.position, 1);

    if (vertexID == 0u) {
         res.pos = float4(inst.v1, 1);
         res.uv = inst.uv1;
    } 

    if (vertexID == 1u) {
         res.pos = float4(inst.v2, 1);
         res.uv = inst.uv2;
    } 

    if (vertexID == 2u) {
         res.pos = float4(inst.v3, 1);
         res.uv = inst.uv3;
    } 

    res.pos.xyz = res.pos.xyz;

    res.pos = mul(viewMatrix, res.pos);
    res.pos = mul(projectionMatrix, res.pos);

    float3 lightDir;
    lightDir = normalize(float3(1.0, 4.0, 1.0));

    res.color = inst.color;

    float NdL;
    NdL = max(0.f, dot(inst.norm, lightDir) * 0.75f);

    return res;
}

SamplerState sampLinear;

float4 PSTriangle(VSOut input): COLOR 
{
    float4 c = albedo.Sample(sampLinear, input.uv) * input.color;
    return c;
}

////////

void prerenderArrow(in float3 pos, in float3 dir, float4 color, out LwiColoredInstance input)
{
    static const float3 scale = float3(0.5, 0.5, 0.5);
    
    // IP: todo: add support of direct matrix assigment
    // input.worldMatrPrev = input.worldMatr;
    input.worldMatrPrev[0] = input.worldMatr[0];
    input.worldMatrPrev[1] = input.worldMatr[1];
    input.worldMatrPrev[2] = input.worldMatr[2];

    input.worldMatr = packLwiRotXToDir(pos, dir, scale);
    color.rgb *= 4.0;
    input.dynData[0] = color;
}

int prerenderDirection(in Part part, out LwiColoredInstance input)
{
    prerenderArrow(part.pos, part.dir, float4(0, 0, 1, 1), input);
    return 0;
}

int prerenderUp(in Part part, out LwiColoredInstance input)
{
    prerenderArrow(part.pos, part.up, float4(0, 1, 0, 1), input);
    return 0;
}

int prerenderRight(in Part part, out LwiColoredInstance input)
{
    prerenderArrow(part.pos, part.right, float4(1, 0, 0, 1), input);
    return 0;
}


partFx triangles {
    Capacity = 2048; 
    // InitRoutine = compile init();
    UpdateRoutine = compile update();
    SpawnRoutine = compile spawner();

    pass Tentacle {
        ZEnable = false;
        //BlendEnable = true;
        
        PrerenderRoutine = compile prerenderTriangles();
        VertexShader = compile VSTriangles();
        PixelShader = compile PSTriangle();
        Geometry = "triangle";
        Sorting = True;
    }

    pass Dir {
        PrerenderRoutine = compile prerenderDirection();
        Geometry = "arrow";
    }

    pass Up {
        PrerenderRoutine = compile prerenderUp();
        Geometry = "arrow";
    }

    pass Right {
        PrerenderRoutine = compile prerenderRight();
        Geometry = "arrow";
    }
}

