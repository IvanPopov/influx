 #include <lib.hlsl>

uniform uint   instanceTotal: INSTANCE_TOTAL; // number of difference lwi instances

#define STAGE_TRUNK 0u
#define STAGE_LEAFS 1u
#define STAGE_BIRD 2u

#define INIT_SIZE 0.35f

#define TRUNK_LEN 4.f
#define TRUNK_DENSITY 45

#define LEAFS_FALLEN_TIMELIFE 0.6f

struct Part {
   float3 pos;
   float size;
   float timelife;
   float3 dir;

   float rootRandSeed;
   int posInHierarchy;
   uint stage;
};


float3 crossProduct(float3 m, float3 n)
{
    return float3((m.y * n.z - m.z * n.y), -(m.x * n.z - m.z * n.x), (m.x * n.y - m.y * n.x));
}


void init_base(out Part part, int partId, float3 pos, float size, float parentTimelife, float3 dir, int posInHierarchy, uint stage, float rootRandSeed)
{
   part.pos = pos;
   part.size = size;
   part.timelife = parentTimelife;
   part.dir = dir;
   part.posInHierarchy = posInHierarchy;
   part.stage = stage;
   part.rootRandSeed = rootRandSeed;
}

void initTrunkRand(out Part part, int partId)
{
   float2 seed = float2((float)(partId) * elapsedTimeLevel, (float)(partId) * elapsedTime);
    
   float areaOfPlane = 8.f;
   float3 randPosOnPlane = float3(random(seed.xy), 0.f, random(seed.yx)) * float3(areaOfPlane) - float3(areaOfPlane, 0.f, areaOfPlane) / 2.f;

   float initSize = INIT_SIZE;

   init_base(part, partId, randPosOnPlane, initSize, 0.f, float3(0.f, 1.f, 0.f), 1, STAGE_TRUNK, random(seed.xy));
}


int Spawn()
{
   return 1;
}


void UpdateTrunk(inout Part part, int partId)
{
    // Spawn next trunk particles once
    if (part.posInHierarchy > 0) {
        if (part.posInHierarchy < TRUNK_DENSITY) {
            float2 seed = float2((float)(partId) * elapsedTimeLevel, (float)(partId) * elapsedTime);
            float chance = random(seed);

            float3 randVec = float3(chance, random(float2(seed.y, seed.x)), random(float2(seed.x + seed.y, seed.y + 13.149845f)));
            randVec = normalize(randVec * 2.f - float3(1.f));

            float posInHierarchyMask = abs((float)part.posInHierarchy / (float)TRUNK_DENSITY);


            // spawn trunk and branches
            float branchingCoef = 1.f - abs(1.f - posInHierarchyMask * 2.f);
            float3 newDir = normalize(part.dir + randVec * 0.4f * posInHierarchyMask);
           
            float3 nextPos = part.pos + part.dir * float3(TRUNK_LEN / (float)TRUNK_DENSITY);
            bool isBranching = chance < 0.3f * branchingCoef * (part.size / INIT_SIZE);
           
            float mainTrunkSizeMult = 0.98f;
            if (isBranching) {
                mainTrunkSizeMult = 0.85f;
            }
           
            spawn(1) init_base(nextPos, part.size * mainTrunkSizeMult, part.timelife, newDir, part.posInHierarchy + 1, STAGE_TRUNK, part.rootRandSeed);

            if (isBranching) {
                spawn(1) init_base(nextPos, part.size * 0.7f, part.timelife, newDir, part.posInHierarchy + 1, STAGE_TRUNK, part.rootRandSeed);
            }

            float spawnChance = (1.f - part.size / INIT_SIZE) * (1.f - part.size / INIT_SIZE) * posInHierarchyMask;

            // Spawn leafs
            bool isSpawnLeaf = chance < spawnChance * 2.1f;
            if (isSpawnLeaf) {
                float leafSize = INIT_SIZE * 0.3f;
                float3 spawnPos = part.pos + leafSize * randVec;
                spawn(1) init_base(spawnPos, leafSize, part.timelife + chance * 0.2f, float3(0.f, 1.f, 0.f), part.posInHierarchy, STAGE_LEAFS, part.rootRandSeed);
            }

            // Spawn birdss
            bool isSpawnBird = chance < spawnChance * 0.03f;
            if (isSpawnBird) {
                float birdSize = INIT_SIZE * 0.3f;
                float3 spawnPos = part.pos + birdSize * randVec;
                spawn(1) init_base(spawnPos, birdSize, part.timelife + chance * 0.3f, float3(0.f, 1.f, 0.f), part.posInHierarchy, STAGE_BIRD, part.rootRandSeed);
            }

            part.posInHierarchy = -part.posInHierarchy;
        }
    }
}


