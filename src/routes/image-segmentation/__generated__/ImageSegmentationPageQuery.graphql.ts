/**
 * @generated SignedSource<<67f791f6c7d1d841acee03ca68f8c901>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest, Query } from 'relay-runtime';
export type ImageSegmentationPageQuery$variables = Record<PropertyKey, never>;
export type ImageSegmentationPageQuery$data = {
  readonly defaultVideo: {
    readonly height: number;
    readonly path: string;
    readonly posterPath: string | null | undefined;
    readonly posterUrl: string;
    readonly url: string;
    readonly width: number;
  };
};
export type ImageSegmentationPageQuery = {
  response: ImageSegmentationPageQuery$data;
  variables: ImageSegmentationPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "path",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "posterPath",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "url",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "posterUrl",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "height",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "width",
  "storageKey": null
};
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "ImageSegmentationPageQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "Video",
        "kind": "LinkedField",
        "name": "defaultVideo",
        "plural": false,
        "selections": [
          (v0/*: any*/),
          (v1/*: any*/),
          (v2/*: any*/),
          (v3/*: any*/),
          (v4/*: any*/),
          (v5/*: any*/)
        ],
        "storageKey": null
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "ImageSegmentationPageQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "Video",
        "kind": "LinkedField",
        "name": "defaultVideo",
        "plural": false,
        "selections": [
          (v0/*: any*/),
          (v1/*: any*/),
          (v2/*: any*/),
          (v3/*: any*/),
          (v4/*: any*/),
          (v5/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "id",
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "b616d6d7abd1e78702a95fc5abfe382b",
    "id": null,
    "metadata": {},
    "name": "ImageSegmentationPageQuery",
    "operationKind": "query",
    "text": "query ImageSegmentationPageQuery {\n  defaultVideo {\n    path\n    posterPath\n    url\n    posterUrl\n    height\n    width\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "0926451a43e926afeb33a2ca31a007d3";

export default node;
