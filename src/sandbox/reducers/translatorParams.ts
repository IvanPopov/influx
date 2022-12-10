import { IFxContextExOptions } from '@lib/fx/translators/FxTranslator';
import { handleActions } from '@sandbox/reducers/handleActions';
import IStoreState, { ITranslatorParams } from '@sandbox/store/IStoreState';

const initialState: ITranslatorParams = {
    uiControlsGatherToDedicatedConstantBuffer: true,
    uiControlsConstantBufferRegister: 10,

    globalUniformsGatherToDedicatedConstantBuffer: true,
    globalUniformsConstantBufferRegister: 11
};


export default handleActions<ITranslatorParams, any/* todo */>({

}, initialState);



//- Selectors

export const asFxTranslatorOprions = (state: IStoreState): IFxContextExOptions => {
    return { ...state.translatorParams };
}
