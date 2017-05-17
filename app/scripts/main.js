/*!
 *
 *  Web Starter Kit
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */
/* eslint-env browser */
(function() {
    'use strict';

    // Check to make sure service workers are supported in the current browser,
    // and that the current page is accessed from a secure origin. Using a
    // service worker from an insecure origin will trigger JS console errors. See
    // http://www.chromium.org/Home/chromium-security/prefer-secure-origins-for-powerful-new-features
    var isLocalhost = Boolean(window.location.hostname === 'localhost' ||
        // [::1] is the IPv6 localhost address.
        window.location.hostname === '[::1]' ||
        // 127.0.0.1/8 is considered localhost for IPv4.
        window.location.hostname.match(
            /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
        )
    );

    if ('serviceWorker' in navigator &&
        (window.location.protocol === 'https:' || isLocalhost)) {
        navigator.serviceWorker.register('service-worker.js')
            .then(function(registration) {
                // updatefound is fired if service-worker.js changes.
                registration.onupdatefound = function() {
                    // updatefound is also fired the very first time the SW is installed,
                    // and there's no need to prompt for a reload at that point.
                    // So check here to see if the page is already controlled,
                    // i.e. whether there's an existing service worker.
                    if (navigator.serviceWorker.controller) {
                        // The updatefound event implies that registration.installing is set:
                        // https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#service-worker-container-updatefound-event
                        var installingWorker = registration.installing;

                        installingWorker.onstatechange = function() {
                            switch (installingWorker.state) {
                                case 'installed':
                                    // At this point, the old content will have been purged and the
                                    // fresh content will have been added to the cache.
                                    // It's the perfect time to display a "New content is
                                    // available; please refresh." message in the page's interface.
                                    break;

                                case 'redundant':
                                    throw new Error('The installing ' +
                                        'service worker became redundant.');

                                default:
                                    // Ignore
                            }
                        };
                    }
                };
            }).catch(function(e) {
                console.error('Error during service worker registration:', e);
            });
    }

    // Data distribution chart
    var svg = d3.select("#svgDataDistribution"),
        margin = 20,
        diameter = +svg.attr("width"),
        g = svg.append("g").attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

    var color = d3.scaleLinear()
        .domain([-1, 5])
        .range(["hsl( 199.5, 18.3%, 46.1%)", "hsl(45, 100%, 51%)"])
        .interpolate(d3.interpolateHcl);

    var pack = d3.pack()
        .size([diameter - margin, diameter - margin])
        .padding(2);

    d3.json("scripts/data.json", function(error, root) {
        if (error) throw error;

        root = d3.hierarchy(root)
            .sum(function(d) {
                return d.size;
            })
            .sort(function(a, b) {
                return b.value - a.value;
            });

        var focus = root,
            nodes = pack(root).descendants(),
            view;

        var circle = g.selectAll("circle")
            .data(nodes)
            .enter().append("circle")
            .attr("class", function(d) {
                return d.parent ? d.children ? "node" : "node node--leaf" : "node node--root";
            })
            .style("fill", function(d) {
                return d.children ? color(d.depth) : null;
            })
            .on("click", function(d) {
                if (focus !== d) zoom(d), d3.event.stopPropagation();
            });

        var text = g.selectAll("text")
            .data(nodes)
            .enter().append("text")
            .attr("class", "label")
            .style("fill-opacity", function(d) {
                return d.parent === root ? 1 : 0;
            })
            .style("display", function(d) {
                return d.parent === root ? "inline" : "none";
            })
            .text(function(d) {
                return d.data.name;
            });

        var node = g.selectAll("circle,text");

        svg
            .on("click", function() {
                zoom(root);
            });

        zoomTo([root.x, root.y, root.r * 2 + margin]);

        function zoom(d) {
            var focus0 = focus;
            focus = d;

            var transition = d3.transition()
                .duration(d3.event.altKey ? 7500 : 750)
                .tween("zoom", function(d) {
                    var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2 + margin]);
                    return function(t) {
                        zoomTo(i(t));
                    };
                });

            transition.selectAll("text")
                .filter(function(d) {
                    return d.parent === focus || this.style.display === "inline";
                })
                .style("fill-opacity", function(d) {
                    return d.parent === focus ? 1 : 0;
                })
                .on("start", function(d) {
                    if (d.parent === focus) this.style.display = "inline";
                })
                .on("end", function(d) {
                    if (d.parent !== focus) this.style.display = "none";
                });
        }

        function zoomTo(v) {
            var k = diameter / v[2];
            view = v;
            node.attr("transform", function(d) {
                return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")";
            });
            circle.attr("r", function(d) {
                return d.r * k;
            });
        }
    });

    //BO analysis ---------------------------------------------------------------------------------
    //Based on zoomable partition

    var vis = d3.select("#svgBoAnalysis"),
        w = +vis.attr("width"),
        h = +vis.attr("height"),
        x = d3.scaleLinear().range([0, w]),
        y = d3.scaleLinear().range([0, h]),
        root;
    //gvis = vis.append("g");

    var format = d3.format(",d");

    var BOcolor = d3.scaleOrdinal(d3.schemeCategory10);

    vis.attr("class", "chart")
        .style("width", w + "px")
        .style("height", h + "px");

    var partition = d3.partition()
        .size([h, w])
        .padding(1)
        .round(true);

    d3.json("scripts/dataBO.json", function(error, json) {
        if (error) throw error;

        var focus = root,
            view;

        root = d3.hierarchy(json);

        root.sum(function(d) {
                return d.size ? d.size : 0;
            })
            .sort(function(a, b) {
                return b.height - a.height || b.value - a.value;
            });

        partition(root);

        var gvis = vis.selectAll("g")
            .data(root.descendants())
            .enter().append("g")
            .attr("class", function(d) {
                return "node" + (d.children ? " node--internal" : " node--leaf");
            })
            .attr("transform", function(d) {
                return "translate(" + d.y0 + "," + d.x0 + ")";
            });

        gvis.append("rect")
            .attr("id", function(d) {
                return "rect-" + d.data.id;
            })
            .attr("width", function(d) {
                return d.y1 - d.y0;
            })
            .attr("height", function(d) {
                return d.x1 - d.x0;
            })
            .filter(function(d) {
                return !d.children;
            })
            .style("fill", function(d) {
                while (d.depth > 1) d = d.parent;
                return BOcolor(d.id);
            });

        gvis.append("clipPath")
            .attr("id", function(d) {
                return "clip-" + d.data.id;
            })
            .append("use")
            .attr("xlink:href", function(d) {
                return "#rect-" + d.data.id + "";
            });

        gvis.append("text")
            .attr("clip-path", function(d) {
                return "url(#clip-" + d.data.id + ")";
            })
            .attr("x", 4)
            .selectAll("tspan")
            .data(function(d) {
                return d.data.id + "\n" + format(d.value);
            })
            .enter().append("tspan")
            .attr("y", 13)
            .text(function(d) {
                return d;
            });

        gvis.append("title")
            .text(function(d) {
                return d.data.id + "\n" + format(d.value);
            });

               
        var zoom = d3.zoom()
            .scaleExtent([1, 40])
            .translateExtent([
                [-100, -100],
                [w + 90, h + 100]
            ])
            .on("zoom", zoomed);
        vis.call(zoom);

        function zoomed() {
            gvis.attr("transform", d3.event.transform);
            gX.call(xAxis.scale(d3.event.transform.rescaleX(x)));
            gY.call(yAxis.scale(d3.event.transform.rescaleY(y)));
        }

    });
})();
