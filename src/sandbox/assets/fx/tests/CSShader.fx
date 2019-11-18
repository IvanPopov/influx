RWBuffer<uint2> uavCeatetionRequests: register(u0);


// The buffer contains indicies of dead particles.
RWStructuredBuffer<uint> uavDeadIndices: register(u1);


struct Part
{
	float3 speed;
	float3 pos;
	float3 size;
	float timelife;
};

// The buffer contains user-defined particle data.
RWStructuredBuffer<Part> uavParticles: register(u2);


// The buffer contains the state of the particles, Alive or dead.
RWBuffer<uint> uavStates: register(u3);


uniform float elapsedTimeLevel;

uniform float elapsedTime;

float random(float2 uv)
{
	return frac(sin(dot(uv, float2(12.9898f, 78.233f))) * 43758.5453123f);
}

float3 randUnitCircle(int partId)
{
	float2 seed = float2(elapsedTimeLevel,(float)partId * elapsedTime);
	float alpha = random(seed) * 3.14f * 2.f;
	float dist = random(seed * 2.f);
	return float3(sin(alpha), 0.f, cos(alpha)) * dist;
}

float noise(in float2 st)
{
	float2 i = floor(st);
	float2 f = frac(st);
	float a = random(i);
	float b = random(i + float2(1.f, 0.f));
	float c = random(i + float2(0.f, 1.f));
	float d = random(i + float2(1.f, 1.f));
	float2 u = f * f *(3.f - 2.f * f);
	return lerp(a, b, u.x) +(c - a) * u.y *(1.f - u.x) +(d - b) * u.x * u.y;
}

float3 sizeFromPos(float3 pos)
{
	return float3(1.f, noise(pos.xz * 1.3f + float2(elapsedTimeLevel * 1.f, 0.f)) / 0.06f, 1.f) * 0.03f;
}

void Init(out Part part, int partId)
{
	part.pos = randUnitCircle(partId);
	part.size = sizeFromPos(part.pos);
	part.timelife = 0.f;
	part.speed = float3(0.f);
}

[numthreads(1, 1, 1)]
void CSParticlesInitRoutine(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)
{
	uint GroupId = Gid.x;
	uint ThreadId = GTid.x;
	uint nPart = uavCeatetionRequests[GroupId].x;

	if (ThreadId >= nPart) return;

	int n = (int)uavDeadIndices.DecrementCounter();
	// a bit confusing way to check for particles running out
	if (n <= 0)

	{
		// not very beautiful, but a cheap way not to
		// think about the correctness of this counter
		uavDeadIndices.IncrementCounter();
		return;
	}

	uint PartId = uavDeadIndices[n];
	Part Particle = uavParticles[PartId];
	// set particles's state as 'Alive'
	uavStates[PartId] = 1;
	Init(Particle, PartId);
}

bool Update(inout Part part)
{
	part.size = sizeFromPos(part.pos);
	part.timelife = (part.timelife + elapsedTime / 3.f);
	return part.timelife < 1.f;
}

[numthreads(1, 1, 1)]
void CSParticlesUpdateRoutine(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)
{
	uint PartId = DTid.x;
	bool Alive = (bool)uavStates[PartId];

	[branch]
	if(!Alive) return;

	Part Particle = uavParticles[PartId];

	[branch]
	if (!Update(Particle))
	{
		// returning the particle index to the list of the dead
		uint n = uavDeadIndices.IncrementCounter();
		uavDeadIndices[n] = PartId;

		// set particles's state as 'dead'
		uavStates[PartId] = 0;
		return;
	}

	uavParticles[PartId] = Particle;
}

struct PartInstance
{
	float3 pos: POSITION1;
	float4 color: COLOR1;
	float3 size: SIZE1;
};

float4 ColorOverAge(Part part)
{
	float h = part.size.y / 0.9f;
	float3 w = float3(0.7f);
	float3 bc = float3(0.f, 0.7f, 0.9f) * 0.4f;
	float3 c = float3(lerp(bc.x, w.x, h), lerp(bc.y, w.y, h), lerp(bc.z, w.z, h));
	return float4(c, 0.8f *(h + 0.5f) * sin(part.timelife * 3.14f));
}

void PrerenderCylinders(inout Part part, out PartInstance instance)
{
	instance.pos.xyz = part.pos.xyz + float3(part.size) * 0.5f;
	instance.size = float3(part.size);
	instance.color = ColorOverAge(part);
}

AppendStructuredBuffer<PartInstance> uavPrerendered0: register(u4);


[numthreads(1, 1, 1)]
void CSParticlesPrerenderShader0(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)
{
	uint PartId = DTid.x;
	bool Alive = (bool)uavStates[PartId];

	[branch]
	if(!Alive) return;

	Part Particle = uavParticles[PartId];
	PartInstance Prerendered;
	PrerenderCylinders(Particle, Prerendered);
	uavPrerendered0.Append(Prerendered);
}

struct PixelInputType
{
	float4 position: POSITION;
	float4 color: COLOR;
};

struct Geometry
{
	float3 position: POSITION0;
	float3 normal: NORMAL0;
	float2 uv: TEXCOORD0;
};

uniform float4x4 modelMatrix;

uniform float4x4 viewMatrix;

uniform float4x4 projectionMatrix;

PixelInputType VSCylinders(PartInstance partInstance, Geometry geometry)
{
	PixelInputType res;
	float3 wnorm;
	wnorm = mul(modelMatrix, float4(geometry.normal, 0.f)).xyz;
	res.position = mul(modelMatrix, float4(partInstance.pos + geometry.position * partInstance.size, 1.f));
	res.position = mul(viewMatrix, res.position);
	res.position = mul(projectionMatrix, res.position);
	float3 lightDir;
	lightDir = normalize(float3(1.f, 4.f, 0.f));
	float NdL;
	NdL = max(0.f, dot(geometry.normal, lightDir) * 0.5f);
	res.color = float4(float3(NdL), 0.f) + partInstance.color;
	return res;
}

float4 PSCylinders(PixelInputType input)
{
	return input.color;
}

struct PointInstance
{
	float3 pos: POSITION1;
	float4 color: COLOR1;
};

void PrerenderLines(inout Part part, out PointInstance instance, int instanceId)
{
	float k = (float)instanceId;
	float3 pos = part.pos.xyz + float3(part.size.x * 0.5f, part.size.y, part.size.z * 0.5f);
	instance.pos = lerp(pos, float3(0.f, 0.7f, 0.f), k);
	instance.color = lerp(ColorOverAge(part), float4(1.f, 1.f, 1.f, 0.f), k);
}

AppendStructuredBuffer<PointInstance> uavPrerendered1: register(u5);


[numthreads(1, 1, 1)]
void CSParticlesPrerenderShader1(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)
{
	uint PartId = DTid.x;
	bool Alive = (bool)uavStates[PartId];

	[branch]
	if(!Alive) return;

	Part Particle = uavParticles[PartId];
	PointInstance Prerendered;
	PrerenderLines(Particle, Prerendered);
	uavPrerendered1.Append(Prerendered);
}

uniform float4x4 modelViewMatrix;

PixelInputType VSLines(PointInstance instance)
{
	PixelInputType res;
	res.position = mul(projectionMatrix, mul(modelViewMatrix, float4(instance.pos, 1.f)));
	res.color = instance.color;
	return res;
}

float4 PSLines(PixelInputType input)
{
	return input.color;
}