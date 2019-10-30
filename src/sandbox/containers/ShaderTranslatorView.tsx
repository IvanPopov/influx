import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import { mapProps } from '@sandbox/reducers';
import { getSourceCode } from '@sandbox/reducers/sourceFile';
import * as React from 'react';
import { connect } from 'react-redux';

interface IShaderTranslatorViewProps {
    
}

class ShaderTranslatorView extends React.Component<IShaderTranslatorViewProps> {
    // tslint:disable-next-line:typedef
    render() {
        return (
            <div>shader translator view</div>
        );
    }
}


export default connect<{}, {}, IShaderTranslatorViewProps>(
    mapProps(getSourceCode),
    mapActions(sourceActions))
    (ShaderTranslatorView);

