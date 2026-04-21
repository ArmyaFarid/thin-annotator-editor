/**
 * @generated SignedSource<<41451d1eee6e976901a3051b37be9b50>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest, Query } from 'relay-runtime';
export type ImageEditorImgQuery$variables = Record<PropertyKey, never>;
export type ImageEditorImgQuery$data = {
  readonly defaultImage: {
    readonly height: number;
    readonly path: string;
    readonly url: string;
    readonly width: number;
  };
};
export type ImageEditorImgQuery = {
  response: ImageEditorImgQuery$data;
  variables: ImageEditorImgQuery$variables;
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
  "name": "url",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "height",
  "storageKey": null
},
v3 = {
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
    "name": "ImageEditorImgQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "Image",
        "kind": "LinkedField",
        "name": "defaultImage",
        "plural": false,
        "selections": [
          (v0/*: any*/),
          (v1/*: any*/),
          (v2/*: any*/),
          (v3/*: any*/)
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
    "name": "ImageEditorImgQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "Image",
        "kind": "LinkedField",
        "name": "defaultImage",
        "plural": false,
        "selections": [
          (v0/*: any*/),
          (v1/*: any*/),
          (v2/*: any*/),
          (v3/*: any*/),
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
    "cacheID": "53a5d9c6da63af54366cae5cdd13fe4c",
    "id": null,
    "metadata": {},
    "name": "ImageEditorImgQuery",
    "operationKind": "query",
    "text": "query ImageEditorImgQuery {\n  defaultImage {\n    path\n    url\n    height\n    width\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "53ace7126f052efe54c583b7f8b7b462";

export default node;
