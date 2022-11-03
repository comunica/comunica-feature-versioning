# Comunica Contextify Version Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-operation-contextify-version.svg)](https://www.npmjs.com/package/@comunica/actor-query-operation-contextify-version)

A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor
that detects graph-based version operations and rewrites them to operations with a version context.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-operation-contextify-version
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-operation-contextify-version/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-operation/actors#contextify-version",
      "@type": "ActorQueryOperationContextifyVersion",
      "mediatorQueryOperation": { "@id": "urn:comunica:default:query-operation/mediators#main" },
      "baseGraphUri": "version:",
      "numericalVersions": true
    }
  ]
}
```

### Config Parameters

* `mediatorQueryOperation`: A mediator over the [Query Operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation).
* `baseGraphUri`: The base URI of the graph to contextify. If this is not provided, then graphs will be converted to version identifiers as-is.
* `numericalVersions`: If versions should be parsed as integers.

## Examples

Assuming a base graph URI `version:`.

### Version Materialization

Input query:
```sparql
SELECT * WHERE {
  GRAPH <version:1> {
    ?s ?p ?o
  }
}
```

Output context:
```json
{
  "version": {
    "type": "version-materialization",
    "version": 1
  }
}
```

Output query:
```sparql
SELECT * WHERE {
  ?s ?p ?o
}
```

### Delta Materialization

Input query:
```sparql
SELECT * WHERE {
  GRAPH <version:4> {
    ?s ?p ?o
  } .
  FILTER (NOT EXISTS {
    GRAPH <version:2> {
      ?s ?p ?o
    }
  }) 
}
```

Output context:
```json
{
  "version": {
    "queryAdditions": true,
    "type": "delta-materialization",
    "versionEnd": 4,
    "versionStart": 2
  }
}
```

Output query:
```sparql
SELECT * WHERE {
  ?s ?p ?o
}
```

_Note:_ Flipping the versions would make this a _deletions_ query instead of an _additions_ query,
i.e., `queryAdditions` would be set to `false`.
