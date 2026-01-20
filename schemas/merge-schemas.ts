/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {getIntrospectionQuery, buildClientSchema, printSchema} from 'graphql';
import {mergeTypeDefs} from '@graphql-tools/merge';
import fs from 'fs';
import path from 'path';
import * as prettier from 'prettier';

async function updateSchema() {
  // 1. Fetch the schema from your running Python backend
  const response = await fetch('http://localhost:7263/graphql', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({query: getIntrospectionQuery()}),
  });

  const introspectionResult = await response.json();
  const schema = buildClientSchema(introspectionResult.data);
  const backendTypeDefs = printSchema(schema);

  // 2. Merge it with any local .graphql files if necessary
  // (Or just overwrite the main schema.graphql with the backend result)
  const prettyTypeDefs = await prettier.format(backendTypeDefs, {
    parser: 'graphql',
  });

  fs.writeFileSync('schema.graphql', prettyTypeDefs);
  console.log('✅ Schema updated from backend!');
}

updateSchema();
