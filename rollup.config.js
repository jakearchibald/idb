import { promises as fsp } from 'fs';

import { terser } from 'rollup-plugin-terser';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import del from 'del';

import simpleTS from './lib/simple-ts';

export default async function({ watch }) {
  await del('build');

  const builds = [];

  // Main
  builds.push({
    plugins: [simpleTS('test', { watch })],
    input: ['src/index.ts', 'src/async-iterators.ts'],
    output: [
      {
        dir: 'build/esm/',
        format: 'esm',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      },
      {
        dir: 'build/cjs/',
        format: 'cjs',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      },
    ],
  });

  // Minified iife
  builds.push({
    input: 'build/esm/index.js',
    plugins: [
      terser({
        compress: { ecma: 2019 },
      }),
    ],
    output: {
      file: 'build/iife/index-min.js',
      format: 'iife',
      name: 'idb',
    },
  });

  // Minified iife including iteration
  builds.push({
    input: './with-async-ittr.js',
    plugins: [
      terser({
        compress: { ecma: 2019 },
      }),
    ],
    output: {
      file: 'build/iife/with-async-ittr-min.js',
      format: 'iife',
      name: 'idb',
    },
  });

  // Tests
  if (!process.env.PRODUCTION) {
    builds.push({
      plugins: [
        simpleTS('test', { noBuild: true }),
        resolve(),
        commonjs({
          namedExports: {
            chai: ['assert'],
          },
        }),
        {
          async generateBundle() {
            this.emitFile({
              type: 'asset',
              source: await fsp.readFile('test/index.html'),
              fileName: 'index.html',
            });
          },
        },
      ],
      input: [
        'test/index.ts',
        'test/main.ts',
        'test/open.ts',
        'test/iterate.ts',
      ],
      output: {
        dir: 'build/test',
        format: 'esm',
      },
    });
  }

  return builds;
}
