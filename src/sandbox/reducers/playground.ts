import * as Techniques from '@lib/fx/techniques';
import * as Timeline from '@lib/fx/timeline';
import { IScope, ITechniqueInstruction } from "@lib/idl/IInstruction";
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IPlaygroundActions, IPlaygroundEffectHasBeenDropped, IPlaygroundEffectHasBeenSaved, IPlaygroundSetOptionAutosave, IPlaygroundSwitchTechniqueRuntime, IPlaygroundTechniqueUpdate } from "@sandbox/actions/ActionTypes";
import { handleActions } from '@sandbox/reducers/handleActions';
import IStoreState, { IPlaygroundState } from "@sandbox/store/IStoreState";

const initialState: IPlaygroundState = {
    technique: null,
    timeline: Timeline.make(),
    controls: { values: {}, props: {}, presets: [] },
    presets: {},
    revision: 0,
    wasm: Techniques.isWASM(),

    exportName: null, // LOCAL_SESSION_AUTOSAVE
    autosave: false
};



export default handleActions<IPlaygroundState, IPlaygroundActions>({
    [evt.PLAYGROUND_TECHNIQUE_UPDATE]: (state, { payload }: IPlaygroundTechniqueUpdate) =>
        ({ ...state, technique: payload.technique, controls: payload.controls, revision: state.revision + 1 }),
    [evt.PLAYGROUND_SWITCH_TECHNIQUE_RUNTIME]: (state, action: IPlaygroundSwitchTechniqueRuntime) =>
        ({ ...state, wasm: !state.wasm }),
    [evt.PLAYGROUND_EFFECT_HAS_BEEN_SAVED]: (state, action: IPlaygroundEffectHasBeenSaved) =>
        ({ ...state, exportName: action.payload.filename }),
    [evt.PLAYGROUND_EFFECT_HAS_BEEN_DROPPED]: (state, action: IPlaygroundEffectHasBeenDropped) =>
        ({ ...state, exportName: null, technique: null }),
    [evt.PLAYGROUND_SET_OPTION_AUTOSAVE]: (state, action: IPlaygroundSetOptionAutosave) =>
        ({ ...state, autosave: action.payload.enabled }),
}, initialState);


export const getEmitterName = (playground: IPlaygroundState) => playground.technique ? playground.technique.getName() : null;
export function filterTechniques(scope: IScope): ITechniqueInstruction[] {
    if (!scope) {
        return [];
    }

    const map = scope.techniques;
    return Object.keys(map).map(name => map[name]);
}

export const getPlaygroundState = (state: IStoreState): IPlaygroundState => state.playground;
