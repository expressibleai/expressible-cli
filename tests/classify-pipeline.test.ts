import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  createTestProject,
  addClassifySamples,
  CLASSIFY_SAMPLES,
  type TestProject,
} from './helpers/test-project.js';
import { mockClusteredEmbed } from './helpers/mock-embeddings.js';
import { trainClassifier, predict } from '../src/core/classifier.js';
import { loadSamples, getUniqueOutputCategories } from '../src/core/data.js';
import { readConfig } from '../src/core/config.js';
import { EMBEDDING_DIM } from '../src/core/embeddings.js';

describe('classify pipeline (integration)', () => {
  let project: TestProject;

  beforeEach(() => {
    project = createTestProject('classify');
    addClassifySamples(project.dir, CLASSIFY_SAMPLES);
  });

  afterEach(() => {
    project.cleanup();
  });

  it('should load config correctly', () => {
    const config = readConfig(project.dir);
    expect(config.type).toBe('classify');
    expect(config.name).toBe('test-project');
  });

  it('should load all samples', () => {
    const samples = loadSamples(project.dir);
    expect(samples).toHaveLength(12);
  });

  it('should identify correct categories', () => {
    const samples = loadSamples(project.dir);
    const categories = getUniqueOutputCategories(samples);
    expect(categories).toEqual(['negative', 'neutral', 'positive']);
  });

  it('should train a classifier and save model files', async () => {
    const samples = loadSamples(project.dir);

    // Create clustered embeddings so the classifier can learn
    const embeddings = samples.map((s) => mockClusteredEmbed(s.input, s.output));
    const labels = samples.map((s) => s.output);

    const result = await trainClassifier(embeddings, labels, project.dir);

    expect(result.numSamples).toBe(12);
    expect(result.categories).toEqual(['negative', 'neutral', 'positive']);
    expect(result.epochs).toBeGreaterThan(0);
    expect(result.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.valAccuracy).toBeGreaterThanOrEqual(0);

    // Check model files exist
    const modelDir = path.join(project.dir, 'model');
    expect(fs.existsSync(path.join(modelDir, 'model.json'))).toBe(true);
    expect(fs.existsSync(path.join(modelDir, 'metadata.json'))).toBe(true);
  });

  it('should predict after training', async () => {
    const samples = loadSamples(project.dir);
    const embeddings = samples.map((s) => mockClusteredEmbed(s.input, s.output));
    const labels = samples.map((s) => s.output);

    await trainClassifier(embeddings, labels, project.dir);

    // Predict with an embedding similar to "positive" cluster
    const testEmbedding = mockClusteredEmbed('Fantastic product', 'positive');
    const prediction = await predict(testEmbedding, project.dir);

    expect(prediction.category).toBeDefined();
    expect(prediction.confidence).toBeGreaterThan(0);
    expect(prediction.confidence).toBeLessThanOrEqual(1);
    expect(prediction.allScores).toHaveLength(3);

    // Confidence values should sum to ~1
    const sum = prediction.allScores.reduce((s, item) => s + item.confidence, 0);
    expect(sum).toBeCloseTo(1, 1);
  });

  it('should predict correct category for clearly clustered input', async () => {
    const samples = loadSamples(project.dir);
    const embeddings = samples.map((s) => mockClusteredEmbed(s.input, s.output));
    const labels = samples.map((s) => s.output);

    await trainClassifier(embeddings, labels, project.dir);

    // Test each category
    const positiveEmb = mockClusteredEmbed('Great stuff', 'positive');
    const negativeEmb = mockClusteredEmbed('Horrible stuff', 'negative');
    const neutralEmb = mockClusteredEmbed('Okay stuff', 'neutral');

    const posPred = await predict(positiveEmb, project.dir);
    const negPred = await predict(negativeEmb, project.dir);
    const neuPred = await predict(neutralEmb, project.dir);

    expect(posPred.category).toBe('positive');
    expect(negPred.category).toBe('negative');
    expect(neuPred.category).toBe('neutral');
  });

  it('should save valid metadata', async () => {
    const samples = loadSamples(project.dir);
    const embeddings = samples.map((s) => mockClusteredEmbed(s.input, s.output));
    const labels = samples.map((s) => s.output);

    await trainClassifier(embeddings, labels, project.dir);

    const metadataPath = path.join(project.dir, 'model', 'metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    expect(metadata.type).toBe('classifier');
    expect(metadata.categories).toEqual(['negative', 'neutral', 'positive']);
    expect(metadata.numSamples).toBe(12);
    expect(metadata.trainedAt).toBeDefined();
    expect(new Date(metadata.trainedAt).getTime()).not.toBeNaN();
  });
});
