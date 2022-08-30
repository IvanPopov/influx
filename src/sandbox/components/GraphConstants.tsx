import * as React from 'react';
import { Button, Card, Divider, Form, Input, Segment, Select } from 'semantic-ui-react';
import { getCommon, mapProps } from '@sandbox/reducers';
import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import { connect } from 'react-redux';
import withStyles, { WithStylesProps } from 'react-jss';
import IStoreState, { INodeConstant } from '@sandbox/store/IStoreState';
import { nodes as nodesActions } from '@sandbox/actions';
import autobind from 'autobind-decorator';

export const styles = {

};

const types = [
    { key: 'float', value: 'float', text: 'float' },
    { key: 'int', value: 'int', text: 'int' },
    { key: 'uint', value: 'uint', text: 'uint' },
    { key: 'bool', value: 'bool', text: 'bool' },
];

function Constant({ desc, index, removeConst }) {
    return (
        <div>
            <span>{desc.type} {desc.name}  = {desc.value}</span>
            <div>
                <Button onClick={() => removeConst(desc.name)}>✕</Button>
            </div>
        </div>
    );
}

function FormConstants({ addConstant }) {
    const [name, setName] = React.useState("");
    const [type, setType] = React.useState("");
    const [value, setValue] = React.useState("");

    const handleSubmit = e => {
        e.preventDefault();
        if (!value || !name || !type) return;
        addConstant(name, type, value);
        setName("");
        setType("");
        setValue("");
    };

    return (
        <Form size={'tiny'} key={'tiny'} onSubmit={handleSubmit}>
            <Form.Group widths='equal'>
                <Form.Field>
                    <Select placeholder='Select type' options={types} onChange={(e, data) => setType(data.value as string)} />
                </Form.Field>
                <Form.Field>
                    <Input
                        placeholder='Name'
                        value={name} onChange={e => setName(e.target.value)} />
                </Form.Field>
                <Form.Field>
                    <Input
                        placeholder='Value'
                        value={value} onChange={e => setValue(e.target.value)} />
                </Form.Field>
            </Form.Group>
            <Button type='submit'>Add</Button>
            <Divider />
        </Form>
    );
}


export interface IProps extends IStoreState, Partial<WithStylesProps<typeof styles>> {
    actions: typeof nodesActions;
}


class Constants extends React.Component<IProps> {

    @autobind
    addConstant(name, type, value) {
        const desc = { name, type, value };
        this.props.actions.addConstant(desc);
    };

    @autobind
    removeConst(name) {
        this.props.actions.removeConstant(name);
    };

    render() {
        const { constants } = this.props.nodes;
        return (
            <div>
                <FormConstants addConstant={this.addConstant} />
                <div>
                    <Card.Group itemsPerRow={2}>
                    {constants.map((desc, index) => (
                        <Card raised>
                            <Card.Content>
                                <Constant
                                    key={index}
                                    index={index}
                                    desc={desc}
                                    removeConst={this.removeConst}
                                />
                            </Card.Content>
                        </Card>
                    ))}
                    </Card.Group>
                </div>
            </div>
        );
    }
}


export default connect<{}, {}, IProps>(mapProps(getCommon), mapActions({ ...nodesActions }))(withStyles(styles)(Constants)) as any;

