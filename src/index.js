import React, {Component} from 'react'
import Sequence from './Sequence/Sequence';
import FeatureViewer from './FeatureViewer/FeatureViewer';

export default class extends Component {
    state = {
        updateT: undefined
    };

    render() {

        let sequence = "MALLHSARVLSGVASAFHPGLAAAASARASSWWAHVEMGPPDPILGVTEAYKRDTNSKKM" +
            "NLGVGAYRDDNGKPYVLPSVRKAEAQIAAKGLDKEYLPIGGLAEFCRASAELALGENSEV" +
            "VKSGRFVTVQTISGTGALRIGASFLQRFFKFSRDVFLPKPSWGNHTPIFRDAGMQLQSYR" +
            "YYDPKTCGFDFTGALEDISKIPEQSVLLLHACAHNPTGVDPRPEQWKEIATVVKKRNLFA" +
            "FFDMAYQGFASGDGDKDAWAVRHFIEQGINVCLCQSYAKNMGLYGERVGAFTVICKDADE" +
            "AKRVESQLKILIRPMYSNPPIHGARIASTILTSPDLRKQWLQEVKGMADRIIGMRTQLVS" +
            "NLKKEGSTHSWQHITDQIGMFCFTGLKPEQVERLTKEFSIYMTKDGRISVAGVTSGNVGY" +
            "LAHAIHQVTK";

        console.log(sequence);
        console.log(sequence.length);


        return <div>
            <h2>Welcome to React components</h2>
            {/*<Sequence style={{width:"100%"}}*/}
                {/*offset={{start:3, end: 7}}*/}
                      {/*sequence={sequence} />*/}
            {/*<Sequence style={{width:"100%", height: "100%"}}*/}
                      {/*translate={this.state.updateT}*/}
                      {/*sequence={sequence} />*/}
            {/*<Sequence style={{width:"300px"}}*/}
                      {/*onZoom={() => "Do nothing"}*/}
                      {/*offset={{start:3, end: 7}}*/}
                      {/*translate={this.state.updateT}*/}
                      {/*sequence={sequence} />*/}
            {/*<br />*/}
            {/*<Sequence style={{width:"200px"}}*/}
                      {/*onZoom={(t) => this.setState({updateT: t})}*/}
                      {/*sequence={sequence} />*/}

            <FeatureViewer
                      sequence={sequence}
                      options={{
                          showAxis: true,
                          showSequence: true,
                          brushActive: true,
                          //bubbleHelp: true,
                          zoomMax:20 }}
            />


            <FeatureViewer
                sequence={"ABCDE"}
                options={{
                    showAxis: true,
                    showSequence: true,
                    brushActive: true,
                    //bubbleHelp: true,
                    zoomMax:20 }}
            />

        </div>
    }
}
