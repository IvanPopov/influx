#include <stdio.h>
#include <vector>
#include <iostream>
#include <emscripten/bind.h>

#include "lib/idl/bundles/FxBundle_generated.h"
#include "lib/fx/bytecode/VM/cpp/u32_array.h"
#include "lib/fx/bytecode/VM/cpp/bundle_uav.h"

// hack <<<
#include "lib/fx/bytecode/VM/cpp/bundle.cpp" 

using namespace emscripten;
using namespace std;

int main(void)
{
    cout << "Emscriptent \"Pipeline\" module........................[ LOADED ]" <<endl;
    return 0;
}

class EMITTER
{

};

struct BYTECODE_BUNDLE
{
    vector<BUNDLE_UAV> uavs;
    BUNDLE vmBundle;
    int groupsizex;

    void run(int numgroups) const {}
    void setConstants(map<string, uint32_t> data) const {}
};

void setupFxRoutineBytecodeBundle(
    string debugName, 
    const Fx::RoutineBytecodeBundleT& routineBundle,
    int capacity,
    vector<BUNDLE_UAV>& sharedUAVs,
    BYTECODE_BUNDLE& /*out*/ bcBundle)
{
    // todo: set debugName
    bcBundle.vmBundle.load(u32_array_t::fromVector(routineBundle.code));
}


class PIPELINE
{
    vector<BUNDLE_UAV> m_sharedUAVs;
    // EMITTER m_emitter;
public:
    PIPELINE(u32_array_t data)
    {
        load(data);
    }

    void tick()
    {

    }

private:
    void load(u32_array_t data)
    {
        Fx::BundleT bundle;
        const Fx::Bundle* pBundle = Fx::GetBundle(&data[0]);
        pBundle->UnPackTo(&bundle);

        cout << "==========================================" << endl;
        cout << "   bundle name: " << bundle.name << endl;
        cout << "bundle version: " << bundle.signature->version << endl;
        cout << "==========================================" << endl;

        loadFromBundle(bundle);
    }



    void loadFromBundle(const Fx::BundleT& fx)
    {
        auto [ name, signature, content ] = fx;
        auto [ capacity, simulationRoutines, renderPasses, particle ] = *content.AsPartBundle();
        

        BYTECODE_BUNDLE bcBundle;
        setupFxRoutineBytecodeBundle(
            name + " + /reset", 
            *simulationRoutines[Fx::EPartSimRoutines_k_Reset].AsRoutineBytecodeBundle(), 
            capacity, 
            m_sharedUAVs,
            bcBundle);

        // auto initBundle = setupFxRoutineBytecodeBundle(name + " + /init", <RoutineBytecodeBundleT>simulationRoutines[EPartSimRoutines.k_Init], capacity, uavResources);
        // auto updateBundle = setupFxRoutineBytecodeBundle(name + " + /update", <RoutineBytecodeBundleT>simulationRoutines[EPartSimRoutines.k_Update], capacity, uavResources);
        // auto spawnBundle = setupFxRoutineBytecodeBundle(name + " + /spawn", <RoutineBytecodeBundleT>simulationRoutines[EPartSimRoutines.k_Spawn], 4, uavResources);

    }
};

EMSCRIPTEN_BINDINGS(pipeline)
{ 
    value_object<u32_array_t>("Memory")
        .field("heap", &u32_array_t::ptr)
        .field("size", &u32_array_t::size);

    class_<PIPELINE>("Pipeline")
        .constructor<u32_array_t>()
        .function("tick", &PIPELINE::tick);
}