import React, {Component} from 'react';
import PropTypes from 'prop-types';

import { scaleLinear } from 'd3-scale';
import { select, event, mouse } from 'd3-selection';
import { line as d3Line, curveLinear, curveStepBefore } from 'd3-shape';
import { axisBottom, axisLeft } from 'd3-axis';
import { scaleOrdinal, scaleBand } from 'd3-scale';
import { format as d3Format } from 'd3-format';
import { brushX as d3Brush } from 'd3-brush';
import { interpolate } from 'd3-interpolate';

class FeatureViewer extends Component {

    constructor(props){
        super(props);
        this.createChart = this.createChart.bind(this);
    }

    componentDidMount() {
        this.createChart();
    }

    componentDidUpdate() {
        // this.draw();
    }

    createChart() {

        let self = this;
        let sequence = this.props.sequence;
        let options = this.props.options || {};

        this.events = {
            FEATURE_SELECTED_EVENT: "feature-viewer-position-selected",
            FEATURE_DESELECTED_EVENT: "feature-viewer-position-deselected",
            ZOOM_EVENT: "feature-viewer-zoom-altered"
        };

        let div = this.node;
        let {width, height} = this.node.getBoundingClientRect();
        let el = div;
        let svgElement;

        let intLength = Number.isInteger(sequence) ? sequence : null;
        let fvLength = intLength | sequence.length;
        let features = [];
        let SVGOptions = {
            showSequence: false,
            brushActive: false,
            verticalLine: false,
            dottedSequence: true
        };
        let offset = {start:1,end:fvLength};
        if (options && options.offset) {
            offset = options.offset;
            if (offset.start < 1) {
                offset.start = 1;
                console.warn("WARNING ! offset.start should be > 0. Thus, it has been reset to 1.");
            }
        }
        let pathLevel = 0;
        let svg;
        let svgContainer;
        let yData = [];
        let yAxisSVG;
        let yAxisSVGgroup;
        let Yposition = 20;
        let level = 0;
        let seqShift = 0;
        let zoom = false;
        let zoomMax = 50;
        let current_extend = {
            length : offset.end - offset.start,
            start : offset.start,
            end : offset.end
        };
        let featureSelected = {};
        let animation = true;

        function colorSelectedFeat(feat, object) {
            //change color && memorize
            if (featureSelected !== {}) select(featureSelected.id).style("fill", featureSelected.originalColor);
            if (object.type !== "path" && object.type !== "line"){
                featureSelected = {"id": feat, "originalColor": select(feat).style("fill") || object.color};
                select(feat).style("fill", "orangered");
            }
        }

        /**
         * Private Methods
         */

        //Init box & scaling
        select(div)
            .style("position", "relative")
            .style("padding", "0px")
            .style("z-index", "2");

        let margin = {
            top: 10,
            right: 20,
            bottom: 20,
            left: 110
        };
        width = width - margin.left - margin.right - 17;
        height = 600 - margin.top - margin.bottom;
        let scaling = scaleLinear()
            .domain([offset.start, offset.end])
            .range([5, width-5]);
        let scalingPosition = scaleLinear()
            .domain([0, width])
            .range([offset.start, offset.end]);




        function updateLineTooltip(mouse,pD){
            let xP = mouse-110;
            let elemHover = "";
            for (let l=0; l<pD.length;l++) {
                if (scaling(pD[l].x) < xP && scaling(pD[l+1].x) > xP) {
                    if ((xP - scaling(pD[l].x)) < (scaling(pD[l+1].x) - xP )) {
                        elemHover = pD[l];
                    }
                    else elemHover = pD[l+1];
                    break;
                }
            }
            return elemHover;
        }

        let helper = {};

        helper.tooltip = function (object) {
            let tooltipDiv;
            let selectedRect;
            let bodyNode = select(div).node();
            let tooltipColor = options.tooltipColor ? options.tooltipColor : "orangered";

            function tooltip(selection) {

                selection.on('mouseover.tooltip', function (pD, pI) {
                    // Clean up lost tooltips
                    select('body').selectAll('div.tooltip').remove();
                    // Append tooltip
                    let absoluteMousePos = mouse(bodyNode);
                    let rightside = (absoluteMousePos[0] > width);
                    if (rightside) {
                        tooltipDiv = select(div)
                            .append('div')
                            .attr('class', 'tooltip3');
                    } else {
                        tooltipDiv = select(div)
                            .append('div')
                            .attr('class', 'tooltip2');
                        tooltipDiv.style({
                            left: (absoluteMousePos[0] - 15) + 'px'
                        });
                    }
                    tooltipDiv.style({
                        bottom: (bodyNode.offsetHeight - absoluteMousePos[1] + 16) + 'px',
                        'background-color': '#eee',
                        width: 'auto',
                        'max-width': '170px',
                        height: 'auto',
                        'max-height': '68px',
                        padding: '5px',
                        "font": '10px sans-serif',
                        'text-align': 'center',
                        position: 'absolute',
                        'z-index': 45,
                        'box-shadow': '0 1px 2px 0 #656565'
                    });
                    let first_line;
                    let second_line;
                    if (object.type === "path") {
                        first_line = '<p style="margin:2px;font-weight:700;color:' + tooltipColor +'">' + pD[0].x + '&#x256d;&#x256e;' + pD[1].x + '</p>';
                        second_line = '';
                        if (pD.description) second_line = '<p style="margin:2px;color:' + tooltipColor +';font-size:9px">' + pD.description + '</p>';
                    } else if (object.type === "line") {
                        let elemHover = updateLineTooltip(absoluteMousePos[0],pD);
                        if (elemHover.description) {
                            first_line = '<p style="margin:2px;font-weight:700;color:' + tooltipColor +'">' + elemHover.x + ' : <span> ' + elemHover.y + '</span></p>';
                            second_line = '<p style="margin:2px;color:' + tooltipColor +';font-size:9px">' + elemHover.description + '</p>';
                        }
                        else {
                            first_line = '<p style="margin:2px;color:' + tooltipColor +'">position : <span id="tLineX">' + elemHover.x + '</span></p>';
                            second_line = '<p style="margin:2px;color:' + tooltipColor +'">count : <span id="tLineC">' + elemHover.y + '</span></p>';
                        }
                    } else if (object.type === "unique" || pD.x === pD.y) {
                        first_line = '<p style="margin:2px;font-weight:700;color:' + tooltipColor +'">' + pD.x + '</p>';
                        second_line = '';
                        if (pD.description) second_line = '<p style="margin:2px;color:' + tooltipColor +';font-size:9px">' + pD.description + '</p>';
                    } else {
                        first_line = '<p style="margin:2px;font-weight:700;color:' + tooltipColor +'">' + pD.x + ' - ' + pD.y + '</p>';
                        second_line = '';
                        if (pD.description) second_line = '<p style="margin:2px;color:' + tooltipColor +';font-size:9px">' + pD.description + '</p>';
                    }

                    tooltipDiv.html(first_line + second_line);
                    if (rightside) {
                        tooltipDiv.style({
                            left: (absoluteMousePos[0] + 10 - (tooltipDiv.node().getBoundingClientRect().width)) + 'px'
                        })
                    }
                })
                    .on('mousemove.tooltip', function (pD, pI) {

                        if (object.type === "line") {
                            let absoluteMousePos = mouse(bodyNode);
                            let elemHover = updateLineTooltip(absoluteMousePos[0],pD);
                            if (elemHover.description) {
                                let first_line = '<p style="margin:2px;color:' + tooltipColor +'">' + elemHover.x + ' : <span> ' + elemHover.y + '</span></p>';
                                let second_line = '<p style="margin:2px;color:' + tooltipColor +';font-size:9px">' + elemHover.description + '</p>';
                            }
                            else {
                                let first_line = '<p style="margin:2px;color:' + tooltipColor +'">position : <span id="tLineX">' + elemHover.x + '</span></p>';
                                let second_line = '<p style="margin:2px;color:' + tooltipColor +'">count : <span id="tLineC">' + elemHover.y + '</span></p>';
                            }
                            tooltipDiv.html(first_line + second_line);
//                            $('#tLineX').text(elemHover.x);
//                            $('#tLineC').text(elemHover.y);
                        }
                        // Move tooltip
                        // IE 11 sometimes fires mousemove before mouseover
                        if (tooltipDiv === undefined) { return; }
                        let absoluteMousePos = mouse(bodyNode);
                        let rightside = (absoluteMousePos[0] > width);
                        if (rightside) {
                            tooltipDiv.attr("class", "tooltip3");
                            tooltipDiv.style({
                                left: (absoluteMousePos[0] + 10 - (tooltipDiv.node().getBoundingClientRect().width)) + 'px',
                                bottom: (bodyNode.offsetHeight - absoluteMousePos[1] + 16) + 'px'
                            });
                        } else {
                            tooltipDiv.attr("class", "tooltip2");
                            tooltipDiv.style({
                                left: (absoluteMousePos[0] - 15) + 'px',
                                bottom: (bodyNode.offsetHeight - absoluteMousePos[1] + 16) + 'px'
                            })
                        }
                    })
                    .on('mouseout.tooltip', function (pD, pI) {
                        // Remove tooltip
                        tooltipDiv.remove();
                    })
                    .on('click', function (pD, pI) {
                        let xTemp;
                        let yTemp;
                        let xRect;
                        let widthRect;
                        let elemHover;

                        if(this.nodeName === "text") {
                            let rect = "#"+this.previousSibling.id;
                            if(rect.nodeName !== "#") colorSelectedFeat(rect, object);
                        }
                        else colorSelectedFeat(this, object);

                        let svgWidth = SVGOptions.brushActive ? select(".background").attr("width") : svgContainer.node().getBBox().width;
                        select('body').selectAll('div.selectedRect').remove();
                        // Append tooltip
                        selectedRect = select(div)
                            .append('div')
                            .attr('class', 'selectedRect');
                        if (object.type === "path") {
                            xTemp = pD[0].x;
                            yTemp = pD[1].x;
                        } else if (object.type === "line") {
                            let absoluteMousePos = mouse(bodyNode);
                            elemHover = updateLineTooltip(absoluteMousePos[0],pD);
                            xTemp = elemHover.x - 0.5;
                            yTemp = elemHover.x + 0.5;
                        } else if (object.type === "unique" || pD.x === pD.y) {
                            xTemp = pD.x - 0.4;
                            yTemp = pD.y + 0.4;
                        } else {
                            xTemp = pD.x;
                            yTemp = pD.y;
                        }

                        if (scaling(xTemp) < 0 && scaling(yTemp) > svgWidth) {
                            xRect = margin.left;
                            widthRect = parseInt(svgWidth) + 5;
                        } else if (scaling(xTemp) < 0) {
                            xRect = margin.left;
                            widthRect = (scaling(yTemp));
                        } else if (scaling(yTemp) > svgWidth) {
                            xRect = scaling(xTemp) + margin.left;
                            widthRect = parseInt(svgWidth) - scaling(xTemp);
                            widthRect =  widthRect + 5;
                        } else {
                            xRect = scaling(xTemp) + margin.left;
                            widthRect = (scaling(yTemp) - scaling(xTemp));
                        }
                        selectedRect.style({
                            left: xRect + 'px',
                            top: ($(div + " .svgHeader").length) ? 60 + 'px' : 10 + 'px',
                            'background-color': 'rgba(0, 0, 0, 0.2)',
                            width: widthRect + 'px',
                            height: (Yposition + 50) + 'px',
                            position: 'absolute',
                            'z-index': -1,
                            'box-shadow': '0 1px 2px 0 #656565'
                        });

                        if (CustomEvent) {
                            let event = new CustomEvent(self.events.FEATURE_SELECTED_EVENT, {
                                detail: {
                                    start: object.type === "path" ? pD[0].x : object.type === "line" ? elemHover.x : pD.x,
                                    end: object.type === "path" ? pD[1].x : object.type === "line" ? elemHover.y : pD.y,
                                    id: object.type === "path" ? pD[0].id : object.type === "line" ? elemHover.id : pD.id,
                                    description:object.type === "path" ? pD[0].description : object.type === "line" ? elemHover.description : pD.description
                                }
                            });
                            svgElement.dispatchEvent(event);
                        } else {
                            console.warn("CustomEvent is not defined....");
                        }
                        if (self.trigger) self.trigger(self.events.FEATURE_SELECTED_EVENT, {
                            start: object.type === "path" ? pD[0].x : object.type === "line" ? elemHover.x : pD.x,
                            end: object.type === "path" ? pD[1].x : object.type === "line" ? elemHover.y : pD.y,
                            id: object.type === "path" ? pD[0].id : object.type === "line" ? elemHover.id : pD.id,
                            description:object.type === "path" ? pD[0].description : object.type === "line" ? elemHover.description : pD.description
                        });

                    });
            }

            tooltip.attr = function (_x) {
                if (!arguments.length) return attrs;
                attrs = _x;
                return this;
            };

            tooltip.style = function (_x) {
                if (!arguments.length) return styles;
                styles = _x;
                return this;
            };

            return tooltip;
        };

        //COMPUTING FUNCTION
        let X = function (d) {
            return scaling(d.x);
        };
        let displaySequence = function (seq) {
            return width / seq > 5;
        };
        let rectWidth = function (d) {
            return (scaling(d.y) - scaling(d.x));
        };
        function rectX(object) {
            if (object.x === object.y) {
                return scaling(object.x-0.4);
            }
            return scaling(object.x);
        };
        function rectWidth2(d){
            if (d.x === d.y) {
                if (scaling(d.x + 0.4) - scaling(d.x - 0.4) < 2) return 2;
                else return scaling(d.x + 0.4) - scaling(d.x - 0.4);
            }
            return (scaling(d.y) - scaling(d.x));
        }

        this.onFeatureSelected = function (listener) {
            svgElement.addEventListener(self.events.FEATURE_SELECTED_EVENT, listener);
        }
        this.onFeatureDeselected = function (listener) {
            svgElement.addEventListener(self.events.FEATURE_DESELECTED_EVENT, listener);
        }

        this.onZoom = function (listener) {
            svgElement.addEventListener(self.events.ZOOM_EVENT, listener);
        }

        function addLevel(array) {
            let leveling = [];
            array.forEach(function (d) {
                if (leveling === []) {
                    leveling.push(d.y);
                    d.level = 0;
                } else {
                    let placed = false;
                    for (let k = 0; k < leveling.length; k++) {
                        if (d.x > leveling[k]) {
                            placed = true;
                            d.level = k;
                            leveling[k] = d.y;
                            break;
                        }
                    }
                    if (placed === false) {
                        leveling.push(d.y);
                        d.level = leveling.length - 1;
                    }
                }
            });
            return leveling.length;
        }

        function addLevelToBond(array) {
            let leveling = [];
            let newArray = [];
            array.forEach(function (d) {
                if (leveling === []) {
                    leveling.push(d[2].x);
                    d[1].y = 1;
                } else {
                    let placed = false;
                    for (let k = 0; k < leveling.length; k++) {
                        if (d[0].x > leveling[k]) {
                            placed = true;
                            d[1].y = k + 1;
                            leveling[k] = d[2].x;
                            break;
                        }
                    }
                    if (placed === false) {
                        leveling.push(d[2].x);
                        d[1].y = leveling.length;
                    }
                }
            });
            return leveling.length;
        }

        let lineBond = d3Line()
            .curve(curveStepBefore)
            .x(function (d) {
                return scaling(d.x);
            })
            .y(function (d) {
                return -d.y * 10 + pathLevel;
            });
        let lineGen = d3Line()
            .x(function(d) {
                return scaling(d.x);
            })
            .y(function (d) {
                return lineYscale(-d.y) * 10 + pathLevel;
            });
        let lineYscale = scaleLinear()
            .domain([0,-30])
            .range([0,-20]);
        let line = d3Line()
            .curve(curveLinear)
            .x(function (d) {
                return scaling(d.x);
            })
            .y(function (d) {
                return d.y + 6;
            });

        //Create Axis
        let xAxis = axisBottom()
            .scale(scaling)
            .tickFormat(d3Format("d"));

        function addXAxis(position) {
            svgContainer.append("g")
                .attr("class", "x axis Xaxis")
                .attr("transform", "translate(0," + (position + 20) + ")")
                .call(xAxis);
        }

        function updateXaxis(position) {
            svgContainer.selectAll(".Xaxis")
                .attr("transform", "translate(0," + (position + 20) + ")")
        }

        function updateSVGHeight(position) {
            svg.attr("height", position + 60 + "px");
            svg.select("clippath rect").attr("height", position + 60 + "px");
        }

        let yAxisScale = scaleBand()
            .domain([0, yData.length])
            .rangeRound([0, 500], .1);
        let yAxis = axisLeft()
            .scale(yAxisScale)
            .tickValues(yData) //specify an array here for values
            .tickFormat(function (d) {
                return d
            });

        function addYAxis() {
            yAxisSVG = svg.append("g")
                .attr("class", "pro axis")
                .attr("transform", "translate(0," + margin.top + ")");
            updateYaxis();
        }

        function updateYaxis() {

            yAxisSVGgroup = yAxisSVG
                .selectAll(".yaxis")
                .data(yData)
                .enter()
                .append("g");
            yAxisSVGgroup
                .append("polygon") // attach a polygon
                .attr("class", function (d) {
                    if (d.filter) return d.filter.split(" ").join("_") + "Arrow";
                    return "Arrow";
                })
                .style("stroke", "") // colour the line
                .style("fill", "#DFD5D3") // remove any fill colour
                .attr("points", function (d) {
                    return (margin.left - 105) + "," + (d.y - 3) + ", " + (margin.left - 105) + "," + (d.y + 12) + ", " + (margin.left - 15) + "," + (d.y + 12) + ", " + (margin.left - 7) + "," + (d.y + 4.5) + ", " + (margin.left - 15) + "," + (d.y -3); // x,y points
                });
            yAxisSVGgroup
                .append("text")
                .attr("class", "yaxis")
                .attr("text-anchor", "start")
                .attr("x", function () {
                    return margin.left - 102
                })
                .attr("y", function (d) {
                    return d.y + 8
                })
                .text(function (d) {
                    return d.title
                });
        }

        function forcePropagation(item) {
            item.on('mousedown', function () {
                brush_elm = svg.select(".brush").node();
                new_click_event = new Event('mousedown');
                new_click_event.pageX = d3.event.pageX;
                new_click_event.clientX = d3.event.clientX;
                new_click_event.pageY = d3.event.pageY;
                new_click_event.clientY = d3.event.clientY;
                if (brush_elm) {
                    brush_elm.dispatchEvent(new_click_event);
                }
            });
        }

        /** export to new utils file  */
        let preComputing = {
            path: function (object) {
                object.data.sort(function (a, b) {
                    return a.x - b.x;
                });
                let level = addLevel(object.data);
                object.data = object.data.map(function (d) {
                    return [{
                        x: d.x,
                        y: 0,
                        id: d.id,
                        description: d.description,
                        color: d.color
                    }, {
                        x: d.y,
                        y: d.level + 1,
                        id: d.id
                    }, {
                        x: d.y,
                        y: 0,
                        id: d.id
                    }]
                })
                pathLevel = level * 10 + 5;
                object.height = level * 10 + 5;
            },
            line: function (object) {
                if (!object.height) object.height = 10;
                let shift = parseInt(object.height);
                let level = 0;
                for (let i in object.data) {
                    object.data[i].sort(function (a, b) {
                        return a.x - b.x;
                    });
                    if (object.data[i][0].y !== 0) {
                        object.data[i].unshift({
                            x:object.data[i][0].x-1,
                            y:0
                        })
                    }
                    if (object.data[i][object.data[i].length -1].y !== 0){
                        object.data[i].push({
                            x:object.data[i][object.data[i].length -1].x+1,
                            y:0
                        })
                    }
                    let maxValue = Math.max.apply(Math,object.data[i].map(function(o){return Math.abs(o.y);}));
                    level = maxValue > level ? maxValue : level;


                    object.data[i] = [object.data[i].map(function (d) {
                        return {
                            x: d.x,
                            y: d.y,
                            id: d.id,
                            description: d.description
                        }
                    })]
                }
                lineYscale.range([0, -(shift)]).domain([0, -(level)]);
                pathLevel = shift * 10 +5;
                object.level = level;
                object.shift = shift * 10 +5;
            },
            multipleRect: function (object) {
                object.data.sort(function (a, b) {
                    return a.x - b.x;
                });
                level = addLevel(object.data);
                pathLevel = level * 10 + 5;
            }
        };

        let fillSVG = {
            typeIdentifier: function (object) {
                if (object.type === "rect") {
                    preComputing.multipleRect(object);
                    yData.push({
                        title: object.name,
                        y: Yposition,
                        filter: object.filter
                    });
                    fillSVG.rectangle(object, Yposition);
                } else if (object.type === "text") {
                    fillSVG.sequence(object.data, Yposition);
                    yData.push({
                        title: object.name,
                        y: Yposition,
                        filter: object.filter
                    });
                    scaling.range([5, width-5]);
                } else if (object.type === "unique") {
                    fillSVG.unique(object, Yposition);
                    yData.push({
                        title: object.name,
                        y: Yposition,
                        filter: object.filter
                    });
                } else if (object.type === "multipleRect") {
                    preComputing.multipleRect(object);
                    fillSVG.multipleRect(object, Yposition, level);
                    yData.push({
                        title: object.name,
                        y: Yposition,
                        filter: object.filter
                    });
                    Yposition += (level - 1) * 10;
                } else if (object.type === "path") {
                    preComputing.path(object);
                    fillSVG.path(object, Yposition);
                    Yposition += pathLevel;
                    yData.push({
                        title: object.name,
                        y: Yposition - 10,
                        filter: object.filter
                    });
                } else if (object.type === "line") {
                    if (!(Array.isArray(object.data[0]))) object.data = [object.data];
                    if (!(Array.isArray(object.color))) object.color = [object.color];
                    let negativeNumbers = false;
                    object.data.forEach(function(d){
                        if (d.filter(function(l){ return l.y < 0}).length) negativeNumbers = true;
                    });
                    preComputing.line(object);
                    fillSVG.line(object, Yposition);
                    Yposition += pathLevel;
                    yData.push({
                        title: object.name,
                        y: Yposition - 10,
                        filter: object.filter
                    });
                    Yposition += negativeNumbers ? pathLevel-5 : 0;
                }
            },
            sequence: function (seq, position, start) {
                //Create group of sequence
                start = start || 0;
                svgContainer.append("g")
                    .attr("class", "seqGroup")
                    .selectAll(".AA")
                    .data(seq)
                    .enter()
                    .append("text")
                    .attr("clip-path", "url(#clip)")
                    .attr("class", "AA")
                    .attr("text-anchor", "middle")
                    .attr("x", function (d, i) {
                        return scaling.range([5, width-5])(i + start)
                    })
                    .attr("y", position)
                    .attr("font-size", "10px")
                    .attr("font-family", "monospace")
                    .text(function (d, i) {
                        return d
                    });
            },
            sequenceLine: function () {
                //Create line to represent the sequence
                if (SVGOptions.dottedSequence){
                    let dottedSeqLine = svgContainer.selectAll(".sequenceLine")
                        .data([[{x:1,y:12},{x:fvLength,y:12}]])
                        .enter()
                        .append("path")
                        .attr("clip-path", "url(#clip)")
                        .attr("d", line)
                        .attr("class","sequenceLine")
                        .style("z-index", "0")
                        .style("stroke", "black")
                        .style("stroke-dasharray","1,3")
                        .style("stroke-width", "1px")
                        .style("stroke-opacity",0);

                    dottedSeqLine
                        .transition()
                        .duration(500)
                        .style("stroke-opacity", 1);
                }
            },
            rectangle: function (object, position) {
                //let rectShift = 20;
                if (!object.height) object.height = 12;
                let rectHeight = object.height;

                let rectShift = rectHeight + rectHeight/3;
                let lineShift = rectHeight/2 - 6;
//                let lineShift = rectHeight/2 - 6;

                let rectsPro = svgContainer.append("g")
                    .attr("class", "rectangle")
                    .attr("clip-path", "url(#clip)")
                    .attr("transform", "translate(0," + position + ")");

                let dataline=[];
                for (let i = 0; i < level; i++) {
                    dataline.push([{
                        x: 1,
                        y: (i * rectShift + lineShift)
                    }, {
                        x: fvLength,
                        y: (i * rectShift + lineShift)
                    }]);
                }
                rectsPro.selectAll(".line" + object.className)
                    .data(dataline)
                    .enter()
                    .append("path")
                    .attr("d", line)
                    .attr("class", function () {
                        return "line" + object.className
                    })
                    .style("z-index", "0")
                    .style("stroke", object.color)
                    .style("stroke-width", "1px");


                let rectsProGroup = rectsPro.selectAll("." + object.className + "Group")
                    .data(object.data)
                    .enter()
                    .append("g")
                    .attr("class", object.className + "Group")
                    .attr("transform", function (d) {
                        return "translate(" + rectX(d) + ",0)"
                    });

                rectsProGroup
                    .append("rect")
                    .attr("class", "element " + object.className)
                    .attr("id", function (d) {
                        return "f" + d.id
                    })
                    .attr("y", function (d) {
                        return d.level * rectShift
                    })
                    .attr("width", rectWidth2)
                    .attr("height", rectHeight)
                    .style("fill", function(d) { return d.color || object.color })
                    .style("z-index", "13")
                    .call(helper.tooltip(object));

                rectsProGroup
                    .append("text")
                    .attr("class", "element " + object.className + "Text")
                    .attr("y", function (d) {
                        return d.level * rectShift + rectHeight/2
                    })
                    .attr("dy", "0.35em")
                    .style("font-size", "10px")
                    .text(function (d) {
                        return d.description
                    })
                    .style("fill", "black")
                    .style("z-index", "15")
                    .style("visibility", function (d) {
                        if (d.description) {
                            return (scaling(d.y) - scaling(d.x)) > d.description.length * 8 && rectHeight > 11 ? "visible" : "hidden";
                        } else return "hidden";
                    })
                    .call(helper.tooltip(object));


                forcePropagation(rectsProGroup);
                let uniqueShift = rectHeight > 12 ? rectHeight - 6 : 0;
                Yposition += level < 2 ? uniqueShift : (level-1) * rectShift + uniqueShift;
            },
            unique: function (object, position) {
                let rectsPro = svgContainer.append("g")
                    .attr("class", "uniquePosition")
                    .attr("transform", "translate(0," + position + ")");

                let dataline=[];
                dataline.push([{
                    x: 1,
                    y: 0
                }, {
                    x: fvLength,
                    y: 0
                }]);

                rectsPro.selectAll(".line" + object.className)
                    .data(dataline)
                    .enter()
                    .append("path")
                    .attr("clip-path", "url(#clip)")
                    .attr("d", line)
                    .attr("class", "line" + object.className)
                    .style("z-index", "0")
                    .style("stroke", object.color)
                    .style("stroke-width", "1px");

                rectsPro.selectAll("." + object.className)
                    .data(object.data)
                    .enter()
                    .append("rect")
                    .attr("clip-path", "url(#clip)")
                    .attr("class", "element " + object.className)
                    .attr("id", function (d) {
                        return "f" + d.id
                    })
                    .attr("x", function (d) {
                        return scaling(d.x - 0.4)
                    })
                    .attr("width", function (d) {
                        if (scaling(d.x + 0.4) - scaling(d.x - 0.4) < 2) return 2;
                        else return scaling(d.x + 0.4) - scaling(d.x - 0.4);
                    })
                    .attr("height", 12)
                    .style("fill", function(d) {return d.color ||  object.color})
                    .style("z-index", "3")
                    .call(helper.tooltip(object));

                forcePropagation(rectsPro);
            },
            path: function (object, position) {
                let pathsDB = svgContainer.append("g")
                    .attr("class", "pathing")
                    .attr("transform", "translate(0," + position + ")");

                let dataline=[];
                dataline.push([{
                    x: 1,
                    y: 0
                }, {
                    x: fvLength,
                    y: 0
                }]);

                pathsDB.selectAll(".line" + object.className)
                    .data(dataline)
                    .enter()
                    .append("path")
                    .attr("clip-path", "url(#clip)")
                    .attr("d", lineBond)
                    .attr("class", "line" + object.className)
                    .style("z-index", "0")
                    .style("stroke", object.color)
                    .style("stroke-width", "1px");

                pathsDB.selectAll("." + object.className)
                    .data(object.data)
                    .enter()
                    .append("path")
                    .attr("clip-path", "url(#clip)")
                    .attr("class", "element " + object.className)
                    .attr("id", function (d) {
                        return "f" + d[0].id
                    })
                    .attr("d", lineBond)
                    .style("fill", "none")
                    .style("stroke", function(d) {return d[0].color || object.color})
                    .style("z-index", "3")
                    .style("stroke-width", "2px")
                    .call(helper.tooltip(object));

                forcePropagation(pathsDB);
            },
            line: function (object, position) {
                if (!object.interpolation) object.interpolation = "monotone";
                if (object.fill === undefined) object.fill = true;
                let histog = svgContainer.append("g")
                    .attr("class", "lining")
                    .attr("transform", "translate(0," + position + ")");

                let dataline=[];
                dataline.push([{
                    x: 1,
                    y: 0
                }, {
                    x: fvLength,
                    y: 0
                }]);

                histog.selectAll(".line" + object.className)
                    .data(dataline)
                    .enter()
                    .append("path")
                    .attr("clip-path", "url(#clip)")
                    .attr("d", lineBond)
                    .attr("class", "line" + object.className)
                    .style("z-index", "0")
                    .style("stroke", "black")
                    .style("stroke-width", "1px");
                object.data.forEach(function(dd,i,array){
                    histog.selectAll("." + object.className + i)
                        .data(dd)
                        .enter()
                        .append("path")
                        .attr("clip-path", "url(#clip)")
                        .attr("class", "element " + object.className + " " + object.className + i)
                        .attr("d", lineGen.interpolate(object.interpolation))
                        // .style("fill", object.fill ? shadeBlendConvert(0.6, object.color[i]) || shadeBlendConvert(0.6, "#000") : "none")
                        .style("stroke", object.color[i] || "#000")
                        .style("z-index", "3")
                        .style("stroke-width", "2px")
                        .call(helper.tooltip(object));
                })

                forcePropagation(histog);
            },
            multipleRect: function (object, position, level) {
                let rectHeight = 8;
                let rectShift = 10;
                let rects = svgContainer.append("g")
                    .attr("class", "multipleRects")
                    .attr("transform", "translate(0," + position + ")");

                for (let i = 0; i < level; i++) {
                    rects.append("path")
                        .attr("d", line([{
                            x: 1,
                            y: (i * rectShift - 2)
                        }, {
                            x: fvLength,
                            y: (i * rectShift - 2)
                        }]))
                        .attr("class", function () {
                            return "line" + object.className
                        })
                        .style("z-index", "0")
                        .style("stroke", object.color)
                        .style("stroke-width", "1px");
                }

                rects.selectAll("." + object.className)
                    .data(object.data)
                    .enter()
                    .append("rect")
                    .attr("clip-path", "url(#clip)")
                    .attr("class", "element " + object.className)
                    .attr("id", function (d) {
                        return "f" + d.id
                    })
                    .attr("x", X)
                    .attr("y", function (d) {
                        return d.level * rectShift
                    })
                    .attr("width", rectWidth)
                    .attr("height", rectHeight)
                    .style("fill", function(d) { return d.color || object.color })
                    .style("z-index", "13")
                    .call(helper.tooltip(object));

                forcePropagation(rects);
            }
        };

        this.showFilteredFeature = function(className, color, baseUrl){
            let featureSelected = yAxisSVG.selectAll("."+className+"Arrow");
            let minY = margin.left - 105;
            let maxY = margin.left - 7;

            let gradient = svg
                .append("linearGradient")
                .attr("y1", "0")
                .attr("y2", "0")
                .attr("x1", minY)
                .attr("x2", maxY)
                .attr("id", "gradient")
                .attr("spreadMethod", "pad")
                .attr("gradientUnits", "userSpaceOnUse");

            gradient
                .append("stop")
                .attr("offset", "0.3")
                .attr("stop-color", "#DFD5D3")
                .attr("stop-opacity", 1);


            let redgrad = gradient
                .append("stop")
                .attr("offset", "1")
                .attr("stop-opacity", 1)
                .attr("stop-color", "#DFD5D3");

            redgrad
                .attr("stop-color", color);

            let url_gradient = "url(#gradient)";
            let url_dropshadow = "url(#dropshadow)";
            if (baseUrl) {
                url_gradient = "url(" + baseUrl + "#gradient)";
                url_dropshadow = "url(" + baseUrl +"#dropshadow)";
            }

            let selection = yAxisSVG.selectAll("."+className+"Arrow")
                .style("fill", url_gradient)
                .style("stroke", "")
                .attr("filter", url_dropshadow);
            selection
                .attr("points", function (d) {
                    return (margin.left - 105) + "," + (d.y - 3) + ", " + (margin.left - 105) + "," + (d.y + 12) + ", " + (margin.left - 10) + "," + (d.y + 12) + ", " + (margin.left - 2) + "," + (d.y + 4.5) + ", " + (margin.left - 10) + "," + (d.y -3); // x,y points
                });
        };
        this.hideFilteredFeature = function(className){
            yAxisSVG.selectAll("."+className+"Arrow")
                .style("fill", "rgba(95,46,38,0.2)")
                .attr("filter", "")
                .attr("points", function (d) {
                    return (margin.left - 105) + "," + (d.y - 3) + ", " + (margin.left - 105) + "," + (d.y + 12) + ", " + (margin.left - 15) + "," + (d.y + 12) + ", " + (margin.left - 7) + "," + (d.y + 4.5) + ", " + (margin.left - 15) + "," + (d.y -3); // x,y points
                });
        };

        let transition = {
            rectangle: function (object) {
                svgContainer.selectAll(".line" + object.className)
                    .attr("d",line.x(function (d) {
                        return scaling(d.x);
                    }));
                let transit;
                if (animation) {
                    transit1 = svgContainer.selectAll("." + object.className + "Group")
                    //                    .data(object.data)
                        .transition()
                        .duration(500);
                    transit2 = svgContainer.selectAll("." + object.className)
                        .transition()
                        .duration(500);
                }
                else {
                    transit1 = svgContainer.selectAll("." + object.className + "Group");
                    transit2 = svgContainer.selectAll("." + object.className);
                }
                transit1.attr("transform", function (d) {
                    return "translate(" + rectX(d) + ",0)"
                });

                transit2
                    .attr("width", rectWidth2);
                svgContainer.selectAll("." + object.className + "Text")
                    .style("visibility", function (d) {
                        if (d.description) {
                            return (scaling(d.y) - scaling(d.x)) > d.description.length * 8 && object.height > 11 ? "visible" : "hidden";
                        } else return "hidden";
                    });
            },
            multiRec: function (object) {
                svgContainer.selectAll("." + object.className)
                //                    .data(object.data)
                //.transition()
                //.duration(500)
                    .attr("x", function (d) {
                        return scaling(d.x)
                    })
                    .attr("width", function (d) {
                        return scaling(d.y) - scaling(d.x)
                    });
            },
            unique: function (object) {
                svgContainer.selectAll(".line" + object.className)
                    .attr("d",line.x(function (d) {
                        return scaling(d.x);
                    }));
                let transit;
                if (animation) {
                    transit = svgContainer.selectAll("." + object.className)
                    //                    .data(object.data)
                        .transition()
                        .duration(500);
                }
                else {
                    transit = svgContainer.selectAll("." + object.className);
                }
                transit
                //                    .data(object.data)
                //.transition()
                //.duration(500)
                    .attr("x", function (d) {
                        return scaling(d.x - 0.4)
                    })
                    .attr("width", function (d) {
                        if (scaling(d.x + 0.4) - scaling(d.x - 0.4) < 2) return 2;
                        else return scaling(d.x + 0.4) - scaling(d.x - 0.4);
                    });
            },
            path: function (object) {
                svgContainer.selectAll(".line" + object.className)
                    .attr("d",lineBond.x(function (d) {
                            return scaling(d.x);
                        })
                            .y(function (d) {
                                return -d.y * 10 + object.height;
                            })
                    );
                let transit;
                if (animation) {
                    transit = svgContainer.selectAll("." + object.className)
                    //                    .data(object.data)
                        .transition()
                        .duration(500);
                }
                else {
                    transit = svgContainer.selectAll("." + object.className);
                }
                transit
                    .attr("d", lineBond.y(function (d) {
                        return -d.y * 10 + object.height;
                    }));
            },
            line: function (object) {
                lineYscale.range([0, -(object.height)]).domain([0, -(object.level)]);
                svgContainer.selectAll(".line" + object.className)
                    .attr("d", lineGen.y(function (d) {
                        return lineYscale(-d.y) * 10 + object.shift;
                    }));
                let transit;
                if (animation) {
                    transit = svgContainer.selectAll("." + object.className)
                    //                    .data(object.data)
                        .transition()
                        .duration(500);
                }
                else {
                    transit = svgContainer.selectAll("." + object.className);
                }

                transit
                    .attr("d", lineGen.y(function (d) {
                            return lineYscale(-d.y) * 10 + object.shift;
                        })
                            .interpolate(object.interpolation)
                    );
            },
            text: function (object, start) {
                let transit;
                if (animation) {
                    transit = svgContainer.selectAll("." + object.className)
                    //                    .data(object.data)
                        .transition()
                        .duration(500);
                }
                else {
                    transit = svgContainer.selectAll("." + object.className);
                }
                transit
                    .attr("x", function (d, i) {
                        return scaling(i + start)
                    });
            }
        };

        let brush = d3Brush(scaling)
            //.on("brush", brushmove)
            .on("end", brushend);

        function addBrush() {
            svgContainer.append("g")
                .attr("class", "brush")
                .call(brush)
                .selectAll("rect")
                .attr('height', Yposition + 50);
        }

        this.zoom = function(start, end){
            let zoomInside = current_extend.start<start && current_extend.end>end;
            if (!zoomInside) {
                svgContainer.selectAll(".seqGroup").remove();
            }
            brush.extent([start,end]);
            brushend();
        };
        this.resetZoom = function(start, end){
            resetAll();
        };

        function brushend() {
            select(div).selectAll('div.selectedRect').remove();
            if (Object.keys(featureSelected).length !== 0 && featureSelected.constructor === Object) {
                select(featureSelected.id).style("fill", featureSelected.originalColor);
                featureSelected = {};
                if (CustomEvent) {
                    let event = new CustomEvent(self.events.FEATURE_DESELECTED_EVENT, {
                        detail: {info:"feature-deselected"}
                    });
                    svgElement.dispatchEvent(event);
                } else {
                    console.warn("CustomEvent is not defined....");
                }
                if (self.trigger) self.trigger(self.events.FEATURE_DESELECTED_EVENT, {info:"feature-deselected"});
            }
            // Check if brush is big enough before zooming
            let extent = brush.extent;

            console.log(brush);

            let extentLength = Math.abs(extent[0] - extent[1]);

            let start = parseInt(extent[1] + 1);
            let end = parseInt(extent[0] - 1);

            if (extent[0] < extent[1]){
                start = parseInt(extent[0] - 1);
                end = parseInt(extent[1] + 1);
            }

            console.log(start, end)
        }

        // TODO: This function get's called when resizing the window (was previously in doc.window.on(resize, f)
        function updateWindow(){
//            let new_width = $(div).width() - margin.left - margin.right - 17;
//            let width_larger = (width < new_width);

            width = $(div).width() - margin.left - margin.right - 17;
            select(div+" svg")
                .attr("width", width + margin.left + margin.right);
            select(div+" #clip>rect").attr("width", width);
            if (SVGOptions.brushActive) {
                select(div+" .background").attr("width", width);
            }
            select(div).selectAll(".brush").call(brush.move, null);

//            let currentSeqLength = svgContainer.selectAll(".AA").size();
            let seq = displaySequence(current_extend.length);
            if (SVGOptions.showSequence && !(intLength)){
                if (seq === false && !svgContainer.selectAll(".AA").empty()) {
                    svgContainer.selectAll(".seqGroup").remove();
                    fillSVG.sequenceLine();
                }
                else if (seq === true && svgContainer.selectAll(".AA").empty()){
                    svgContainer.selectAll(".sequenceLine").remove();
                    fillSVG.sequence(sequence.substring(current_extend.start-1, current_extend.end), 20, current_extend.start-1);

                }
            }

            scaling.range([5,width-5]);
            scalingPosition.domain([0, width]);

            transition_data(features, current_extend.start);
            reset_axis();

        }

        // If brush is too small, reset view as origin
        function resetAll() {

            //reset scale

            $(".zoomUnit").text("1");
            scaling.domain([offset.start, offset.end]);
            scalingPosition.range([offset.start, offset.end]);
            let seq = displaySequence(offset.end - offset.start);

            if (SVGOptions.showSequence && !(intLength)){
                if (seq === false && !svgContainer.selectAll(".AA").empty()){
                    svgContainer.selectAll(".seqGroup").remove();
                    fillSVG.sequenceLine();
                }
                else if (current_extend.length !== fvLength && seq === true && !svgContainer.selectAll(".AA").empty()) {
                    svgContainer.selectAll(".seqGroup").remove();
                    fillSVG.sequence(sequence.substring(offset.start-1,offset.end), 20, offset.start);
                }
            }

            current_extend={
                length : offset.end-offset.start,
                start : offset.start,
                end : offset.end
            };
            seqShift=0;

            transition_data(features, offset.start);
            reset_axis();

            // Fire Event
            if (CustomEvent) {
                svgElement.dispatchEvent(new CustomEvent(self.events.ZOOM_EVENT,
                    { detail: { start: 1, end: sequence.length, zoom: 1 }}));
            };
            if (self.trigger) self.trigger(self.events.ZOOM_EVENT, {
                start: 1,
                end: sequence.length,
                zoom: 1
            });

            select(div).selectAll(".brush").call(brush.move, null);
        }

        function transition_data(features, start) {
            features.forEach(function (o) {
                if (o.type === "rect") {
                    transition.rectangle(o);
                } else if (o.type === "multipleRect") {
                    transition.multiRec(o);
                } else if (o.type === "unique") {
                    transition.unique(o);
                } else if (o.type === "path") {
                    transition.path(o);
                } else if (o.type === "line") {
                    transition.line(o);
                } else if (o.type === "text") {
                    transition.text(o, start);
                }
            });
        }

        /** export to new axis file? */
        function reset_axis() {
            svgContainer
                .transition().duration(500)
                .select(".x.axis")
                .call(xAxis);
        }

        function addVerticalLine() {
            let vertical = select(".chart")
                .append("div")
                .attr("class", "Vline")
                .style("position", "absolute")
                .style("z-index", "19")
                .style("width", "1px")
                .style("height", (Yposition + 50) + "px")
                .style("top", "30px")
                // .style("left", "0px")
                .style("background", "#000");

            select(".chart")
                .on("mousemove.Vline", function () {
                    mousex = mouse(this)[0] - 2;
                    vertical.style("left", mousex + "px")
                });
            //.on("click", function(){
            //    mousex = mouse(this);
            //    mousex = mousex[0] + 5;
            //    vertical.style("left", mousex + "px")});
        }

        this.addRectSelection = function (svgId) {
            let featSelection = select(svgId);
            let elemSelected = featSelection.data();
            let xTemp;
            let yTemp;
            let xRect;
            let widthRect;
            let svgWidth = SVGOptions.brushActive ? select(".background").attr("width") : svgContainer.node().getBBox().width;
            select('body').selectAll('div.selectedRect').remove();

            let objectSelected = {type:featSelection[0][0].tagName, color:featSelection.style("fill")};
            colorSelectedFeat(svgId, objectSelected);

            // Append tooltip
            let selectedRect = select(div)
                .append('div')
                .attr('class', 'selectedRect');

            if (elemSelected[0].length === 3) {
                xTemp = elemSelected[0][0].x;
                yTemp = elemSelected[0][1].x;
            } else if (elemSelected[0].x === elemSelected[0].y) {
                xTemp = elemSelected[0].x - 0.5;
                yTemp = elemSelected[0].y + 0.5;
            } else {
                xTemp = elemSelected[0].x;
                yTemp = elemSelected[0].y;
            }
            if (scaling(xTemp) < 0) {
                xRect = margin.left;
                widthRect = (scaling(yTemp));
            } else if (scaling(yTemp) > svgWidth) {
                xRect = scaling(xTemp) + margin.left;
                widthRect = svgWidth - scaling(xTemp);
            } else {
                xRect = scaling(xTemp) + margin.left;
                widthRect = (scaling(yTemp) - scaling(xTemp));
            }
            selectedRect.style({
                left: xRect + 'px',
                top: 60 + 'px',
                'background-color': 'rgba(0, 0, 0, 0.2)',
                width: widthRect + 'px',
                height: (Yposition + 50) + 'px',
                position: 'absolute',
                'z-index': -1,
                'box-shadow': '0 1px 2px 0 #656565'
            });
        };

        function initSVG(div, options) {

            options = {
                'showAxis': false,
                'showSequence': false,
                'brushActive': false,
                'verticalLine': false,
                'bubbleHelp': false,
                'unit': "units",
                'zoomMax': 50,
                ...options
            };

            // Create SVG
            if (options.zoomMax) {
                zoomMax = options.zoomMax;
            }
            if (!options.unit) {
                options.unit = "units";
            }
            if (options.animation) {
                animation = options.animation;
            }

            svg = select(div).append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .style("z-index", "2")
                .on("contextmenu", function (d, i) {
                    d3.event.preventDefault();
                    resetAll();
                    // react on right-clicking
                });
            svgElement = el.getElementsByTagName("svg")[0];


            svgContainer = svg
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            //Create Clip-Path
            let defs = svgContainer.append("defs");

            defs.append("clipPath")
                .attr("id", "clip")
                .append("rect")
                .attr("width", width)
                .attr("height", height);

            let filter = defs.append("filter")
                .attr("id", "dropshadow")
                .attr("height", "200%");

            filter.append("feGaussianBlur")
                .attr("in", "SourceAlpha")
                .attr("stdDeviation", 3)
                .attr("result", "blur");
            filter.append("feOffset")
                .attr("in", "blur")
                .attr("dx", -2)
                .attr("dy", 2)
                .attr("result", "offsetBlur");

            let feMerge = filter.append("feMerge");

            feMerge.append("feMergeNode")
                .attr("in", "offsetBlur");
            feMerge.append("feMergeNode")
                .attr("in", "SourceGraphic");

            svgContainer.on('mousemove', function () {

                let absoluteMousePos = mouse(svgContainer.node());
                let pos = Math.round(scalingPosition(absoluteMousePos[0]));
                if (!options.positionWithoutLetter) {
                    pos += sequence[pos-1] || "";
                }

                self.props.onSequenceHover && self.props.onSequenceHover(pos);
            });

            if (typeof options.dottedSequence !== "undefined"){
                SVGOptions.dottedSequence = options.dottedSequence;
            }
            if (options.showSequence && !(intLength)) {
                SVGOptions.showSequence = true;
                if (displaySequence(offset.end - offset.start)) {
                    fillSVG.sequence(sequence.substring(offset.start-1, offset.end), Yposition, offset.start);
                }
                else{
                    fillSVG.sequenceLine();
                }
                features.push({
                    data: sequence,
                    name: "Sequence",
                    className: "AA",
                    color: "black",
                    type: "text"
                });
                yData.push({
                    title: "Sequence",
                    y: Yposition - 8
                });
            }
            if (options.showAxis) addXAxis(Yposition);
            addYAxis();
            if (options.brushActive) {
                SVGOptions.brushActive = true;
                zoom = true;
                addBrush();
            }
            if (options.verticalLine) {
                SVGOptions.verticalLine = true;
                addVerticalLine();
            }

            updateSVGHeight(Yposition);

        }

        initSVG(div, options);

        this.addFeature = function (object) {
            Yposition += 20;
            features.push(object);
            fillSVG.typeIdentifier(object);
            updateYaxis();
            updateXaxis(Yposition);
            updateSVGHeight(Yposition);
            if (SVGOptions.brushActive) {
                svgContainer.selectAll(".brush rect")
                    .attr('height', Yposition + 50);
            }
            if (SVGOptions.verticalLine) d3.selectAll(".Vline").style("height", (Yposition + 50) + "px");
            if (selectAll(".element")[0].length > 1500) animation = false;

        };

        this.clearInstance = function (){
            svg = null;
            svgElement = null;
            svgContainer = null;
            yAxisSVGgroup = null;
            yAxisSVG = null;
            features = null;
            sbcRip = null;
            helper = {};
        }

    }

    render() {
        return <div
            ref={node => this.node = node}
        />
    }
}

FeatureViewer.propTypes = {
    sequence: PropTypes.string.isRequired,
    options: PropTypes.object,
    onSequenceHover: PropTypes.func,
};

export default FeatureViewer;