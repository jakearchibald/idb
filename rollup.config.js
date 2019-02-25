import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

const testBuild = {
  plugins: [
    resolve(),
    commonjs({
      namedExports: {
        'chai': ['assert'],
      },
    }),
    typescript(),
    copy({
      'test/index.html': 'test-build/index.html',
    }),
  ],
  input: 'test/index.ts',
  output: {
    file: 'test-build/index.js',
    format: 'iife'
  },
};

const esm = {
  plugins: [typescript()],
  input: 'lib/index.ts',
  output: {
    file: 'build/idb.mjs',
    format: 'esm'
  },
};

const iffe = {
  input: 'build/idb.mjs',
  output: {
    file: 'build/idb.js',
    format: 'iife',
    name: 'idb'
  },
};

const iffeMin = {
  input: 'build/idb.mjs',
  plugins: [
    terser({
      compress: { ecma: 6 },
    })
  ],
  output: {
    file: 'build/idb-min.js',
    format: 'iife',
    name: 'idb'
  },
};

export default [testBuild, esm, iffe, iffeMin];
