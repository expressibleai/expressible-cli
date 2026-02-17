import { getGlobalModelCacheDir, ensureDir } from '../utils/paths.js';
import { success, info } from '../utils/display.js';

export async function setupCommand(): Promise<void> {
  info('Setting up distill...');

  const cacheDir = getGlobalModelCacheDir();
  ensureDir(cacheDir);

  info('Downloading embedding model (all-MiniLM-L6-v2, ~80MB)...');

  const transformers = await import('@xenova/transformers');
  transformers.env.cacheDir = cacheDir;
  transformers.env.allowLocalModels = true;

  await transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  success('Embedding model downloaded and cached.');
  success('Setup complete. You can now use distill offline.');
}
