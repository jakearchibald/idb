import typescript from 'rollup-plugin-typescript2';
import copy from 'rollup-plugin-copy';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import serve from 'rollup-plugin-serve';

export default {
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
    serve({
      open: true,
      openPage: '/test-build/index.html',
      contentBase: './',
    }),
  ],
  input: ['test/index.ts', 'test/main.ts', 'test/open.ts', 'test/iterate.ts'],
  output: {
    dir: 'test-build',
    format: 'esm'
  },
}
