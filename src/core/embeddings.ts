import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getEmbeddingsCachePath, getGlobalModelCacheDir, ensureDir } from '../utils/paths.js';
import { info } from '../utils/display.js';

interface EmbeddingsCache {
  [contentHash: string]: number[];
}

type EmbeddingOutput = { tolist: () => number[][] };
type EmbeddingPipeline = (text: string) => Promise<EmbeddingOutput>;

let pipelineInstance: EmbeddingPipeline | null = null;

function contentHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

async function loadPipeline(): Promise<EmbeddingPipeline> {
  if (pipelineInstance) return pipelineInstance;

  const cacheDir = getGlobalModelCacheDir();
  ensureDir(cacheDir);

  const transformers = await import('@xenova/transformers');
  transformers.env.cacheDir = cacheDir;
  transformers.env.allowLocalModels = true;

  // Check if model is already downloaded
  const modelMarker = path.join(cacheDir, 'Xenova', 'all-MiniLM-L6-v2');
  const isFirstRun = !fs.existsSync(modelMarker);

  if (isFirstRun) {
    info('Downloading embedding model (all-MiniLM-L6-v2, ~80MB)...');
    info('This is a one-time download.');
  }

  const extractor = await transformers.pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2'
  );

  pipelineInstance = async (text: string): Promise<EmbeddingOutput> => {
    const result = await extractor(text, { pooling: 'mean', normalize: true });
    return result as EmbeddingOutput;
  };

  return pipelineInstance;
}

function loadCache(taskDir: string): EmbeddingsCache {
  const cachePath = getEmbeddingsCachePath(taskDir);
  if (fs.existsSync(cachePath)) {
    const raw = fs.readFileSync(cachePath, 'utf-8');
    return JSON.parse(raw) as EmbeddingsCache;
  }
  return {};
}

function saveCache(taskDir: string, cache: EmbeddingsCache): void {
  const cachePath = getEmbeddingsCachePath(taskDir);
  const dir = path.dirname(cachePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cache), 'utf-8');
}

export async function embedTexts(
  texts: string[],
  taskDir: string
): Promise<number[][]> {
  const pipe = await loadPipeline();

  const cache = loadCache(taskDir);
  const results: number[][] = new Array(texts.length);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  for (let i = 0; i < texts.length; i++) {
    const hash = contentHash(texts[i]);
    if (cache[hash]) {
      results[i] = cache[hash];
    } else {
      uncachedIndices.push(i);
      uncachedTexts.push(texts[i]);
    }
  }

  if (uncachedTexts.length > 0) {
    for (let j = 0; j < uncachedTexts.length; j++) {
      const output = await pipe(uncachedTexts[j]);
      const embedding: number[] = output.tolist()[0];
      const globalIndex = uncachedIndices[j];
      results[globalIndex] = embedding;

      const hash = contentHash(uncachedTexts[j]);
      cache[hash] = embedding;
    }

    saveCache(taskDir, cache);
  }

  return results;
}

export async function embedText(text: string, taskDir: string): Promise<number[]> {
  const results = await embedTexts([text], taskDir);
  return results[0];
}

export const EMBEDDING_DIM = 384;
