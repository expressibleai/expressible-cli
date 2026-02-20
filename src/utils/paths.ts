import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

export function getTaskDir(taskName?: string): string {
  if (taskName) {
    return path.resolve(process.cwd(), taskName);
  }
  return process.cwd();
}

export function getSamplesDir(taskDir: string): string {
  return path.join(taskDir, 'samples');
}

export function getModelDir(taskDir: string): string {
  return path.join(taskDir, 'model');
}

export function getValidationDir(taskDir: string): string {
  return path.join(taskDir, 'validation');
}

export function getInternalDir(taskDir: string): string {
  return path.join(taskDir, '.distill');
}

export function getConfigPath(taskDir: string): string {
  return path.join(taskDir, 'distill.config.json');
}

export function getEmbeddingsCachePath(taskDir: string): string {
  return path.join(getInternalDir(taskDir), 'embeddings_cache.json');
}

export function getValidationResultsPath(taskDir: string): string {
  return path.join(getValidationDir(taskDir), 'results.json');
}

export function getModelMetadataPath(taskDir: string): string {
  return path.join(getModelDir(taskDir), 'metadata.json');
}

export function getGlobalModelCacheDir(): string {
  return path.join(os.homedir(), '.distill', 'models');
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function findTaskDir(): string {
  let dir = process.cwd();
  while (true) {
    const configPath = path.join(dir, 'distill.config.json');
    if (fs.existsSync(configPath)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error(
    'Not inside a distill project. Run "expressible distill init <task-name>" to create one, or cd into an existing project.'
  );
}
