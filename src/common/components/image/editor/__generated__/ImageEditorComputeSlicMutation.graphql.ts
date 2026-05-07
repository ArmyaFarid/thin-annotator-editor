/**
 * @generated SignedSource<<ed38d92d2ed93dbceb4907ff216cb8b9>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest, Mutation } from 'relay-runtime';
export type SlicImageInput = {
  bbox: ReadonlyArray<number>;
  imageId: string;
  imagePath: string;
};
export type ImageEditorComputeSlicMutation$variables = {
  input: SlicImageInput;
};
export type ImageEditorComputeSlicMutation$data = {
  readonly computeSlicImage: {
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
export type ImageEditorComputeSlicMutation = {
  response: ImageEditorComputeSlicMutation$data;
  variables: ImageEditorComputeSlicMutation$variables;
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
    "name": "computeSlicImage",
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
    "name": "ImageEditorComputeSlicMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "ImageEditorComputeSlicMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "4c9b7df46c0519a2f3ff9905098ef42c",
    "id": null,
    "metadata": {},
    "name": "ImageEditorComputeSlicMutation",
    "operationKind": "mutation",
    "text": "mutation ImageEditorComputeSlicMutation(\n  $input: SlicImageInput!\n) {\n  computeSlicImage(input: $input) {\n    frameIndex\n    rleMaskList {\n      objectId\n      rleMask {\n        counts\n        size\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "233f9584ad43230145d44eee84469027";

export default node;
