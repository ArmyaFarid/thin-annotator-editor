/**
 * @generated SignedSource<<f9fd761c8ed4683021631f4f58a94138>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest, Query } from 'relay-runtime';
export type DemoPageQuery$variables = Record<PropertyKey, never>;
export type DemoPageQuery$data = {
  readonly defaultVideo: {
    readonly height: number;
    readonly path: string;
    readonly posterPath: string | null | undefined;
    readonly posterUrl: string;
    readonly url: string;
    readonly width: number;
  };
};
export type DemoPageQuery = {
  response: DemoPageQuery$data;
  variables: DemoPageQuery$variables;
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
    "name": "DemoPageQuery",
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
    "name": "DemoPageQuery",
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
    "cacheID": "5b47b8037c646bcd5808331364bf0c3b",
    "id": null,
    "metadata": {},
    "name": "DemoPageQuery",
    "operationKind": "query",
    "text": "query DemoPageQuery {\n  defaultVideo {\n    path\n    posterPath\n    url\n    posterUrl\n    height\n    width\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "63c9465d78b30d42d6fc11e50a9af142";

export default node;
