import { IFxTranslatorOptions } from '@lib/fx/translators/FxTranslator';
import { handleActions } from '@sandbox/reducers/handleActions';
import IStoreState, { ITranslatorParams } from '@sandbox/store/IStoreState';

const initialState: ITranslatorParams = {
    uiControlsConstantBufferRegister: 10,
    uiControlsGatherToDedicatedConstantBuffer: true
};


export default handleActions<ITranslatorParams, any/* todo */>({

}, initialState);



//- Selectors

export const asFxTranslatorOprions = (state: IStoreState): IFxTranslatorOptions => {
    return { ...state.translatorParams };
}
