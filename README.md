## Kubernetes/Container Engine Visualizer

NOTE: This is a fork of gcp-live-k8s-visualizer by saturnism // brendandburns. Please to refer to the original repository for the official upstreams. All credits to the respective authors.


This is a simple visualizer for use with the Kubernetes API.

### Usage:
   * First install a Kubernetes or Container Engine Cluster
   * ```git clone https://github.com/saturnism/gcp-live-k8s-visualizer.git```
   * ```cd path/to/gcp-live-k8s-visualizer```
   * ```kubectl proxy -p 8080 -w .

In your browser you can see the visualization at localhost:8080/static

### Configuration:

In order to use this script, you will have to configure what resources shall be displayed. 

The visualizer uses labels to organize the visualization.  In particular it expects that

   * pods, replicationcontrollers and services you want to visualize can be classified by a ```label``` (eg. 'tier': 'backend')
   * associated pods, replicationcontrollers and services have shared ```label``` with the same value (eg. 'application': 'app-name')

### Examples:

Lets assume you have 3 apps in your system, with the labels ```'application': 'app-{1,2,3}'``` and all three live in the 'backend' tier.


Lets assume your replicationcontroller and service definitions look as follows:
Replicationcontroller
```
{
    "apiVersion": "v1",
    "kind": "ReplicationController",
    "metadata": {
        "name": "app-name-9999999999"
    },
    "spec": {
        "replicas": 5,
        "selector": {
            "application": "app-name",
            ...
        },
        "template": {
            "metadata": {
                "labels": {
                    "application": "app-name",
                    "tier": "backend",
                    ...
                },
            },
            "spec": {
                ...
            }
        }
    }
}
```

Service
```
{
    "apiVersion": "v1",
    "kind": "Service",
    "metadata": {
        "name": "app-name",
        "labels": {
            "application": "app-name",
            "tier": "backend"
        },
    },
    "spec": {
        "selector": {
            "application": "app-name",
        }
    }
}
```

Then you would have to configure the script (at the bottom) as follows:

```
// accepts multiple values like {key: "key", value: "value"}
var renderLabel = [{
    key: "tier",
    value: "backend"
}];

// identify connected resources by this labels value  (must be set!)
var connectionIdentifier = "application"; 
```


This will make the script visualize all those resources that define a label ```tier``` with the value ```backend``` and it will connect all those resources, that share the value of the label ```application``` (which would be app-1, app-2 and app-3).