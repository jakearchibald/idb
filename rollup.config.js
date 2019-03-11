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
  plugins: [typescript({ useTsconfigDeclarationDir: true })],
  input: ['lib/index.ts', 'lib/async-iterators.ts'],
  output: [{
    dir: 'build/esm/',
    format: 'esm',
    entryFileNames: '[name].mjs',
    chunkFileNames: '[name].mjs',
  }, {
    dir: 'build/cjs/',
    format: 'cjs',
    entryFileNames: '[name].js',
    chunkFileNames: '[name].js',
  }],
};

const iffe = {
  input: 'build/esm/index.mjs',
  output: {
    file: 'build/iife/index.js',
    format: 'iife',
    name: 'idb',
  },
};

const iffeMin = {
  input: 'build/esm/index.mjs',
  plugins: [
    terser({
      compress: { ecma: 6 },
    })
  ],
  output: {
    file: 'build/iife/index-min.js',
    format: 'iife',
    name: 'idb'
  },
};

const cjsAsyncIttrEntry = {
  input: './with-async-ittr.mjs',
  external: ['./build/esm/index.mjs', './build/esm/async-iterators.mjs'],
  output: {
    file: './with-async-ittr.js',
    format: 'cjs',
  },
};

export default [testBuild, esm, iffe, iffeMin, cjsAsyncIttrEntry];
