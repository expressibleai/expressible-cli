import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  createTestProject,
  addClassifySamples,
  type TestProject,
} from './helpers/test-project.js';
import { readConfig } from '../src/core/config.js';
import { loadSamples, getNextSampleId, saveSample, loadValidationResults } from '../src/core/data.js';
import { findTaskDir } from '../src/utils/paths.js';
import { predict } from '../src/core/classifier.js';
import { mockEmbed } from './helpers/mock-embeddings.js';

describe('error handling: config', () => {
  it('should throw readable error when no config exists', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'distill-noconfig-'));
    try {
      expect(() => readConfig(tmpDir)).toThrow('No distill.config.json found');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should throw when findTaskDir is called outside a project', () => {
    const originalCwd = process.cwd();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'distill-noproj-'));
    try {
      process.chdir(tmpDir);
      expect(() => findTaskDir()).toThrow('Not inside a distill project');
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('error handling: model not trained', () => {
  let project: TestProject;

  beforeEach(() => {
    project = createTestProject('classify');
  });

  afterEach(() => {
    project.cleanup();
  });

  it('should throw when predicting with no trained classifier model', async () => {
    const embedding = mockEmbed('test input');
    await expect(predict(embedding, project.dir)).rejects.toThrow(
      'No trained model found'
    );
  });
});

describe('edge cases: samples', () => {
  let project: TestProject;

  beforeEach(() => {
    project = createTestProject('classify');
  });

  afterEach(() => {
    project.cleanup();
  });

  it('should return empty array when samples dir is empty', () => {
    const samples = loadSamples(project.dir);
    expect(samples).toEqual([]);
  });

  it('should skip orphaned input files with no matching output', () => {
    fs.writeFileSync(
      path.join(project.dir, 'samples', '001.input.txt'),
      'orphan input'
    );
    // No 001.output.txt

    const samples = loadSamples(project.dir);
    expect(samples).toHaveLength(0);
  });

  it('should handle non-sequential sample IDs', () => {
    saveSample(project.dir, '001', 'first', 'a', false);
    saveSample(project.dir, '005', 'second', 'b', false);
    saveSample(project.dir, '010', 'third', 'c', false);

    const samples = loadSamples(project.dir);
    expect(samples).toHaveLength(3);
    expect(samples[0].id).toBe('001');
    expect(samples[1].id).toBe('005');
    expect(samples[2].id).toBe('010');
  });

  it('should generate next ID after highest existing', () => {
    saveSample(project.dir, '001', 'a', 'x', false);
    saveSample(project.dir, '005', 'b', 'y', false);

    const nextId = getNextSampleId(project.dir);
    expect(nextId).toBe('006');
  });

  it('should handle whitespace-only input gracefully', () => {
    saveSample(project.dir, '001', '   ', 'category', false);
    const samples = loadSamples(project.dir);
    // Trimmed to empty string
    expect(samples[0].input).toBe('');
  });

  it('should handle unicode text', () => {
    saveSample(project.dir, '001', 'Ceci est un texte en fran\u00e7ais', 'french', false);
    saveSample(project.dir, '002', '\u3053\u308c\u306f\u65e5\u672c\u8a9e\u306e\u30c6\u30ad\u30b9\u30c8\u3067\u3059', 'japanese', false);
    saveSample(project.dir, '003', '\u042d\u0442\u043e \u0440\u0443\u0441\u0441\u043a\u0438\u0439 \u0442\u0435\u043a\u0441\u0442', 'russian', false);

    const samples = loadSamples(project.dir);
    expect(samples).toHaveLength(3);
    expect(samples[0].input).toContain('fran\u00e7ais');
    expect(samples[1].input).toContain('\u65e5\u672c\u8a9e');
    expect(samples[2].input).toContain('\u0440\u0443\u0441\u0441\u043a\u0438\u0439');
  });

  it('should handle very long input text', () => {
    const longText = 'word '.repeat(10000).trim();
    saveSample(project.dir, '001', longText, 'long', false);

    const samples = loadSamples(project.dir);
    expect(samples[0].input).toBe(longText);
  });
});

describe('edge cases: validation results', () => {
  let project: TestProject;

  beforeEach(() => {
    project = createTestProject('classify');
  });

  afterEach(() => {
    project.cleanup();
  });

  it('should return empty items when no validation file exists', () => {
    const results = loadValidationResults(project.dir);
    expect(results.items).toEqual([]);
  });
});

describe('edge cases: overwriting models', () => {
  let project: TestProject;

  beforeEach(() => {
    project = createTestProject('classify');
    addClassifySamples(project.dir, [
      { input: 'good stuff', output: 'positive' },
      { input: 'great work', output: 'positive' },
      { input: 'nice job', output: 'positive' },
      { input: 'love it', output: 'positive' },
      { input: 'wonderful', output: 'positive' },
      { input: 'bad stuff', output: 'negative' },
      { input: 'terrible work', output: 'negative' },
      { input: 'awful job', output: 'negative' },
      { input: 'hate it', output: 'negative' },
      { input: 'horrible', output: 'negative' },
    ]);
  });

  afterEach(() => {
    project.cleanup();
  });

  it('should overwrite model cleanly when training twice', async () => {
    const { mockClusteredEmbed } = await import('./helpers/mock-embeddings.js');
    const { trainClassifier } = await import('../src/core/classifier.js');

    const samples = loadSamples(project.dir);
    const embeddings = samples.map((s) => mockClusteredEmbed(s.input, s.output));
    const labels = samples.map((s) => s.output);

    // Train first time
    const result1 = await trainClassifier(embeddings, labels, project.dir);
    const meta1 = JSON.parse(
      fs.readFileSync(path.join(project.dir, 'model', 'metadata.json'), 'utf-8')
    );

    // Train second time
    const result2 = await trainClassifier(embeddings, labels, project.dir);
    const meta2 = JSON.parse(
      fs.readFileSync(path.join(project.dir, 'model', 'metadata.json'), 'utf-8')
    );

    // Both should succeed, second should have a later timestamp
    expect(result1.numSamples).toBe(10);
    expect(result2.numSamples).toBe(10);
    expect(new Date(meta2.trainedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(meta1.trainedAt).getTime()
    );
  });
});
