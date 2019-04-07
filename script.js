/**
Copyright 2014 Google Inc. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

var truncate = function(str, width, left) {
    if (!str) return "";

    if (str.length > width) {
        if (left) {
            return str.slice(0, width) + "...";
        } else {
            return "..." + str.slice(str.length - width, str.length);
        }
    }
    return str;
}

var insertByApplication = function(index, value) {
    if (!value || !value.metadata.labels || !value.metadata.name) {
        return;
    }
    // //console.log("type = " + value.type + " labels = " + value.metadata.name);
    //  var list = groups[value.metadata.name];
    var key = value.metadata.labels[connectionIdentifier];
    var list = groups[key];
    if (!list) {
        list = [];
        groups[key] = list;
    }
    list.push(value);
};

var groupByName = function(labelGroup) {
    $.each(pods[labelGroup].items, insertByApplication);
    $.each(controllers[labelGroup].items, insertByApplication);
    $.each(services[labelGroup].items, insertByApplication);
};

var matchesLabelQuery = function(labels, selector) {
    var match = true;
    $.each(selector, function(key, value) {
        if (labels[key] != value) {
            match = false;
        }
    });
    return match;
}

var connectControllers = function() {
    $.each(renderLabel, function(idx, label) {
        labelGroup = label.key + ":" + label.value;

        for (var i = 0; i < controllers[labelGroup].items.length; i++) {
            var controller = controllers[labelGroup].items[i];
            //console.log("controller: " + controller.metadata.name)
            for (var j = 0; j < pods[labelGroup].items.length; j++) {
                var pod = pods[labelGroup].items[j];
                if (pod.metadata.labels[connectionIdentifier] == controller.metadata.labels[connectionIdentifier]) {
                    if (controller.metadata.labels.version && pod.metadata.labels.version && (controller.metadata.labels.version != pod.metadata.labels.version)) {
                        continue;
                    }
                    //console.log('connect controller: ' + 'controller-' + controller.metadata.name + ' to pod-' + pod.metadata.name);
                    jsPlumb.connect({
                        source: 'controller-' + controller.metadata.name,
                        target: 'pod-' + pod.metadata.name,
                        anchors: ["Bottom", "Bottom"],
                        paintStyle: {
                            lineWidth: 5,
                            strokeStyle: 'rgb(51,105,232)'
                        },
                        joinStyle: "round",
                        endpointStyle: {
                            fillStyle: 'rgb(51,105,232)',
                            radius: 7
                        },
                        connector: ["Flowchart", {
                            cornerRadius: 5
                        }]
                    });
                }
            }
        }
        for (var i = 0; i < services[labelGroup].items.length; i++) {
            var service = services[labelGroup].items[i];
            for (var j = 0; j < pods[labelGroup].items.length; j++) {
                var pod = pods[labelGroup].items[j];
                if (matchesLabelQuery(pod.metadata.labels, service.spec.selector)) {
                    //console.log('connect service: ' + 'service-' + service.metadata.name + ' to pod-' + pod.metadata.name);
                    jsPlumb.connect({
                        source: 'service-' + service.metadata.name,
                        target: 'pod-' + pod.metadata.name,
                        anchors: ["Bottom", "Top"],
                        paintStyle: {
                            lineWidth: 5,
                            strokeStyle: 'rgb(0,153,57)'
                        },
                        endpointStyle: {
                            fillStyle: 'rgb(0,153,57)',
                            radius: 7
                        },
                        connector: ["Flowchart", {
                            cornerRadius: 5
                        }]
                    });
                }
            }
        }
    });
};

var makeGroupOrder = function() {
    var groupScores = {};
    $.each(groups, function(key, val) {
        //console.log("group key: " + key);
        if (!groupScores[key]) {
            groupScores[key] = 0;
        }
    });
    var groupOrder = [];
    $.each(groupScores, function(key, value) {
        groupOrder.push(key);
    });
    groupOrder.sort(function(a, b) {
        return groupScores[a] - groupScores[b];
    });

    //console.log(groupOrder);
    return groupOrder;
};


var renderNodes = function() {
    var y = 25;
    var x = 0;
    $.each(nodes.items, function(index, value) {
        //console.log(value);
        var div = $('<div/>');
        var ready = false;
        $.each(value.status.conditions, function(index, condition) {
            if (condition.type === 'Ready') {
                ready = (condition.status === 'True' ? 'ready' : 'not_ready')
            }
        });

        var eltDiv = $('<div class="window node ' + ready + '" title="' + value.metadata.name + '" id="node-' + value.metadata.name +
            '" style="left: ' + (x + 30) + '; top: ' + y + '"/>');
        eltDiv.html('<span><b>Node</b><br/><br/>' +
            truncate(value.metadata.name, 6) +
            '</span>');
        div.append(eltDiv);

        var elt = $('.nodesbar');
        elt.append(div);

        x += 125;
    });
}

var renderGroups = function() {
    var elt = $('#sheet');
    var groupDist = 20;
    var serviceLeft = 0;
    var groupOrder = makeGroupOrder();
    var tokenCounter = {};
    var tokenCounter = {}
    $.each(groupOrder, function(ix, key) {
        list = groups[key];
        if (!list) {
            return;
        }
        var div = $('<div/>');
        $.each(list, function(index, value) {
            var appName = value.metadata.labels[connectionIdentifier]
                //console.log("render groups: " + value.type + ", " + value.metadata.name + ", " + index)
            var eltDiv = null;
            //console.log(value);
            var phase = value.status.phase ? value.status.phase.toLowerCase() : '';
            if (value.type == "pod") {
                var key = "pod-" + appName;
                tokenCounter[key] = key in tokenCounter ? tokenCounter[key] + 1 : 1
                eltDiv = $('<div class="window pod ' + phase + '" title="' + value.metadata.name + '" id="pod-' + value.metadata.name +
                    '" style="left: ' + (0 + tokenCounter[key] * 130) + '; top: ' + (groupDist + 150) + '"/>');
                eltDiv.html('<span>' +
                    truncate(value.metadata.name, 8, true) +
                    (value.metadata.labels.version ? "<br/>" + value.metadata.labels.version : "") + "<br/><br/>" +
                    "(" + (value.spec.nodeName ? truncate(value.spec.nodeName, 6) : "None") + ")" +
                    '</span>');
            } else if (value.type == "service") {
                eltDiv = $('<div class="window wide service ' + phase + '" title="' + value.metadata.name + '" id="service-' + value.metadata.name +
                    '" style="left: ' + 30 + '; top: ' + groupDist + '"/>');
                eltDiv.html('<span>' +
                    value.metadata.name +
                    (value.metadata.labels.version ? "<br/><br/>" + value.metadata.labels.version : "") +
                    (value.spec.clusterIP ? "<br/><br/>" + value.spec.clusterIP : "") +
                    (value.status.loadBalancer && value.status.loadBalancer.ingress ? "<br/><a style='color:white; text-decoration: underline' href='http://" + value.status.loadBalancer.ingress[0].ip + "'>" + value.status.loadBalancer.ingress[0].ip + "</a>" : "") +
                    '</span>');
            } else {
                var key = 'controller-' + appName;
                tokenCounter[key] = key in tokenCounter ? tokenCounter[key] + 1 : 0;
                var minLeft = 600;
                var calcLeft = 400 + (value.status.replicas * 130);
                var left = minLeft > calcLeft ? minLeft : calcLeft;
                eltDiv = $('<div class="window wide controller" title="' + value.metadata.name + '" id="controller-' + value.metadata.name +
                    '" style="left: ' + (left + tokenCounter[key] * 100) + '; top: ' + (groupDist + 200) + '"/>');
                eltDiv.html('<span>' + value.metadata.name +
                    (value.metadata.labels.version ? "<br/><br/>" + value.metadata.labels.version : "") + '</span>');
            }
            div.append(eltDiv);
        });
        groupDist += 280;
        serviceLeft += 200;
        elt.append(div);
    });
};

var loadData = function(label, value) {
    var deferred = new $.Deferred();
    var dataKey = label + ":" + value;
    var req1 = $.getJSON("/api/v1/pods?labelSelector=" + label + "%3D" + value, function(data) {
        pods[dataKey] = data;
        $.each(data.items, function(key, val) {
            val.type = 'pod';
        });
    });

    var req2 = $.getJSON("/api/v1/replicationcontrollers?labelSelector=" + label + "%3D" + value, function(data) {
        controllers[dataKey] = data;
        //console.log(cocontrollers =ntrollers);
        $.each(data.items, function(key, val) {
            val.type = 'replicationController';
            //console.log("Controller ID = " + val.metadata.name)
        });
    });


    var req3 = $.getJSON("/api/v1/services?labelSelector=" + label + "%3D" + value, function(data) {
        services[dataKey] = data;
        //console.log("loadData(): Services");
        //console.log(services);
        $.each(data.items, function(key, val) {
            val.type = 'service';
            //console.log("service ID = " + val.metadata.name)
        });
    });

    var req4 = $.getJSON("/api/v1/nodes", function(data) {
        nodes = data;
        //console.log("loadData(): Services");
        //console.log(nodes);
        $.each(data.items, function(key, val) {
            val.type = 'node';
            //console.log("service ID = " + val.metadata.name)
        });
    });

    $.when(req1, req2, req3, req4).then(function() {
        deferred.resolve();
    });


    return deferred;
}


function appendResourcesToView(labelGroup) {
    groupByName(labelGroup);
    $('#sheet').empty();
    renderNodes();
    renderGroups();
    connectControllers();
}

function refresh(instance) {
    nodes = [];
    groups = {};

    $.each(renderLabel, function(idx, label) {
        var labelGroup = label.key + ":" + label.value;
        pods[labelGroup] = [];
        services[labelGroup] = [];
        controllers[labelGroup] = [];
        $.when(loadData(label.key, label.value)).then(function() {
            //console.log("render data for " + label.key + ":" + label.value);
            //console.log(pods[labelGroup]);
            //console.log(controllers[labelGroup]);
            appendResourcesToView(labelGroup);
        });
    });

    setTimeout(function() {
        refresh(instance);
    }, refreshInterval);
}

jsPlumb.bind("ready", function() {
    var instance = jsPlumb.getInstance({
        // default drag options
        DragOptions: {
            cursor: 'pointer',
            zIndex: 2000
        },
        // the overlays to decorate each connection with.  note that the label overlay uses a function to generate the label text; in this
        // case it returns the 'labelText' member that we set on each connection in the 'init' method below.
        ConnectionOverlays: [
            ["Arrow", {
                location: 1
            }],
            //[ "Label", {
            //  location:0.1,
            //  id:"label",
            //  cssClass:"aLabel"
            //}]
        ],
        Container: "flowchart-demo"
    });

    refresh(instance);
    //console.log(instance);
    jsPlumb.fire("jsPlumbDemoLoaded", instance);
});


//  ---------------------------------------------  //
//  ------------- CONFIGURE ME HERE -------------  // 
//  ---------------------------------------------  //

var pods = {};
var services = {};
var controllers = {};
var groups = {};
var colors = [
        'rgb(213,15,37)',
        'rgb(238,178,17)',
        'rgb(17,178,238)'
    ]
// render all those labels listed in here:
var renderLabel = [{
    key: "faas_function",
    value: "figlet"
}, {
    key: "faas_function",
    value: "nodeinfo"
}, {
    key: "faas_function",
    value: "nslookup"
}, {
    key: "faas_function",
    value: "certinfo"
}];

// identify connected resources by this labels value  (must be set!)
// eg. your services and replication controllers do all define a "metadata.label" like "application":"resource-name", 
// then you have to configure this here in order to make enable this script to link those services and pods together graphically.
var connectionIdentifier = "faas_function";

var refreshInterval = 10000; // the longer the less annoying

