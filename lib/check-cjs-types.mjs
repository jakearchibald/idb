import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const result = ts.resolveModuleName(
  'idb',
  `${root}tmp/cjs-consumer/index.cts`,
  {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
  },
  ts.sys,
).resolvedModule;

assert(result, 'Could not resolve idb from a CommonJS consumer');
assert.match(result.resolvedFileName, /build\/index\.d\.cts$/);
console.log('CommonJS resolves its own declaration file');
