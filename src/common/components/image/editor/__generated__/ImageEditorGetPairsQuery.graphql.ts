/**
 * @generated SignedSource<<88c5b78cc25be142ade7f7fb244b03ba>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest, Query } from 'relay-runtime';
export type PolarizedFilterType = "FL" | "OTHER" | "PPL" | "RL" | "TR" | "XPL" | "XPL_GAMMA" | "%future added value";
export type ImageEditorGetPairsQuery$variables = {
  pairsCode: string;
  sampleId: string;
};
export type ImageEditorGetPairsQuery$data = {
  readonly getPairs: {
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
      readonly rotation: number | null | undefined;
    }>;
    readonly gammas: ReadonlyArray<number | null | undefined>;
    readonly id: string;
    readonly polarizedFilterTypes: ReadonlyArray<PolarizedFilterType>;
    readonly rotations: ReadonlyArray<number | null | undefined>;
    readonly sampleId: string;
  };
};
export type ImageEditorGetPairsQuery = {
  response: ImageEditorGetPairsQuery$data;
  variables: ImageEditorGetPairsQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "pairsCode"
  },
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "sampleId"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "pairsCode",
        "variableName": "pairsCode"
      },
      {
        "kind": "Variable",
        "name": "sampleId",
        "variableName": "sampleId"
      }
    ],
    "concreteType": "ThinSectionImagePairs",
    "kind": "LinkedField",
    "name": "getPairs",
    "plural": false,
    "selections": [
      (v1/*: any*/),
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
        "name": "rotations",
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
            "kind": "ScalarField",
            "name": "rotation",
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
              (v1/*: any*/),
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
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "ImageEditorGetPairsQuery",
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "ImageEditorGetPairsQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "90c6bbfc9795e5bedb15b925a7cda99a",
    "id": null,
    "metadata": {},
    "name": "ImageEditorGetPairsQuery",
    "operationKind": "query",
    "text": "query ImageEditorGetPairsQuery(\n  $pairsCode: String!\n  $sampleId: String!\n) {\n  getPairs(pairsCode: $pairsCode, sampleId: $sampleId) {\n    id\n    sampleId\n    polarizedFilterTypes\n    rotations\n    gammas\n    acquiredImages {\n      polarizedFilterType\n      gamma\n      rotation\n      image {\n        id\n        path\n        url\n        width\n        height\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "7a29bcb14a76cd588a5dc7777a04877f";

export default node;
