import React, {Component} from 'react'

import { scaleLinear } from 'd3-scale';
import { select, event } from 'd3-selection';
import { zoom } from 'd3-zoom';

export default class extends Component {

    constructor(props){
        super(props);
        this.createChart = this.createChart.bind(this);
    }

    componentDidMount() {
        this.createChart();
    }


    componentDidUpdate() {
        this.draw();
    }


    createChart() {
    }

    render() {
        return <svg
            style={{height:"1em", ...this.props.style}}
            className={this.props.className}
            ref={node => this.node = node}
        />
    }
}
