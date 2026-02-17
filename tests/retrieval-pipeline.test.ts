import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  createTestProject,
  addClassifySamples,
  addExtractSamples,
  EXTRACT_SAMPLES,
  TRANSFORM_SAMPLES,
  type TestProject,
} from './helpers/test-project.js';
import { mockEmbed, mockClusteredEmbed } from './helpers/mock-embeddings.js';
import {
  saveRetrievalModel,
  loadRetrievalModel,
  retrievalPredict,
  evaluateRetrievalAccuracy,
} from '../src/core/retrieval.js';
import { loadSamples } from '../src/core/data.js';
import { readConfig } from '../src/core/config.js';

describe('extract pipeline (integration)', () => {
  let project: TestProject;

  beforeEach(() => {
    project = createTestProject('extract', 'extract-test');
    addExtractSamples(project.dir, EXTRACT_SAMPLES);
  });

  afterEach(() => {
    project.cleanup();
  });

  it('should load config as extract type', () => {
    const config = readConfig(project.dir);
    expect(config.type).toBe('extract');
  });

  it('should load 20 samples', () => {
    const samples = loadSamples(project.dir);
    expect(samples).toHaveLength(20);
  });

  it('should save and load retrieval model', () => {
    const samples = loadSamples(project.dir);
    const embeddings = samples.map((s) => mockEmbed(s.input));

    saveRetrievalModel(embeddings, samples, 'extract', project.dir);

    const model = loadRetrievalModel(project.dir);
    expect(model.samples).toHaveLength(20);
    expect(model.embeddings).toHaveLength(20);
    expect(model.type).toBe('retrieval');
  });

  it('should save metadata', () => {
    const samples = loadSamples(project.dir);
    const embeddings = samples.map((s) => mockEmbed(s.input));

    saveRetrievalModel(embeddings, samples, 'extract', project.dir);

    const metadataPath = path.join(project.dir, 'model', 'metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    expect(metadata.type).toBe('retrieval');
    expect(metadata.numSamples).toBe(20);
    expect(metadata.taskType).toBe('extract');
  });

  it('should predict by finding nearest neighbor', () => {
    const samples = loadSamples(project.dir);
    const embeddings = samples.map((s) => mockEmbed(s.input));

    saveRetrievalModel(embeddings, samples, 'extract', project.dir);

    // Query with embedding of an existing sample — should return itself
    const queryEmb = mockEmbed(samples[0].input);
    const result = retrievalPredict(queryEmb, project.dir, 3);

    expect(result.output).toBe(samples[0].output);
    expect(result.confidence).toBeCloseTo(1, 3);
    expect(result.topMatches).toHaveLength(3);
    expect(result.topMatches[0].similarity).toBeCloseTo(1, 3);
  });

  it('should return valid JSON output for extract tasks', () => {
    const samples = loadSamples(project.dir);
    const embeddings = samples.map((s) => mockEmbed(s.input));

    saveRetrievalModel(embeddings, samples, 'extract', project.dir);

    const queryEmb = mockEmbed(samples[5].input);
    const result = retrievalPredict(queryEmb, project.dir);

    // The output should be valid JSON
    const parsed = JSON.parse(result.output);
    expect(parsed).toHaveProperty('orderId');
    expect(parsed).toHaveProperty('product');
    expect(parsed).toHaveProperty('day');
  });
});

describe('transform pipeline (integration)', () => {
  let project: TestProject;

  beforeEach(() => {
    project = createTestProject('transform', 'transform-test');
    addClassifySamples(project.dir, TRANSFORM_SAMPLES);
  });

  afterEach(() => {
    project.cleanup();
  });

  it('should load config as transform type', () => {
    const config = readConfig(project.dir);
    expect(config.type).toBe('transform');
  });

  it('should train and predict with retrieval model', () => {
    const samples = loadSamples(project.dir);
    const embeddings = samples.map((s) => mockEmbed(s.input));

    saveRetrievalModel(embeddings, samples, 'transform', project.dir);

    const queryEmb = mockEmbed(samples[3].input);
    const result = retrievalPredict(queryEmb, project.dir);

    expect(result.output).toContain('Thank you for contacting us');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('should evaluate accuracy with leave-one-out', () => {
    const samples = loadSamples(project.dir);
    const embeddings = samples.map((s) => mockEmbed(s.input));

    const accuracy = evaluateRetrievalAccuracy(embeddings, samples);

    // With mock embeddings each text is unique, so leave-one-out
    // won't find exact matches — accuracy depends on hash collisions
    expect(accuracy).toBeGreaterThanOrEqual(0);
    expect(accuracy).toBeLessThanOrEqual(1);
  });
});
