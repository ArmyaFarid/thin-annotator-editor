/**
 * @generated SignedSource<<c8c822cf2f217ee76c242bf7eeb227f6>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest, Query } from 'relay-runtime';
export type PolarizedFilterType = "OTHER" | "PPL" | "XPL" | "XPL_GAMMA" | "%future added value";
export type ImageEditorDefaultPairsQuery$variables = Record<PropertyKey, never>;
export type ImageEditorDefaultPairsQuery$data = {
  readonly defaultPairs: {
    readonly acquiredImages: ReadonlyArray<{
      readonly gamma: number | null | undefined;
      readonly image: {
        readonly height: number;
        readonly path: string;
        readonly url: string;
        readonly width: number;
      };
      readonly polarizedFilterType: PolarizedFilterType;
    }>;
    readonly gammas: ReadonlyArray<number | null | undefined>;
    readonly id: string;
    readonly polarizedFilterTypes: ReadonlyArray<PolarizedFilterType>;
  };
};
export type ImageEditorDefaultPairsQuery = {
  response: ImageEditorDefaultPairsQuery$data;
  variables: ImageEditorDefaultPairsQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "polarizedFilterTypes",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "gammas",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "polarizedFilterType",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "gamma",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "path",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "url",
  "storageKey": null
},
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "width",
  "storageKey": null
},
v8 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "height",
  "storageKey": null
};
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "ImageEditorDefaultPairsQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "ThinSectionImagePairs",
        "kind": "LinkedField",
        "name": "defaultPairs",
        "plural": false,
        "selections": [
          (v0/*: any*/),
          (v1/*: any*/),
          (v2/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "AcquiredImage",
            "kind": "LinkedField",
            "name": "acquiredImages",
            "plural": true,
            "selections": [
              (v3/*: any*/),
              (v4/*: any*/),
              {
                "alias": null,
                "args": null,
                "concreteType": "Image",
                "kind": "LinkedField",
                "name": "image",
                "plural": false,
                "selections": [
                  (v5/*: any*/),
                  (v6/*: any*/),
                  (v7/*: any*/),
                  (v8/*: any*/)
                ],
                "storageKey": null
              }
            ],
            "storageKey": null
          }
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
    "name": "ImageEditorDefaultPairsQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "ThinSectionImagePairs",
        "kind": "LinkedField",
        "name": "defaultPairs",
        "plural": false,
        "selections": [
          (v0/*: any*/),
          (v1/*: any*/),
          (v2/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "AcquiredImage",
            "kind": "LinkedField",
            "name": "acquiredImages",
            "plural": true,
            "selections": [
              (v3/*: any*/),
              (v4/*: any*/),
              {
                "alias": null,
                "args": null,
                "concreteType": "Image",
                "kind": "LinkedField",
                "name": "image",
                "plural": false,
                "selections": [
                  (v5/*: any*/),
                  (v6/*: any*/),
                  (v7/*: any*/),
                  (v8/*: any*/),
                  (v0/*: any*/)
                ],
                "storageKey": null
              }
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "fbc9a087a803686462979e1fac62da79",
    "id": null,
    "metadata": {},
    "name": "ImageEditorDefaultPairsQuery",
    "operationKind": "query",
    "text": "query ImageEditorDefaultPairsQuery {\n  defaultPairs {\n    id\n    polarizedFilterTypes\n    gammas\n    acquiredImages {\n      polarizedFilterType\n      gamma\n      image {\n        path\n        url\n        width\n        height\n        id\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "7c76b7a49c10d5b1638ce3f860bd38f7";

export default node;
