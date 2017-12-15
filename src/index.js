import React, {Component} from 'react'
import Sequence from './Sequence/Sequence';

export default class extends Component {
    render() {

        let sequence = "AHAHAHAHHAHAHAHAHAHAHAHAHA";

        return <div>
            <h2>Welcome to React components</h2>
            <Sequence style={{width:"100%"}}
                offset={{start:3, end: 7}}
                      sequence={sequence} />
            <Sequence style={{width:"100%", height: "100%"}}
                      sequence={sequence} />
            <Sequence style={{width:"30px"}}
                      zoomed={() => console.log("Zoomed in!")}
                      sequence={sequence} />

        </div>
    }
}
