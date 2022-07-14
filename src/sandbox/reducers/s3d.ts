import { IS3DActions, IS3DConnectP4Success, IS3DInitEnv, IS3DInitEnvFailed, IS3DInitEnvSuccess } from "@sandbox/actions/ActionTypes";
import { IS3DState } from "@sandbox/store/IStoreState";
import { handleActions } from "./handleActions";
import * as evt from '@sandbox/actions/ActionTypeKeys';

const initialState: IS3DState = {
    env: null,
    p4: null
};

export default handleActions<IS3DState, IS3DActions>({
    [evt.S3D_INIT_ENV_SUCCESSED]: (state, action: IS3DInitEnvSuccess) => ({ ...state, env: action.payload.env }),
    [evt.S3D_INIT_ENV_FAILED]: (state, action: IS3DInitEnvFailed) => ({ ...state, env: null }),
    [evt.S3D_CONNECT_P4_SUCCESSED]: (state, action: IS3DConnectP4Success) => ({ ...state, p4: action.payload.info }),
}, initialState);

