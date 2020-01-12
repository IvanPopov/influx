struct __SPAWN_T__
{
	uint count;
	uint type;

	float4 payload[1];
};

// The buffer contatins information about the number and type of particles to be created
RWStructuredBuffer<__SPAWN_T__> uavCreationRequests: register(u0);


// [no description added :/]
RWBuffer<uint> uavSpawnDispatchArguments: register(u1);


void __spawn_op0__(uint nPart){
	int nGroups = (int)ceil((float)nPart / 64.f);
	for (int i = 0; i < nGroups; ++i)
	{
		uint RequestId;
		// layout: [ uint GroupCountX, uint GroupCountY, uint GroupCountZ ]
		InterlockedAdd(uavSpawnDispatchArguments[0], 1u, RequestId);
		uavCreationRequests[RequestId].count = min(nPart, 64u);
		uavCreationRequests[RequestId].type = 0u;
		nPart = nPart - 64u;
	}
}

int Spawn()
{
	return 1;
}

uniform float elapsedTime: ELAPSED_TIME;

[numthreads(1, 1, 1)]
void CSParticlesSpawnRoutine(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)
{
	if (DTid.x != 0u) return;

	// usage of 4th element of uavSpawnDispatchArguments as temp value of number of particles
	float nPartAddFloat = asfloat(uavSpawnDispatchArguments[3]) + (float)Spawn() * elapsedTime;
	float nPartAdd = floor(nPartAddFloat);
	uavSpawnDispatchArguments[0] = 0u;
	uavSpawnDispatchArguments[1] = 1u;
	uavSpawnDispatchArguments[2] = 1u;
	uavSpawnDispatchArguments[3] = asuint(nPartAddFloat - nPartAdd);
	__spawn_op0__((uint)nPartAdd);
}

// The buffer contains indicies of dead particles.
RWStructuredBuffer<uint> uavDeadIndices: register(u2);


// The buffer contains the state of the particles, Alive or dead.
RWBuffer<uint> uavStates: register(u3);


struct Part
{
	float3 speed;
	float3 pos;
	float size;
	float timelife;
	uint depth;
};

// The buffer contains user-defined particle data.
RWStructuredBuffer<Part> uavParticles: register(u4);


[numthreads(64, 1, 1)]
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
	Particle.depth = 0;
	uavParticles[tid] = Particle;
}

void __spawn_op1__(uint nPart, uint depth = 0u){
	int nGroups = (int)ceil((float)nPart / 64.f);
	for (int i = 0; i < nGroups; ++i)
	{
		uint RequestId;
		// layout: [ uint GroupCountX, uint GroupCountY, uint GroupCountZ ]
		InterlockedAdd(uavSpawnDispatchArguments[0], 1u, RequestId);
		uavCreationRequests[RequestId].count = min(nPart, 64u);
		uavCreationRequests[RequestId].type = 1u;
		uavCreationRequests[RequestId].payload[0][0] = asfloat(depth[0]);
		nPart = nPart - 64u;
	}
}

bool update(inout Part part)
{
	part.timelife = part.timelife + elapsedTime * 0.25f;
	part.pos = part.speed * part.timelife;
	if(part.depth == 0u)
	{
		__spawn_op1__(1u, 1);

		part.depth = 10u;
	}
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

void init(out Part part, int partId, uint depth = 0u)
{
	part.pos = float3(0.f, float2(0.f).x, 0.f);
	part.size = 0.1f;
	part.timelife = 0.f;
	part.depth = depth;
	part.speed = float3(0.f, 5.f, 0.f);
}

[numthreads(64, 1, 1)]
void CSParticlesInitRoutine(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)
{
	uint GroupId = Gid.x;
	uint ThreadId = GTid.x;
	uint nPart = uavCreationRequests[GroupId].count;

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
	uint type = uavCreationRequests[GroupId].type;
	if (type == 0u)
	{
		init(Particle, PartId);
	}
	else if (type == 1u)
	{
		uint depth = 0u;
		depth[0] = asuint(uavCreationRequests[GroupId].payload[0][0]);

		init(Particle, PartId, depth);
	}
	uavParticles[PartId] = Particle;
	// set particles's state as 'Alive'
	uavStates[PartId] = 1;
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

AppendStructuredBuffer<DefaultShaderInput> uavPrerendered0: register(u5);


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