/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { spawn } from 'child_process';
import { relative, join, parse } from 'path';
import { promises as fsp } from 'fs';
import { promisify } from 'util';

import * as ts from 'typescript';
import glob from 'glob';

const globP = promisify(glob);

const extRe = /\.tsx?$/;

function loadConfig(mainPath) {
  const fileName = ts.findConfigFile(mainPath, ts.sys.fileExists);
  if (!fileName) throw Error('tsconfig not found');
  const text = ts.sys.readFile(fileName);
  const loadedConfig = ts.parseConfigFileTextToJson(fileName, text).config;
  const parsedTsConfig = ts.parseJsonConfigFileContent(
    loadedConfig,
    ts.sys,
    process.cwd(),
    undefined,
    fileName,
  );
  return parsedTsConfig;
}

export default function simpleTS(mainPath, { noBuild, watch } = {}) {
  const config = loadConfig(mainPath);
  const args = ['-b', mainPath];

  let done = Promise.resolve();

  if (!noBuild) {
    done = new Promise((resolve) => {
      const proc = spawn('tsc', args, {
        stdio: 'inherit',
      });

      proc.on('exit', (code) => {
        if (code !== 0) {
          throw Error('TypeScript build failed');
        }
        resolve();
      });
    });
  }

  if (!noBuild && watch) {
    done.then(() => {
      spawn('tsc', [...args, '--watch', '--preserveWatchOutput'], {
        stdio: 'inherit',
      });
    });
  }

  return {
    name: 'simple-ts',
    async buildStart() {
      await done;
      const matches = await globP(config.options.outDir + '/**/*.js');
      for (const match of matches) this.addWatchFile(match);
    },
    resolveId(id, importer) {
      // If there isn't an importer, it's an entry point, so we don't need to resolve it relative
      // to something.
      if (!importer) return null;

      const tsResolve = ts.resolveModuleName(
        id,
        importer,
        config.options,
        ts.sys,
      );

      if (
        // It didn't find anything
        !tsResolve.resolvedModule ||
        // Or if it's linking to a definition file, it's something in node_modules,
        // or something local like css.d.ts
        tsResolve.resolvedModule.extension === '.d.ts'
      ) {
        return null;
      }
      return tsResolve.resolvedModule.resolvedFileName;
    },
    async load(id) {
      if (!extRe.test(id)) return null;

      // Look for the JS equivalent in the tmp folder
      const basePath = join(
        config.options.outDir,
        relative(process.cwd(), id),
      ).replace(extRe, '');

      const srcP = fsp.readFile(basePath + '.js', { encoding: 'utf8' });

      // Also copy maps and definitions
      const assetExtensions = ['.d.ts', '.js.map', '.d.ts.map'];

      await Promise.all(
        assetExtensions.map(async (extension) => {
          const fileName = basePath + extension;
          const source = await fsp.readFile(fileName);
          this.emitFile({
            type: 'asset',
            source,
            fileName: parse(fileName).base,
          });
        }),
      );

      return srcP;
    },
  };
}
