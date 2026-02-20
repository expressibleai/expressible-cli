import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getGlobalModelCacheDir, getConfigPath } from '../utils/paths.js';
import { success, error, warn, info, heading } from '../utils/display.js';

interface Check {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

export async function doctorCommand(): Promise<void> {
  heading('Distill Doctor');
  console.log();

  const checks: Check[] = [];

  // 1. Node version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (major >= 18) {
    checks.push({ name: 'Node.js version', status: 'pass', message: `${nodeVersion} (>= 18 required)` });
  } else {
    checks.push({ name: 'Node.js version', status: 'fail', message: `${nodeVersion} — Node 18+ is required` });
  }

  // 2. TensorFlow.js
  try {
    await import('@tensorflow/tfjs-node');
    checks.push({ name: 'TensorFlow.js (native)', status: 'pass', message: 'tfjs-node loaded successfully' });
  } catch {
    try {
      await import('@tensorflow/tfjs');
      checks.push({ name: 'TensorFlow.js (pure JS)', status: 'warn', message: 'Native bindings unavailable, using pure JS fallback (slower)' });
    } catch {
      checks.push({ name: 'TensorFlow.js', status: 'fail', message: 'Neither tfjs-node nor tfjs could be loaded. Run: npm install' });
    }
  }

  // 3. Transformers.js
  try {
    await import('@xenova/transformers');
    checks.push({ name: 'Transformers.js', status: 'pass', message: 'Loaded successfully' });
  } catch {
    checks.push({ name: 'Transformers.js', status: 'fail', message: 'Could not load @xenova/transformers. Run: npm install' });
  }

  // 4. Embedding model downloaded
  const modelCacheDir = getGlobalModelCacheDir();
  const modelMarker = path.join(modelCacheDir, 'Xenova', 'all-MiniLM-L6-v2');
  if (fs.existsSync(modelMarker)) {
    const size = getDirectorySize(modelMarker);
    checks.push({ name: 'Embedding model', status: 'pass', message: `Downloaded (${formatBytes(size)}) at ${modelMarker}` });
  } else {
    checks.push({ name: 'Embedding model', status: 'warn', message: 'Not downloaded yet. Will download on first "expressible distill train" (~80MB). Or run: expressible distill setup' });
  }

  // 5. Disk space
  try {
    const stats = fs.statfsSync(os.homedir());
    const freeBytes = stats.bfree * stats.bsize;
    const freeMB = freeBytes / (1024 * 1024);
    if (freeMB > 500) {
      checks.push({ name: 'Disk space', status: 'pass', message: `${formatBytes(freeBytes)} free` });
    } else if (freeMB > 100) {
      checks.push({ name: 'Disk space', status: 'warn', message: `${formatBytes(freeBytes)} free — may be tight for training` });
    } else {
      checks.push({ name: 'Disk space', status: 'fail', message: `${formatBytes(freeBytes)} free — insufficient for model download and training` });
    }
  } catch {
    checks.push({ name: 'Disk space', status: 'warn', message: 'Could not check disk space' });
  }

  // 6. Current project
  const configPath = getConfigPath(process.cwd());
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      checks.push({ name: 'Current project', status: 'pass', message: `"${config.name}" (${config.type})` });

      // Check samples
      const samplesDir = path.join(process.cwd(), 'samples');
      if (fs.existsSync(samplesDir)) {
        const inputFiles = fs.readdirSync(samplesDir).filter((f) => f.includes('.input.'));
        if (inputFiles.length >= 10) {
          checks.push({ name: 'Training samples', status: 'pass', message: `${inputFiles.length} samples (minimum 10)` });
        } else {
          checks.push({ name: 'Training samples', status: 'warn', message: `${inputFiles.length} samples — need at least 10` });
        }
      }

      // Check model
      const modelMetadata = path.join(process.cwd(), 'model', 'metadata.json');
      if (fs.existsSync(modelMetadata)) {
        const meta = JSON.parse(fs.readFileSync(modelMetadata, 'utf-8'));
        checks.push({ name: 'Trained model', status: 'pass', message: `Trained at ${new Date(meta.trainedAt).toLocaleString()}` });
      } else {
        checks.push({ name: 'Trained model', status: 'warn', message: 'No model trained yet. Run: expressible distill train' });
      }
    } catch {
      checks.push({ name: 'Current project', status: 'fail', message: 'distill.config.json is corrupted' });
    }
  } else {
    checks.push({ name: 'Current project', status: 'warn', message: 'Not inside a distill project directory' });
  }

  // Print results
  let hasFailures = false;
  for (const check of checks) {
    if (check.status === 'pass') {
      success(`${check.name}: ${check.message}`);
    } else if (check.status === 'warn') {
      warn(`${check.name}: ${check.message}`);
    } else {
      error(`${check.name}: ${check.message}`);
      hasFailures = true;
    }
  }

  console.log();
  if (hasFailures) {
    error('Some checks failed. Fix the issues above before using distill.');
  } else {
    success('All checks passed.');
  }
}

function getDirectorySize(dirPath: string): number {
  let totalSize = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isFile()) {
        totalSize += fs.statSync(fullPath).size;
      } else if (entry.isDirectory()) {
        totalSize += getDirectorySize(fullPath);
      }
    }
  } catch {
    // Permission denied or other FS errors
  }
  return totalSize;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
