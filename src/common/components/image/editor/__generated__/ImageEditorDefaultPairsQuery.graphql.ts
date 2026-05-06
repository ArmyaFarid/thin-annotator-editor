/**
 * @generated SignedSource<<bd931757fed484847742b0dc829fb9b7>>
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
        readonly id: string;
        readonly path: string;
        readonly url: string;
        readonly width: number;
      };
      readonly polarizedFilterType: PolarizedFilterType;
    }>;
    readonly gammas: ReadonlyArray<number | null | undefined>;
    readonly id: string;
    readonly polarizedFilterTypes: ReadonlyArray<PolarizedFilterType>;
    readonly sampleId: string;
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
v1 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "ThinSectionImagePairs",
    "kind": "LinkedField",
    "name": "defaultPairs",
    "plural": false,
    "selections": [
      (v0/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "sampleId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "polarizedFilterTypes",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "gammas",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "AcquiredImage",
        "kind": "LinkedField",
        "name": "acquiredImages",
        "plural": true,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "polarizedFilterType",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "gamma",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "Image",
            "kind": "LinkedField",
            "name": "image",
            "plural": false,
            "selections": [
              (v0/*: any*/),
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "path",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "url",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "width",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "height",
                "storageKey": null
              }
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "ImageEditorDefaultPairsQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "ImageEditorDefaultPairsQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "cc4570126c2a0996345ca87c33bca0bd",
    "id": null,
    "metadata": {},
    "name": "ImageEditorDefaultPairsQuery",
    "operationKind": "query",
    "text": "query ImageEditorDefaultPairsQuery {\n  defaultPairs {\n    id\n    sampleId\n    polarizedFilterTypes\n    gammas\n    acquiredImages {\n      polarizedFilterType\n      gamma\n      image {\n        id\n        path\n        url\n        width\n        height\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "75e11c3d9cd4e2c47ef82a6af2abe002";

export default node;
