import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  saveRetrievalModel,
  loadRetrievalModel,
  retrievalPredict,
  evaluateRetrievalAccuracy,
} from '../src/core/retrieval.js';
import type { SamplePair } from '../src/core/data.js';

describe('retrieval module', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'distill-retrieval-test-'));
    fs.mkdirSync(path.join(tempDir, 'model'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const samples: SamplePair[] = [
    { id: '001', input: 'hello', output: 'greeting' },
    { id: '002', input: 'goodbye', output: 'farewell' },
    { id: '003', input: 'hi there', output: 'greeting' },
  ];

  // Simple embeddings for testing (not real embeddings)
  const embeddings = [
    [1, 0, 0],
    [0, 1, 0],
    [0.9, 0.1, 0],
  ];

  it('should save and load retrieval model', () => {
    saveRetrievalModel(embeddings, samples, 'transform', tempDir);
    const loaded = loadRetrievalModel(tempDir);

    expect(loaded.samples).toHaveLength(3);
    expect(loaded.embeddings).toHaveLength(3);
    expect(loaded.type).toBe('retrieval');
  });

  it('should predict using nearest neighbor', () => {
    saveRetrievalModel(embeddings, samples, 'transform', tempDir);

    // Query most similar to first sample
    const query = [0.95, 0.05, 0];
    const result = retrievalPredict(query, tempDir, 2);

    expect(result.output).toBe('greeting');
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.topMatches).toHaveLength(2);
  });

  it('should throw when no model exists', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'distill-empty-'));
    fs.mkdirSync(path.join(emptyDir, 'model'), { recursive: true });

    expect(() => loadRetrievalModel(emptyDir)).toThrow('No trained retrieval model found');

    fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  it('should evaluate leave-one-out accuracy', () => {
    // With our test embeddings, sample 0 and 2 are very similar (both "greeting"),
    // and sample 1 is different ("farewell")
    const accuracy = evaluateRetrievalAccuracy(embeddings, samples);
    // Sample 0's nearest is sample 2 (greeting=greeting: correct)
    // Sample 1's nearest depends on embedding distance
    // Sample 2's nearest is sample 0 (greeting=greeting: correct)
    expect(accuracy).toBeGreaterThanOrEqual(0.5);
  });
});
