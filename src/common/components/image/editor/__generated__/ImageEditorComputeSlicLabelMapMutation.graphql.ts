/**
 * @generated SignedSource<<de38228f3d64ac57b74ee53da066a4ff>>
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
export type ImageEditorComputeSlicLabelMapMutation$variables = {
  input: SlicImageInput;
};
export type ImageEditorComputeSlicLabelMapMutation$data = {
  readonly computeSlicImageGetLabelMap: {
    readonly bbox: {
      readonly h: number;
      readonly w: number;
      readonly x: number;
      readonly y: number;
    };
    readonly data: string;
    readonly dtype: string;
    readonly height: number;
    readonly width: number;
  };
};
export type ImageEditorComputeSlicLabelMapMutation = {
  response: ImageEditorComputeSlicLabelMapMutation$data;
  variables: ImageEditorComputeSlicLabelMapMutation$variables;
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
    "concreteType": "SlicLabelMap",
    "kind": "LinkedField",
    "name": "computeSlicImageGetLabelMap",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "data",
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
        "name": "width",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "dtype",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "BBox",
        "kind": "LinkedField",
        "name": "bbox",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "x",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "y",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "w",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "h",
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
    "name": "ImageEditorComputeSlicLabelMapMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "ImageEditorComputeSlicLabelMapMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "185add313b77de03bec6a13ee44111b7",
    "id": null,
    "metadata": {},
    "name": "ImageEditorComputeSlicLabelMapMutation",
    "operationKind": "mutation",
    "text": "mutation ImageEditorComputeSlicLabelMapMutation(\n  $input: SlicImageInput!\n) {\n  computeSlicImageGetLabelMap(input: $input) {\n    data\n    height\n    width\n    dtype\n    bbox {\n      x\n      y\n      w\n      h\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "f98628a5a8a6e357dca333e16a66a86b";

export default node;
