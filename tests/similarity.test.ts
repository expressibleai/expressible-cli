import { describe, it, expect } from 'vitest';
import { cosineSimilarity, findTopK } from '../src/utils/similarity.js';

describe('cosineSimilarity', () => {
  it('should return 1 for identical vectors', () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it('should return 0 for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it('should return -1 for opposite vectors', () => {
    const a = [1, 0];
    const b = [-1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  it('should handle zero vectors', () => {
    const a = [0, 0, 0];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBe(0);
  });
});

describe('findTopK', () => {
  it('should find the most similar embeddings', () => {
    const query = [1, 0, 0];
    const embeddings = [
      [0, 1, 0], // orthogonal
      [1, 0.1, 0], // very similar
      [0.5, 0.5, 0], // somewhat similar
      [-1, 0, 0], // opposite
    ];

    const results = findTopK(query, embeddings, 2);
    expect(results).toHaveLength(2);
    expect(results[0].index).toBe(1); // most similar
    expect(results[1].index).toBe(2); // second most similar
    expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
  });

  it('should limit to K results', () => {
    const query = [1, 0];
    const embeddings = [[1, 0], [0, 1], [-1, 0]];

    const results = findTopK(query, embeddings, 1);
    expect(results).toHaveLength(1);
    expect(results[0].index).toBe(0);
  });
});
