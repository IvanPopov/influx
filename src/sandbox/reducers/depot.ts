import { IDepotActions, IDepotUpdateComplete } from '@sandbox/actions/ActionTypes';
import { handleActions } from '@sandbox/reducers/handleActions';
import IStoreState, { IDepot, IDepotFolder } from '@sandbox/store/IStoreState';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import path from 'path';
import { IncludeResolver } from '@lib/idl/parser/IParser';
import * as ipc from '@sandbox/ipc';
import * as fs from 'fs';
import * as URI from '@lib/uri/uri';
import { ITextDocument } from '@lib/idl/ITextDocument';
import { createTextDocument } from '@lib/fx/TextDocument';

const initialState: IDepot = {
    root: null,
};

export default handleActions<IDepot, IDepotActions>({
    [evt.DEPOT_UPDATE_COMPLETE]: (state, action: IDepotUpdateComplete) => ({ ...state, root: { ...state.root, ...action.payload.root } }),
}, initialState);


const debug = (message: string) => {};//console.log(message);

export async function resolveName(depot: IDepot, name: string): Promise<string>
{
    debug(`Request to resolve filename "${name}".`);
    
    name = decodeURIComponent(name);
    const uri = URI.parse(name);

    // early exit for web version
    if (uri.protocol === 'file') {
        console.assert(ipc.isElectron());

        if (fs.existsSync(URI.toLocalPath(uri))) {
           debug(`Direct include has been resolved "${name}".`);
           return name;
        }
    }


    //
    // Attempt to find any folder including basename of target name
    //

    const reduceFolder = (node: IDepotFolder, name: string): string => {
        let file = node?.files?.find(file => path.normalize(file).indexOf(path.normalize(name)) != -1);
        if (!file)
            if (node.folders)
                for (let folder of node.folders)
                {
                    file = reduceFolder(folder, name);
                    if (file) break;
                }
        return file;
    };

    name = reduceFolder(depot.root, path.basename(URI.toLocalPath(uri)));
    if (name) {
        debug(`Indirect include has been resolved "${name}".`);
        return name;
    }

    debug(`Filename has not been resolved "${arguments[1]}".`);
    return null;
}


// import { store } from '@sandbox/store';
export function makeResolver(depot: IDepot): IncludeResolver {
    return async (name: string): Promise<ITextDocument> => {
        if (typeof name !== 'string') debugger;

        const fullname = await resolveName(depot, name);
        const uri = URI.parse(fullname);
        
        if (!fullname) {
            return null;
        }

        switch (uri.protocol)
        {
            case 'file':
                console.assert(ipc.isElectron());
                // todo: move readFile to ipc
                return createTextDocument(String(uri), (await fs.promises.readFile(URI.toLocalPath(uri))).toString());
            default:
                try {
                    return createTextDocument(fullname, await (await fetch(fullname)).text());
                } catch (e) {
                    console.error(`Can't resolve file "${name}"`);
                    return null;
                }
        }
    };
}


export const getDepot = (store: IStoreState): IDepot => store.depot;
