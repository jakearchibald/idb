import typescript from 'rollup-plugin-typescript2';
import { terser } from "rollup-plugin-terser";

const esm = {
  plugins: [ typescript({ useTsconfigDeclarationDir: false }) ],
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

export default [esm, iffe, iffeMin];
