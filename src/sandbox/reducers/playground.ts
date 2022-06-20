import { ETechniqueType, IScope } from "@lib/idl/IInstruction";
import { IPartFxInstruction } from "@lib/idl/part/IPartFx";
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IPlaygroundActions, IPlaygroundEmitterUpdate, IPlaygroundSwitchEmitterRuntime } from "@sandbox/actions/ActionTypes";
import * as Emitter from '@lib/fx/emitter';
import * as Timeline from '@lib/idl/emitter/timelime';
import { handleActions } from '@sandbox/reducers/handleActions';
import IStoreState, { IPlaygroundState } from "@sandbox/store/IStoreState";

const initialState: IPlaygroundState = {
    emitter: null,
    timeline: Timeline.make(),
    $revision: 0,
    wasm: Emitter.isWASM()
};



export default handleActions<IPlaygroundState, IPlaygroundActions>({
    [evt.PLAYGROUND_EMITTER_UPDATE]: (state, action: IPlaygroundEmitterUpdate) =>
        ({ ...state, emitter: action.payload.emitter, $revision: state.$revision + 1 }),
    [evt.PLAYGROUND_SWITCH_EMITTER_RUNTIME]: (state, action: IPlaygroundSwitchEmitterRuntime) =>
        ({ ...state, wasm: !state.wasm }),
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
