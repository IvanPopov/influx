import { Typography } from 'material-ui';
import { Direction } from 'material-ui/styles';
import * as React from 'react';

export interface ITabContainerProps { dir: Direction; }

const TabContainer: React.SFC<ITabContainerProps> = ({ children, dir }) => {
    return (
        <Typography component='div' dir={ dir } style={ { paddingTop: 12 } }>
            { children }
        </Typography>
    );
};

export default TabContainer;