void UpdateLeafs(inout Part part, int partId) 
{
    // fallen before depth
    float2 seed = float2((float)(partId) * elapsedTimeLevel, (float)(partId) * elapsedTime);
    float chance = random(seed);

    if (part.timelife > LEAFS_FALLEN_TIMELIFE) {
        if (part.pos.y > 0.f) {
            float3 randVec = float3(chance, random(float2(seed.y, seed.x)), random(float2(seed.x + seed.y, seed.y + 13.149845f)));
            randVec = normalize(randVec * 2.f - float3(1.f));

            part.pos = part.pos - part.dir * 0.1f;
            part.dir = normalize(part.dir + randVec * 0.15f);
        }
    }
}


void UpdateBirds(inout Part part, int partId) 
{
    if (part.timelife > LEAFS_FALLEN_TIMELIFE) {
        // fallen before depth
        float2 seed = float2((float)(partId) * elapsedTimeLevel, (float)(partId) * elapsedTime);
        float chance = random(seed);

        float3 randVec = float3(chance, random(float2(seed.y, seed.x)), random(float2(seed.x + seed.y, seed.y + 13.149845f)));
        randVec = normalize(randVec * 2.f - float3(1.f));

        part.dir = normalize(part.dir * float3(1.f, 0.9f, 1.f) + randVec * 0.1f);
        part.pos = part.pos + part.dir * 0.1f;
    }
}


bool Update(inout Part part, int partId)
{
   part.timelife = part.timelife + elapsedTime * 0.15f;

   if (part.stage == STAGE_TRUNK) {
      UpdateTrunk(part, partId);
   }
   
   if (part.stage == STAGE_LEAFS) {
      UpdateLeafs(part, partId);
   }
   
   if (part.stage == STAGE_BIRD) {
      UpdateBirds(part, partId);
   }

   return part.timelife < 1.f;
}


void packLwiBillboard(in float3 pos, in float3 partDir, in float size, out float3x4 matr)
{
    float3 norm = normalize(partDir);
    float3 tang = normalize(pos - cameraPosition);
    float3 binorm = normalize(crossProduct(norm, tang));

    tang = normalize(crossProduct(norm, binorm));

    norm = -norm * size;
    tang = tang * size;
    binorm = binorm * size;

    matr[0] = float4(norm.x, tang.x, binorm.x, pos.x);
    matr[1] = float4(norm.y, tang.y, binorm.y, pos.y);
    matr[2] = float4(norm.z, tang.z, binorm.z, pos.z);
}


void packLwiRotXToDir(in float3 pos, in float3 partDir, in float3 size, out float3x4 matr)
{
    float3 norm = normalize(partDir);
    float3 tang = normalize(crossProduct(norm, float3(1.f, 0.f, 0.f)));
    float3 binorm = normalize(crossProduct(norm, tang));

    norm = norm * size.x;
    tang = tang * size.y;
    binorm = binorm * size.z;

    matr[0] = float4(norm.x, binorm.x, tang.x, pos.x);
    matr[1] = float4(norm.y, binorm.y, tang.y, pos.y);
    matr[2] = float4(norm.z, binorm.z, tang.z, pos.z);
}


void packLwiRotZToDir(in float3 pos, in float3 partDir, in float3 size, out float3x4 matr)
{
    float3 norm = normalize(partDir);
    float3 tang;
    if (abs(norm.y - 1.f) < 0.001f) {
        tang = normalize(crossProduct(norm, float3(1.f, 0.f, 0.f)));
    } else {
        tang = normalize(crossProduct(norm, float3(0.f, 1.f, 0.f)));
    }
    float3 binorm = normalize(crossProduct(norm, tang));

    norm = norm * size.x;
    tang = tang * size.y;
    binorm = -binorm * size.z;

    matr[0] = float4(tang.x, binorm.x, norm.x, pos.x);
    matr[1] = float4(tang.y, binorm.y, norm.y, pos.y);
    matr[2] = float4(tang.z, binorm.z, norm.z, pos.z);
}


