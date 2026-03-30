/**
 * @generated SignedSource<<55fae1268496e53705a128761335153b>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest, Mutation } from 'relay-runtime';
export type AddPointsImageInput = {
  labels: ReadonlyArray<number>;
  objectId: number;
  points: ReadonlyArray<ReadonlyArray<number>>;
  sessionId: string;
};
export type ImageEditorAddPointsMutation$variables = {
  input: AddPointsImageInput;
};
export type ImageEditorAddPointsMutation$data = {
  readonly addPointsImage: {
    readonly frameIndex: number;
    readonly rleMaskList: ReadonlyArray<{
      readonly objectId: number;
      readonly rleMask: {
        readonly counts: string;
        readonly size: ReadonlyArray<number>;
      };
    }>;
  };
};
export type ImageEditorAddPointsMutation = {
  response: ImageEditorAddPointsMutation$data;
  variables: ImageEditorAddPointsMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "RLEMaskListOnFrame",
    "kind": "LinkedField",
    "name": "addPointsImage",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "frameIndex",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "RLEMaskForObject",
        "kind": "LinkedField",
        "name": "rleMaskList",
        "plural": true,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "objectId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "RLEMask",
            "kind": "LinkedField",
            "name": "rleMask",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "counts",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "size",
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
    "name": "ImageEditorAddPointsMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "ImageEditorAddPointsMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "11432050ff27873f6843f98e6e43237e",
    "id": null,
    "metadata": {},
    "name": "ImageEditorAddPointsMutation",
    "operationKind": "mutation",
    "text": "mutation ImageEditorAddPointsMutation(\n  $input: AddPointsImageInput!\n) {\n  addPointsImage(input: $input) {\n    frameIndex\n    rleMaskList {\n      objectId\n      rleMask {\n        counts\n        size\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "922273a9a75e7aeb4d726a4c2718a946";

export default node;
