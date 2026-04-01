/**
 * @generated SignedSource<<1801b1c1745616d84e4417f04db920de>>
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
      readonly acquisitionLabel: string | null | undefined;
      readonly gamma: number | null | undefined;
      readonly image: {
        readonly height: number;
        readonly id: string;
        readonly path: string;
        readonly thumbnailPath: string | null | undefined;
        readonly thumbnailUrl: string | null | undefined;
        readonly url: string;
        readonly width: number;
      };
      readonly polarizedFilterType: PolarizedFilterType;
    }>;
    readonly description: string | null | undefined;
    readonly gammas: ReadonlyArray<number | null | undefined>;
    readonly id: string;
    readonly label: string | null | undefined;
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
        "name": "label",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "description",
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
            "kind": "ScalarField",
            "name": "acquisitionLabel",
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
                "name": "width",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "height",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "thumbnailPath",
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
                "name": "thumbnailUrl",
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
    "cacheID": "2454a4a381c34edb96b36612da4923d6",
    "id": null,
    "metadata": {},
    "name": "ImageEditorDefaultPairsQuery",
    "operationKind": "query",
    "text": "query ImageEditorDefaultPairsQuery {\n  defaultPairs {\n    id\n    sampleId\n    label\n    description\n    polarizedFilterTypes\n    gammas\n    acquiredImages {\n      polarizedFilterType\n      gamma\n      acquisitionLabel\n      image {\n        id\n        path\n        width\n        height\n        thumbnailPath\n        url\n        thumbnailUrl\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "8613751c3be84abcc212d3cf4ff2078e";

export default node;
