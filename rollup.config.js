import { promises as fsp } from 'fs';
import { promisify } from 'util';
import { basename } from 'path';

import { terser } from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import del from 'del';
import glob from 'glob';

import simpleTS from './lib/simple-ts';

const globP = promisify(glob);

export default async function ({ watch }) {
  await del(['.ts-tmp', 'build', 'tmp']);

  const builds = [];

  // Main
  builds.push({
    plugins: [simpleTS('test', { watch })],
    input: ['src/index.ts', 'src/async-iterators.ts'],
    output: [
      {
        dir: 'build/',
        format: 'esm',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      },
      {
        dir: 'build/',
        format: 'cjs',
        entryFileNames: '[name].cjs',
        chunkFileNames: '[name].cjs',
      },
    ],
  });

  // Minified iife
  builds.push({
    input: 'build/index.js',
    plugins: [
      terser({
        compress: { ecma: 2019 },
      }),
    ],
    output: {
      file: 'build/umd.js',
      format: 'umd',
      esModule: false,
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
      file: 'build/umd-with-async-ittr.js',
      format: 'umd',
      esModule: false,
      name: 'idb',
    },
  });

  // Tests
  if (!process.env.PRODUCTION) {
    builds.push({
      plugins: [
        simpleTS('test', { noBuild: true }),
        resolve(),
        commonjs(),
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

  builds.push(
    ...(await globP('size-tests/*.js').then((paths) =>
      paths.map((path) => ({
        input: path,
        plugins: [
          terser({
            compress: { ecma: 2020 },
          }),
        ],
        output: [
          {
            file: `tmp/size-tests/${basename(path)}`,
            format: 'esm',
          },
        ],
      })),
    )),
  );

  return builds;
}
