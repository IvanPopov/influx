import { IBaseAction } from "./../actions/ActionTypes";

export function handleActions<StateType extends {}, ActionType extends IBaseAction<string>>(map: { [actionType: string]: (state: StateType, action: ActionType) => StateType; }, initialState: StateType) {
    return (state: StateType, action: ActionType) => {
        state = state ? state : initialState;
        
        if (map.hasOwnProperty(action.type)) {
            return map[action.type](state, action);
        }

        return state;
    }
}