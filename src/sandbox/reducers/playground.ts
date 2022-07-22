import { ETechniqueType, IScope } from "@lib/idl/IInstruction";
import { IPartFxInstruction } from "@lib/idl/part/IPartFx";
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IPlaygroundActions, IPlaygroundEffectHasBeenDropped, IPlaygroundEffectHasBeenSaved, IPlaygroundEmitterUpdate, IPlaygroundSetOptionAutosave, IPlaygroundSwitchEmitterRuntime } from "@sandbox/actions/ActionTypes";
import * as Emitter from '@lib/fx/emitter';
import * as Timeline from '@lib/idl/emitter/timelime';
import { handleActions } from '@sandbox/reducers/handleActions';
import IStoreState, { IPlaygroundState } from "@sandbox/store/IStoreState";

const initialState: IPlaygroundState = {
    emitter: null,
    timeline: Timeline.make(),
    revision: 0,
    wasm: Emitter.isWASM(),

    exportName: null, // LOCAL_SESSION_AUTOSAVE
    autosave: false
};



export default handleActions<IPlaygroundState, IPlaygroundActions>({
    [evt.PLAYGROUND_EMITTER_UPDATE]: (state, action: IPlaygroundEmitterUpdate) =>
        ({ ...state, emitter: action.payload.emitter, revision: state.revision + 1 }),
    [evt.PLAYGROUND_SWITCH_EMITTER_RUNTIME]: (state, action: IPlaygroundSwitchEmitterRuntime) =>
        ({ ...state, wasm: !state.wasm }),
    [evt.PLAYGROUND_EFFECT_HAS_BEEN_SAVED]: (state, action: IPlaygroundEffectHasBeenSaved) =>
        ({ ...state, exportName: action.payload.filename }),
    [evt.PLAYGROUND_EFFECT_HAS_BEEN_DROPPED]: (state, action: IPlaygroundEffectHasBeenDropped) =>
        ({ ...state, exportName: null, emitter: null }),
    [evt.PLAYGROUND_SET_OPTION_AUTOSAVE]: (state, action: IPlaygroundSetOptionAutosave) =>
        ({ ...state, autosave: action.payload.enabled }),
}, initialState);


export const getEmitterName = (playground: IPlaygroundState) => playground.emitter ? playground.emitter.getName() : null;
export function filterPartFx(scope: IScope): IPartFxInstruction[] {
    if (!scope) {
        return [];
    }

    const map = scope.techniques;
    return Object.keys(map)
        .filter(name => map[name].type === ETechniqueType.k_PartFx)
        .map(name => <IPartFxInstruction>map[name]);
}

export const getPlaygroundState = (state: IStoreState): IPlaygroundState => state.playground;
