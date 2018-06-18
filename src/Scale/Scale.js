import React, {Component} from 'react'

import { scaleLinear } from 'd3-scale';
import { select, event } from 'd3-selection';
import { zoom } from 'd3-zoom';
import { axisBottom } from 'd3-axis';
import {format as d3Format} from "d3-format";


export default class extends Component {

    constructor(props){
        super(props);
        this.createChart = this.createChart.bind(this);
        this.zoomed = this.zoomed.bind(this);
        this.draw = this.draw.bind(this);
    }

    componentDidMount() {
        this.createChart();
    }

    shouldComponentUpdate(nextProps){
        if (nextProps.translate !== this.props.translate){
            this.zoomed(nextProps.translate);
            return false;
        } else {
            return true;
        }
    }

    componentDidUpdate() {
        this.draw();
    }

    zoomed(t){
        if(t !== undefined){
            this.x.domain(t.rescaleX(this.x2).domain());
        } else if(this.props.onZoom !== undefined) {
            if (event.sourceEvent && event.sourceEvent.type === "brush") return; // ignore zoom-by-brush

            let t = event.transform;
            this.props.onZoom(t);
        } else {
            if (event.sourceEvent && event.sourceEvent.type === "brush") return; // ignore zoom-by-brush

            let t = event.transform;

            // Propagate event
            this.x.domain(t.rescaleX(this.x2).domain());
        }

        this.draw();
    }

    createChart() {
        const node = this.node;

        let {width, height} = node.getBoundingClientRect();
        let sequence = this.props.sequence;

        let offset = this.props.offset || {
            start: 0,
            end: sequence.length || 1
        };

        let leftDistance = 20;

        this.x = scaleLinear()
            .domain([offset.start, offset.end])
            .range([0, width-leftDistance]);

        this.x2 = this.x.copy();

        let zoomE = zoom()
            .scaleExtent([1, 10])
            .translateExtent([[0, 0], [width-leftDistance, 0]])
            .extent([[0, 0], [width-leftDistance, 0]])
            .on("zoom", this.zoomed);

        select(node)
            .attr("class", "seqGroup");

        this.g = select(node)
            .append("g")
            .attr("class", "AAGroup")
            .attr("width", width)
            .attr("height", height);

        select(node)
            .append("rect")
            .attr("class", "zoom")
            .style("fill", "none")
            .style("pointer-events", "all")
            .attr("width", width)
            .attr("height", height)
            .call(zoomE);

        this.draw();
    }

    draw(){
        this.g
            .selectAll('.xaxis')
            .remove();

        let xAxis = axisBottom()
            .scale(this.x)
            .tickFormat(d3Format("d"));

        this.g
            .append("g")
            .attr("class", "xaxis")
            .attr("transform", "translate(10, 0)")
            .call(xAxis);
    }

    render() {
        return <svg
            style={{height:"1em", ...this.props.style}}
            className={this.props.className}
            ref={node => this.node = node}
        />
    }
}
