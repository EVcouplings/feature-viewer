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
        this.createChart();
    }

    createChart() {
        const node = this.node;

        let sequence = this.props.sequence;

        let offset = this.props.offset || {
            start: 0,
            end: sequence.length || 1
        };

        let {width, height} = node.getBoundingClientRect();

        let x = scaleLinear()
            .domain([offset.start, offset.end])
            .range([0, width]);

        let x2 = x.copy();

        let zoomed = () => {
            if (event.sourceEvent && event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
            let t = event.transform;
            x.domain(t.rescaleX(x2).domain());

            draw();
        };

        let zoomE = zoom()
            .scaleExtent([1, Infinity])
            .translateExtent([[0, 0], [width, height]])
            .extent([[0, 0], [width, height]])
            .on("zoom", zoomed);

        select(node)
            .attr("class", "seqGroup");

        let g = select(node)
            .append("g")
            .attr("class", "AAGroup");

        select(node)
            .append("rect")
            .attr("class", "zoom")
            .style("fill", "none")
            .style("pointer-events", "all")
            .attr("width", width)
            .attr("height", height)
            .call(zoomE);



        let draw = () => {
            g
                .selectAll('.AA')
                .remove();

            g
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
                .text(function (d) {
                    return d
                });
        };

        draw();
    }

    render() {
        return <svg
            style={{height:"1em", ...this.props.style}}
            className={this.props.className}
            ref={node => this.node = node}
        />
    }
}
