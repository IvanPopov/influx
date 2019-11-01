import { connectRouter } from 'connected-react-router';
import { createHashHistory } from 'history';

export const history = createHashHistory();

export default connectRouter(history);