import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  createTestProject,
  addClassifySamples,
  CLASSIFY_SAMPLES,
  EXTRACT_SAMPLES,
  addExtractSamples,
  type TestProject,
} from './helpers/test-project.js';
import { mockClusteredEmbed, mockEmbed } from './helpers/mock-embeddings.js';
import { trainClassifier } from '../src/core/classifier.js';
import { saveRetrievalModel } from '../src/core/retrieval.js';
import { loadSamples } from '../src/core/data.js';
import { exportCommand } from '../src/commands/export.js';

describe('export command', () => {
  let project: TestProject;
  let exportDir: string;

  afterEach(() => {
    project.cleanup();
    if (exportDir && fs.existsSync(exportDir)) {
      fs.rmSync(exportDir, { recursive: true, force: true });
    }
  });

  it('should export classifier model files and inference script', async () => {
    project = createTestProject('classify', 'export-classify');
    addClassifySamples(project.dir, CLASSIFY_SAMPLES);

    const samples = loadSamples(project.dir);
    const embeddings = samples.map((s) => mockClusteredEmbed(s.input, s.output));
    const labels = samples.map((s) => s.output);
    await trainClassifier(embeddings, labels, project.dir);

    exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'distill-export-'));

    // Mock process.cwd to be in the project dir
    const originalCwd = process.cwd();
    process.chdir(project.dir);
    try {
      await exportCommand(exportDir);
    } finally {
      process.chdir(originalCwd);
    }

    // Check files were copied
    expect(fs.existsSync(path.join(exportDir, 'model.json'))).toBe(true);
    expect(fs.existsSync(path.join(exportDir, 'metadata.json'))).toBe(true);
    expect(fs.existsSync(path.join(exportDir, 'inference.js'))).toBe(true);
    expect(fs.existsSync(path.join(exportDir, 'package.json'))).toBe(true);

    // Check inference script content
    const inferenceScript = fs.readFileSync(
      path.join(exportDir, 'inference.js'),
      'utf-8'
    );
    expect(inferenceScript).toContain('tensorflow');
    expect(inferenceScript).toContain('transformers');
    expect(inferenceScript).toContain('feature-extraction');

    // Check package.json
    const pkg = JSON.parse(
      fs.readFileSync(path.join(exportDir, 'package.json'), 'utf-8')
    );
    expect(pkg.dependencies).toHaveProperty('@tensorflow/tfjs-node');
    expect(pkg.dependencies).toHaveProperty('@xenova/transformers');
  });

  it('should export retrieval model files and inference script', async () => {
    project = createTestProject('extract', 'export-extract');
    addExtractSamples(project.dir, EXTRACT_SAMPLES);

    const samples = loadSamples(project.dir);
    const embeddings = samples.map((s) => mockEmbed(s.input));
    saveRetrievalModel(embeddings, samples, 'extract', project.dir);

    exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'distill-export-'));

    const originalCwd = process.cwd();
    process.chdir(project.dir);
    try {
      await exportCommand(exportDir);
    } finally {
      process.chdir(originalCwd);
    }

    expect(fs.existsSync(path.join(exportDir, 'retrieval_model.json'))).toBe(true);
    expect(fs.existsSync(path.join(exportDir, 'metadata.json'))).toBe(true);
    expect(fs.existsSync(path.join(exportDir, 'inference.js'))).toBe(true);

    const inferenceScript = fs.readFileSync(
      path.join(exportDir, 'inference.js'),
      'utf-8'
    );
    expect(inferenceScript).toContain('cosineSimilarity');
    expect(inferenceScript).toContain('retrieval_model.json');
  });
});
