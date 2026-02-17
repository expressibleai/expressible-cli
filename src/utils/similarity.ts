export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

export function findTopK(
  queryEmbedding: number[],
  embeddings: number[][],
  k: number
): { index: number; similarity: number }[] {
  const similarities = embeddings.map((emb, index) => ({
    index,
    similarity: cosineSimilarity(queryEmbedding, emb),
  }));

  similarities.sort((a, b) => b.similarity - a.similarity);

  return similarities.slice(0, k);
}