void zeroMatr(out float3x4 matr)
{
    matr[0] = float4(0);
    matr[1] = float4(0);
    matr[2] = float4(0);
}


float GetWind(in Part part, in int posInHierarchy)
{
    float posHMask = abs((float)posInHierarchy) / (float)TRUNK_DENSITY;
    return (sin(elapsedTimeLevel * 3.f + part.rootRandSeed * 321.974f) + (1.f + cos(elapsedTimeLevel * 0.5f)) * 0.5f) * posHMask * posHMask * posHMask * 0.3f;
}


int prerendTrunk(inout Part part, inout LwiInstance input)
{
    if (part.stage != STAGE_TRUNK) {
        zeroMatr(input.worldMatr);
        return 0;
    }

    input.worldMatrPrev[0] = input.worldMatr[0];
    input.worldMatrPrev[1] = input.worldMatr[1];
    input.worldMatrPrev[2] = input.worldMatr[2];

    float wind = GetWind(part, part.posInHierarchy);

    float size = part.size * 1.5f;
    if (part.timelife > 0.9) {
        size = size * (1.f - part.timelife) / 0.1f;
    }

    packLwiRotXToDir(parentPosition + part.pos.xyz + float3(wind, 0.f, 0.f), part.dir, float3(TRUNK_LEN / (float)TRUNK_DENSITY * 3.f, size, size), input.worldMatr);
    return 0;
}


int prerendLeafs(inout Part part, inout LwiInstance input)
{
    if (part.stage != STAGE_LEAFS) {
        zeroMatr(input.worldMatr);
        return 0;
    }

    float size = part.size;
    float3 pos = part.pos;

    float windReduce = 1.f;
    if (part.timelife > LEAFS_FALLEN_TIMELIFE) {
        windReduce = (1.f - part.timelife) / (1.f - LEAFS_FALLEN_TIMELIFE);
        windReduce = windReduce * windReduce;
        windReduce = windReduce * windReduce;
    }

    float wind = GetWind(part, part.posInHierarchy) * windReduce * windReduce;

    if (part.timelife > 0.85) {
        size = size * (1.f - part.timelife) / 0.15f;
    }
    
    pos = pos + float3(wind, 0.f, 0.f);
    
    input.worldMatrPrev[0] = input.worldMatr[0];
    input.worldMatrPrev[1] = input.worldMatr[1];
    input.worldMatrPrev[2] = input.worldMatr[2];

    packLwiBillboard(parentPosition + pos, part.dir, size, input.worldMatr);
    return asint(part.posInHierarchy % (int)instanceTotal);
}


int prerendBirds(inout Part part, inout LwiInstance input)
{
    if (part.stage != STAGE_BIRD) {
        zeroMatr(input.worldMatr);
        return 0;
    }

    float3 pos = part.pos;

    input.worldMatrPrev[0] = input.worldMatr[0];
    input.worldMatrPrev[1] = input.worldMatr[1];
    input.worldMatrPrev[2] = input.worldMatr[2];

    float size = part.size * 1.5f;
    if (part.timelife > 0.9) {
        size = size * (1.f - part.timelife) / 0.1f;
    }

    float windReduce = 1.f;
    if (part.timelife > LEAFS_FALLEN_TIMELIFE) {
        windReduce = (1.f - part.timelife) / (1.f - LEAFS_FALLEN_TIMELIFE);
    }

    float wind = GetWind(part, part.posInHierarchy) * windReduce * windReduce * windReduce;
    pos = pos + float3(wind, 0.f, 0.f);

    packLwiRotZToDir(parentPosition + pos, part.dir, float3(size), input.worldMatr);
    input.dynData[0].x = (float)part.posInHierarchy * part.rootRandSeed * 1123.1231f;

    return 0;
}


partFx lwi {
    Capacity = 8000;
    SpawnRoutine = compile Spawn();
    InitRoutine = compile initTrunkRand();
    UpdateRoutine = compile Update();

    pass P0 {
        Sorting = TRUE;
        Geometry = "sfx_mud_chunks";
        PrerenderRoutine = compile prerendTrunk();
    }

    pass P1 {
        Sorting = TRUE;
        Geometry = "sfx_leaves";
        PrerenderRoutine = compile prerendLeafs();
    }

    pass P2 {
        Sorting = TRUE;
        Geometry = "boid_gargoyle";
        PrerenderRoutine = compile prerendBirds();
    }
}
