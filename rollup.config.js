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
    typescript({
      tsconfig: 'test/tsconfig.json',
      useTsconfigDeclarationDir: true
    }),
    copy({
      'test/index.html': 'test-build/index.html',
    }),
  ],
  input: ['test/index.ts', 'test/main.ts', 'test/open.ts', 'test/iterate.ts'],
  output: {
    dir: 'test-build',
    format: 'esm'
  },
};

const esm = {
  plugins: [typescript({ useTsconfigDeclarationDir: true })],
  input: ['lib/index.ts', 'lib/async-iterators.ts'],
  output: [{
    dir: 'build/esm/',
    format: 'esm',
    entryFileNames: '[name].js',
    chunkFileNames: '[name].js',
  }, {
    dir: 'build/cjs/',
    format: 'cjs',
    entryFileNames: '[name].js',
    chunkFileNames: '[name].js',
  }],
};

const iffeMin = {
  input: 'build/esm/index.js',
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

const iffeIttrMin = {
  input: './with-async-ittr.js',
  plugins: [
    terser({
      compress: { ecma: 6 },
    })
  ],
  output: {
    file: 'build/iife/with-async-ittr-min.js',
    format: 'iife',
    name: 'idb'
  },
};

export default [
  testBuild, esm, iffeMin, iffeIttrMin,
];
