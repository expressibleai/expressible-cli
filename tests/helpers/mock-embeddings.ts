import crypto from 'node:crypto';
import { EMBEDDING_DIM } from '../../src/core/embeddings.js';

/**
 * Generate a deterministic pseudo-embedding from text.
 * Not meaningful semantically, but consistent — same text always
 * produces the same vector. Different texts produce different vectors.
 * This lets us test the full pipeline without downloading the real model.
 */
export function mockEmbed(text: string): number[] {
  const hash = crypto.createHash('sha256').update(text).digest();
  const embedding: number[] = new Array(EMBEDDING_DIM);

  for (let i = 0; i < EMBEDDING_DIM; i++) {
    // Use bytes from hash cyclically, map to [-1, 1]
    embedding[i] = (hash[i % hash.length] / 255) * 2 - 1;
  }

  // Normalize
  const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    embedding[i] /= norm;
  }

  return embedding;
}

/**
 * Generate embeddings where texts in the same category cluster together.
 * This simulates what a real embedding model does — similar meaning = similar vectors.
 */
export function mockClusteredEmbed(text: string, category: string): number[] {
  const embedding = new Array(EMBEDDING_DIM).fill(0) as number[];

  // Base vector from category (creates distinct clusters)
  const catHash = crypto.createHash('sha256').update(category).digest();
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    embedding[i] = (catHash[i % catHash.length] / 255) * 2 - 1;
  }

  // Add small noise from the specific text (within-cluster variation)
  const textHash = crypto.createHash('sha256').update(text).digest();
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    embedding[i] += ((textHash[i % textHash.length] / 255) * 2 - 1) * 0.1;
  }

  // Normalize
  const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    embedding[i] /= norm;
  }

  return embedding;
}
