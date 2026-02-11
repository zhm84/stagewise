import { generateDeclarationFile } from './utils.js';
import { Extractor, ExtractorConfig } from '@microsoft/api-extractor';
import { resolve } from 'node:path';
import fs from 'node:fs/promises';

export default async function buildPluginSdk() {
  const unbundledTypesDir = resolve(
    process.cwd(),
    'tmp/plugin-sdk/unbundled-types',
  );
  await fs.mkdir(unbundledTypesDir, { recursive: true });

  generateDeclarationFile(
    {
      [resolve(process.cwd(), 'src/plugin-sdk/index.tsx')]: 'index',
    },
    unbundledTypesDir,
  );

  const extractorConfig = ExtractorConfig.loadFileAndPrepare(
    resolve(process.cwd(), 'api-extractor-configs/plugin-sdk.json'),
  );

  Extractor.invoke(extractorConfig, {});
}
