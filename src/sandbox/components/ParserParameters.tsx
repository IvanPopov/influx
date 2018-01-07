import { Paper, StyledComponentProps, Typography, withStyles, WithStyles } from 'material-ui';
import * as React from 'react';

const decorate = withStyles<'root'>(({ mixins }) => ({
    root: mixins.gutters({
        paddingTop: 16,
        paddingBottom: 16
    })
}));

class ParserParameters extends React.Component<WithStyles<'root'>> {
    render() {
        const { classes } = this.props;
        return (
            <Paper classes={ classes } elevation={ 1 }>
                <Typography type='subheading' component='h5'>
                    Parser options
                    </Typography>
                <Typography component='p'>
                    Paper can be used to build surface or other elements for your application.
                    </Typography>
            </Paper>
        );
    }
}

export default decorate<{}>(ParserParameters);
