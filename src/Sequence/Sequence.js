import React, {Component} from 'react'

import { scaleLinear } from 'd3-scale';
import { max } from 'd3-array';
import { select } from 'd3-selection';
import { line } from 'd3-shape';

export default class extends Component {

    constructor(props){
        super(props);
        this.createBarChart = this.createBarChart.bind(this);
        this.createChart = this.createChart.bind(this);
    }

    componentDidMount() {
        this.createChart();
    }

    componentDidUpdate() {
        this.createChart();
    }

    createChart() {
        const node = this.node;

        let sequence = this.props.sequence;

        let offset = {
            start: 0,
            end: sequence.length || 1
        };

        let {width, height} = node.getBoundingClientRect();

        let x = scaleLinear()
            .domain([offset.start, offset.end])
            .range([0, width]);

        select(node)
            .attr("class", "seqGroup");

        select(node)
            .selectAll('.AA')
            .remove();

        select(node)
            .selectAll(".AA")
            .data(sequence)
            .enter()
            .append("text")
            .attr("class", "AA")
            .attr("x", function (d, i) {
                return x.range([0, width])(i)
            })
            .attr("y", "1em")
            .attr("font-size", "1em")
            .attr("font-family", "monospace")
            .text(function (d, i) {
                return d
            });
    }

    render() {
        return <svg
            style={this.props.style}
            className={this.props.className}
            ref={node => this.node = node}
        />
    }
}
