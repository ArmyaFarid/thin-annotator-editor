/**
 * @generated SignedSource<<a731addfc85cd66fd26c6a47c02d3244>>
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
    readonly thumbnailPath: string | null | undefined;
    readonly thumbnailUrl: string | null | undefined;
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
  "name": "thumbnailPath",
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
  "name": "thumbnailUrl",
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
    "cacheID": "71087167db0ef68521044c9d9ebb9eb2",
    "id": null,
    "metadata": {},
    "name": "ImageEditorImgQuery",
    "operationKind": "query",
    "text": "query ImageEditorImgQuery {\n  defaultImage {\n    path\n    thumbnailPath\n    url\n    thumbnailUrl\n    height\n    width\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "e424faa613267c5d8566c305d6c6fec1";

export default node;
