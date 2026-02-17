import fs from 'node:fs';
import path from 'node:path';
import { findTaskDir, getModelDir, getModelMetadataPath, ensureDir } from '../utils/paths.js';
import { readConfig } from '../core/config.js';
import { success, error, info } from '../utils/display.js';

export async function exportCommand(outputDir: string): Promise<void> {
  const taskDir = findTaskDir();
  const config = readConfig(taskDir);
  const modelDir = getModelDir(taskDir);
  const metadataPath = getModelMetadataPath(taskDir);

  if (!fs.existsSync(metadataPath)) {
    error('No trained model found. Run "distill train" first.');
    process.exit(1);
  }

  const resolvedDir = path.resolve(outputDir);
  ensureDir(resolvedDir);

  // Copy model files
  const modelFiles = fs.readdirSync(modelDir).filter((f) => {
    const fullPath = path.join(modelDir, f);
    return fs.statSync(fullPath).isFile();
  });

  for (const file of modelFiles) {
    fs.copyFileSync(path.join(modelDir, file), path.join(resolvedDir, file));
  }

  // Generate standalone inference script
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  const isClassifier = metadata.type === 'classifier';

  const inferenceScript = generateInferenceScript(isClassifier, config.type);
  fs.writeFileSync(
    path.join(resolvedDir, 'inference.js'),
    inferenceScript,
    'utf-8'
  );

  // Generate a package.json for the exported model
  const exportPackageJson = {
    name: `${config.name}-model`,
    version: '1.0.0',
    type: 'module',
    description: `Exported distill model for ${config.name}`,
    dependencies: {
      '@tensorflow/tfjs-node': '^4.22.0',
      '@xenova/transformers': '^2.17.2',
    },
  };

  fs.writeFileSync(
    path.join(resolvedDir, 'package.json'),
    JSON.stringify(exportPackageJson, null, 2) + '\n',
    'utf-8'
  );

  success(`Model exported to ${resolvedDir}`);
  info('To use: npm install && node inference.js "your input text"');
}

function generateInferenceScript(isClassifier: boolean, taskType: string): string {
  if (isClassifier) {
    return `#!/usr/bin/env node
// Standalone inference script for distill classifier model
// Usage: node inference.js "your input text"
// Requires: npm install @tensorflow/tfjs-node @xenova/transformers

import tf from '@tensorflow/tfjs-node';
import { pipeline, env } from '@xenova/transformers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: node inference.js "your input text"');
    process.exit(1);
  }

  // Load metadata
  const metadata = JSON.parse(readFileSync(join(__dirname, 'metadata.json'), 'utf-8'));

  // Load embedding model
  env.allowLocalModels = true;
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  // Embed input
  const result = await extractor(input, { pooling: 'mean', normalize: true });
  const embedding = result.tolist()[0];

  // Load trained model
  const model = await tf.loadLayersModel('file://' + join(__dirname, 'model.json'));

  // Predict
  const inputTensor = tf.tensor2d([embedding]);
  const output = model.predict(inputTensor);
  const scores = await output.data();

  const results = metadata.categories.map((cat, i) => ({
    category: cat,
    confidence: Math.round(scores[i] * 1000) / 1000,
  }));
  results.sort((a, b) => b.confidence - a.confidence);

  console.log(JSON.stringify({
    input,
    output: results[0].category,
    confidence: results[0].confidence,
    allScores: results,
  }, null, 2));

  inputTensor.dispose();
  output.dispose();
  model.dispose();
}

main().catch(err => {
  console.error('Inference failed:', err.message);
  process.exit(1);
});
`;
  }

  return `#!/usr/bin/env node
// Standalone inference script for distill ${taskType} model (retrieval-based)
// Usage: node inference.js "your input text"
// Requires: npm install @xenova/transformers

import { pipeline, env } from '@xenova/transformers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: node inference.js "your input text"');
    process.exit(1);
  }

  // Load retrieval model
  const modelData = JSON.parse(readFileSync(join(__dirname, 'retrieval_model.json'), 'utf-8'));

  // Load embedding model
  env.allowLocalModels = true;
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  // Embed input
  const result = await extractor(input, { pooling: 'mean', normalize: true });
  const queryEmbedding = result.tolist()[0];

  // Find most similar
  const similarities = modelData.embeddings.map((emb, i) => ({
    index: i,
    similarity: cosineSimilarity(queryEmbedding, emb),
  }));
  similarities.sort((a, b) => b.similarity - a.similarity);
  const best = similarities[0];
  const sample = modelData.samples[best.index];

  console.log(JSON.stringify({
    input,
    output: sample.output,
    confidence: Math.round(best.similarity * 1000) / 1000,
  }, null, 2));
}

main().catch(err => {
  console.error('Inference failed:', err.message);
  process.exit(1);
});
`;
}
