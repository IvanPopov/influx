// The buffer contains indicies of dead particles.
RWStructuredBuffer<uint> uavDeadIndices: register(u0);


// The buffer contains the state of the particles, Alive or dead.
RWBuffer<uint> uavStates: register(u1);


struct Part
{
	float3 speed;
	float3 pos;
	float size;
	float timelife;
	int updateCount;
};

// The buffer contains user-defined particle data.
RWStructuredBuffer<Part> uavParticles: register(u2);


[numthreads(1, 1, 1)]
void CSParticlesResetRoutine(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)
{
	uint tid = DTid.x;
	if (tid >= 1000) return;
	uavDeadIndices[tid] = tid;
	uavStates[tid] = 0;
	Part Particle;
	Particle.speed = float3(0.f, 0.f, 0.f);
	Particle.pos = float3(0.f, 0.f, 0.f);
	Particle.size = 0.f;
	Particle.timelife = 0.f;
	Particle.updateCount = 0;
	uavParticles[tid] = Particle;
}

RWBuffer<uint2> uavCeatetionRequests: register(u3);


float random(float2 uv)
{
	return frac(sin(dot(uv, float2(12.9898f, 78.233f))) * 43758.5453123f);
}

float3 randVUnit(float seed)
{
	float3 v;
	v.x = random(float2(seed, 0.f)) - 0.5f;
	v.y = random(float2(seed, 1.f)) - 0.5f;
	v.z = random(float2(seed, 2.f)) - 0.5f;
	return normalize(v);
}

uniform float elapsedTimeLevel: ELAPSED_TIME_LEVEL;

float deg2rad(float deg)
{
	return((deg) * 3.14f / 180.f);
}

uniform float elapsedTime: ELAPSED_TIME;

float3 RndVUnitConus(float3 vBaseNorm, float angle, int partId = 0)
{
	float3 vRand;
	float3 vBaseScale; float3 vTangScale;
	float3 v; float3 vTang;
	v = randVUnit(elapsedTimeLevel);
	vTang = v - vBaseNorm * dot(v, vBaseNorm);
	vTang = normalize(vTang);
	angle = deg2rad(random(float2(elapsedTimeLevel,(float)partId * elapsedTime)) * angle);
	vRand = vBaseNorm * cos(angle) + vTang * sin(angle);
	vRand = normalize(vRand);
	return vRand;
}

void init(out Part part, int partId)
{
	part.pos = float3(0.f, float2(0.f).x, 0.f);
	part.size = 0.1f;
	part.timelife = 0.f;
	part.updateCount = 0;
	float3 dir;
	part.speed = RndVUnitConus(float3(0.f, 1.f, 0.f), 45.f, partId);
}

[numthreads(64, 1, 1)]
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
	Part Particle;
	init(Particle, PartId);
	uavParticles[PartId] = Particle;
	// set particles's state as 'Alive'
	uavStates[PartId] = 1;
}

bool update(inout Part part)
{
	part.pos = part.speed * part.timelife * 3.f;
	part.timelife = (part.timelife + elapsedTime / 3.f);
	part.updateCount = part.updateCount + 1;
	return part.timelife < 1.f;
}

[numthreads(64, 1, 1)]
void CSParticlesUpdateRoutine(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)
{
	uint PartId = DTid.x;
	bool Alive = (bool)uavStates[PartId];

	[branch]
	if(!Alive) return;

	Part Particle = uavParticles[PartId];

	[branch]
	if (!update(Particle))
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

struct DefaultShaderInput
{
	float3 pos;
	float4 color: COLOR0;
	float size: SIZE;
};

void prerender(inout Part part, out DefaultShaderInput input)
{
	input.pos.xyz = part.pos.xyz;
	input.size = part.size;
	input.color = float4(abs(part.speed), 1.f - part.timelife);
}

AppendStructuredBuffer<DefaultShaderInput> uavPrerendered0: register(u4);


[numthreads(64, 1, 1)]
void CSParticlesPrerenderShader0(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)
{
	uint PartId = DTid.x;
	bool Alive = (bool)uavStates[PartId];

	[branch]
	if(!Alive) return;

	Part Particle = uavParticles[PartId];
	DefaultShaderInput Prerendered;
	prerender(Particle, Prerendered);
	uavPrerendered0.Append(Prerendered);
}