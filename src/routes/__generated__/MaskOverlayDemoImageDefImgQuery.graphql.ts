/**
 * @generated SignedSource<<4283ba98a8d9f50a3f1f5b264625e10c>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest, Query } from 'relay-runtime';
export type MaskOverlayDemoImageDefImgQuery$variables = Record<PropertyKey, never>;
export type MaskOverlayDemoImageDefImgQuery$data = {
  readonly defaultImage: {
    readonly height: number;
    readonly path: string;
    readonly thumbnailPath: string | null | undefined;
    readonly thumbnailUrl: string | null | undefined;
    readonly url: string;
    readonly width: number;
  };
};
export type MaskOverlayDemoImageDefImgQuery = {
  response: MaskOverlayDemoImageDefImgQuery$data;
  variables: MaskOverlayDemoImageDefImgQuery$variables;
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
    "name": "MaskOverlayDemoImageDefImgQuery",
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
    "name": "MaskOverlayDemoImageDefImgQuery",
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
    "cacheID": "ff2325d208799605cb589f9e1f402368",
    "id": null,
    "metadata": {},
    "name": "MaskOverlayDemoImageDefImgQuery",
    "operationKind": "query",
    "text": "query MaskOverlayDemoImageDefImgQuery {\n  defaultImage {\n    path\n    thumbnailPath\n    url\n    thumbnailUrl\n    height\n    width\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "ecfe528725fd0507ff460384c77a1462";

export default node;
