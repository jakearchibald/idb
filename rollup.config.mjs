import { promises as fsp } from 'fs';
import { basename } from 'path';

import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { deleteAsync } from 'del';
import { glob } from 'glob';

export default async function ({ watch }) {
  await deleteAsync(['.ts-tmp', 'build', 'tmp']);

  const builds = [];

  // Main
  builds.push({
    plugins: [
      typescript({ cacheDir: '.ts-tmp', tsconfig: 'src/tsconfig.json' }),
    ],
    input: ['src/index.ts'],
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

  // Tests
  if (!process.env.PRODUCTION) {
    builds.push({
      plugins: [
        typescript({ cacheDir: '.ts-tmp', tsconfig: 'test/tsconfig.json' }),
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
    ...(await glob('size-tests/*.js').then((paths) =>
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
