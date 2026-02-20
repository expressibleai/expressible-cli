import fs from 'node:fs';
import path from 'node:path';
import { getModelDir, ensureDir } from '../utils/paths.js';
import { findTopK } from '../utils/similarity.js';
import type { SamplePair } from './data.js';

interface RetrievalModelData {
  type: 'retrieval';
  embeddings: number[][];
  samples: SamplePair[];
  trainedAt: string;
  numSamples: number;
}

interface RetrievalMetadata {
  type: 'retrieval';
  trainedAt: string;
  numSamples: number;
  taskType: string;
}

export interface RetrievalResult {
  output: string;
  confidence: number;
  topMatches: { input: string; output: string; similarity: number }[];
}

export function saveRetrievalModel(
  embeddings: number[][],
  samples: SamplePair[],
  taskType: string,
  taskDir: string
): void {
  const modelDir = getModelDir(taskDir);
  ensureDir(modelDir);

  const modelData: RetrievalModelData = {
    type: 'retrieval',
    embeddings,
    samples,
    trainedAt: new Date().toISOString(),
    numSamples: samples.length,
  };

  fs.writeFileSync(
    path.join(modelDir, 'retrieval_model.json'),
    JSON.stringify(modelData),
    'utf-8'
  );

  const metadata: RetrievalMetadata = {
    type: 'retrieval',
    trainedAt: new Date().toISOString(),
    numSamples: samples.length,
    taskType,
  };

  fs.writeFileSync(
    path.join(modelDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2) + '\n',
    'utf-8'
  );
}

export function loadRetrievalModel(taskDir: string): RetrievalModelData {
  const modelDir = getModelDir(taskDir);
  const modelPath = path.join(modelDir, 'retrieval_model.json');

  if (!fs.existsSync(modelPath)) {
    throw new Error('No trained retrieval model found. Run "expressible distill train" first.');
  }

  const raw = fs.readFileSync(modelPath, 'utf-8');
  return JSON.parse(raw) as RetrievalModelData;
}

export function retrievalPredict(
  queryEmbedding: number[],
  taskDir: string,
  k: number = 3
): RetrievalResult {
  const model = loadRetrievalModel(taskDir);
  const topK = findTopK(queryEmbedding, model.embeddings, k);

  const topMatches = topK.map((match) => ({
    input: model.samples[match.index].input,
    output: model.samples[match.index].output,
    similarity: match.similarity,
  }));

  // Return the output of the most similar example
  const best = topMatches[0];

  return {
    output: best.output,
    confidence: best.similarity,
    topMatches,
  };
}

export function evaluateRetrievalAccuracy(
  embeddings: number[][],
  samples: SamplePair[]
): number {
  // Leave-one-out evaluation
  let correct = 0;

  for (let i = 0; i < samples.length; i++) {
    // Build model without this sample
    const otherEmbeddings = embeddings.filter((_, idx) => idx !== i);
    const otherSamples = samples.filter((_, idx) => idx !== i);

    const topK = findTopK(embeddings[i], otherEmbeddings, 1);
    const predictedOutput = otherSamples[topK[0].index].output;

    if (predictedOutput.trim() === samples[i].output.trim()) {
      correct++;
    }
  }

  return correct / samples.length;
}
