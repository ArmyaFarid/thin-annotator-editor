/**
 * @generated SignedSource<<dcd729c5c239560ea4333f7fbeff766c>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest, Mutation } from 'relay-runtime';
export type StartSessionInput = {
  pairsCode: string;
  path: string;
  sampleId: string;
};
export type ImageEditorStartSessionMutation$variables = {
  input: StartSessionInput;
};
export type ImageEditorStartSessionMutation$data = {
  readonly startSessionImage: {
    readonly sessionId: string;
  };
};
export type ImageEditorStartSessionMutation = {
  response: ImageEditorStartSessionMutation$data;
  variables: ImageEditorStartSessionMutation$variables;
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
    "concreteType": "StartSession",
    "kind": "LinkedField",
    "name": "startSessionImage",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "sessionId",
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
    "name": "ImageEditorStartSessionMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "ImageEditorStartSessionMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "2a960e560e583e0b02161f1155f031bb",
    "id": null,
    "metadata": {},
    "name": "ImageEditorStartSessionMutation",
    "operationKind": "mutation",
    "text": "mutation ImageEditorStartSessionMutation(\n  $input: StartSessionInput!\n) {\n  startSessionImage(input: $input) {\n    sessionId\n  }\n}\n"
  }
};
})();

(node as any).hash = "c7ad3e56a40366b6cf4a2e4055054a62";

export default node;
