import React = require("react");
import { Segment, Icon, Message } from "semantic-ui-react";

interface IPlaygroundProps {

}

class Playground extends React.Component<IPlaygroundProps> {
    render() {
        return (
            <Message info textAlign='center'>
                <Message.Content>
                    No effects found :/
                </Message.Content>
            </Message>
            
        );
    }
}

export default Playground;