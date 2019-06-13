import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';

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
  esm, iffeMin, iffeIttrMin,
];
