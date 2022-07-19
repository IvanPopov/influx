import { IDepotActions, IDepotUpdateComplete } from '@sandbox/actions/ActionTypes';
import { handleActions } from '@sandbox/reducers/handleActions';
import IStoreState, { IDepot, IDepotFolder } from '@sandbox/store/IStoreState';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import path from 'path';
import { IncludeResolver } from '@lib/idl/parser/IParser';
import isElectron from 'is-electron';
import * as fs from 'fs';
import * as URI from '@lib/uri/uri';

const initialState: IDepot = {
    root: null,
};

export default handleActions<IDepot, IDepotActions>({
    [evt.DEPOT_UPDATE_COMPLETE]: (state, action: IDepotUpdateComplete) => ({ ...state, root: { ...state.root, ...action.payload.root } }),
}, initialState);


export function resolveName(depot: IDepot, name: string)
{
    const reduceFolder = (node: IDepotFolder): string => {
        // let file = node?.files?.find(file => path.basename(file) === name);
        let file = node?.files?.find(file => path.normalize(file).indexOf(path.normalize(name)) != -1);
        if (!file)
            if (node.folders)
                for (let folder of node.folders)
                {
                    file = reduceFolder(folder);
                    if (file) break;
                }
        return file;
    };
    return reduceFolder(depot.root);
}


// import { store } from '@sandbox/store';
export function makeResolver(depot: IDepot): IncludeResolver {
    return async (name: string): Promise<string> => {
        const fullname = resolveName(depot, name);
        const uri = URI.parse(fullname);
        switch (uri.protocol)
        {
            case 'file':
                console.assert(isElectron());
                return (await fs.promises.readFile(uri.path.substring(1))).toString();
            default:
                return (await fetch(fullname)).text();
        }
    };
}


export const getDepot = (store: IStoreState): IDepot => store.depot;
