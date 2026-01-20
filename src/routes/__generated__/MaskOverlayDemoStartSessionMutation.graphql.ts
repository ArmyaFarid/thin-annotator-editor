/**
 * @generated SignedSource<<122fd9a38ba328510343898c1b7fd09c>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest, Mutation } from 'relay-runtime';
export type StartSessionInput = {
  path: string;
};
export type MaskOverlayDemoStartSessionMutation$variables = {
  input: StartSessionInput;
};
export type MaskOverlayDemoStartSessionMutation$data = {
  readonly startSessionImage: {
    readonly sessionId: string;
  };
};
export type MaskOverlayDemoStartSessionMutation = {
  response: MaskOverlayDemoStartSessionMutation$data;
  variables: MaskOverlayDemoStartSessionMutation$variables;
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
    "name": "MaskOverlayDemoStartSessionMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "MaskOverlayDemoStartSessionMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "4bfde9bcfe2969906419d4ca2deb1324",
    "id": null,
    "metadata": {},
    "name": "MaskOverlayDemoStartSessionMutation",
    "operationKind": "mutation",
    "text": "mutation MaskOverlayDemoStartSessionMutation(\n  $input: StartSessionInput!\n) {\n  startSessionImage(input: $input) {\n    sessionId\n  }\n}\n"
  }
};
})();

(node as any).hash = "10e184f5a8a42d6b2acdcdd7ab6d7baa";

export default node;
