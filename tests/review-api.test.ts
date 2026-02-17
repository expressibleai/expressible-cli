import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  createTestProject,
  addClassifySamples,
  CLASSIFY_SAMPLES,
  type TestProject,
} from './helpers/test-project.js';
import {
  saveValidationResults,
  loadValidationResults,
  type ValidationResults,
} from '../src/core/data.js';

describe('review: validation results read/write', () => {
  let project: TestProject;

  beforeEach(() => {
    project = createTestProject('classify');
    addClassifySamples(project.dir, CLASSIFY_SAMPLES);
  });

  afterEach(() => {
    project.cleanup();
  });

  it('should save and load validation results', () => {
    const results: ValidationResults = {
      items: [
        {
          id: '001',
          input: 'I love this product',
          predictedOutput: 'positive',
          approved: true,
          reviewedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: '002',
          input: 'Terrible product',
          predictedOutput: 'positive',
          approved: false,
          correctedOutput: 'negative',
          reviewedAt: '2024-01-01T00:00:01.000Z',
        },
        {
          id: '003',
          input: 'Average quality',
          predictedOutput: 'neutral',
          approved: false,
          // No correction provided
        },
      ],
    };

    saveValidationResults(project.dir, results);
    const loaded = loadValidationResults(project.dir);

    expect(loaded.items).toHaveLength(3);

    // Approved item
    expect(loaded.items[0].approved).toBe(true);
    expect(loaded.items[0].reviewedAt).toBeDefined();

    // Rejected with correction
    expect(loaded.items[1].approved).toBe(false);
    expect(loaded.items[1].correctedOutput).toBe('negative');

    // Rejected without correction
    expect(loaded.items[2].approved).toBe(false);
    expect(loaded.items[2].correctedOutput).toBeUndefined();
  });

  it('should compute correct stats from validation results', () => {
    const results: ValidationResults = {
      items: [
        { id: '001', input: 'a', predictedOutput: 'pos', approved: true, reviewedAt: '2024-01-01' },
        { id: '002', input: 'b', predictedOutput: 'neg', approved: true, reviewedAt: '2024-01-01' },
        { id: '003', input: 'c', predictedOutput: 'pos', approved: false, reviewedAt: '2024-01-01' },
        { id: '004', input: 'd', predictedOutput: 'neu', approved: false },
      ],
    };

    const total = results.items.length;
    const reviewed = results.items.filter((i) => i.reviewedAt).length;
    const approved = results.items.filter((i) => i.approved === true).length;
    const rejected = results.items.filter((i) => i.reviewedAt && i.approved === false).length;

    expect(total).toBe(4);
    expect(reviewed).toBe(3);
    expect(approved).toBe(2);
    expect(rejected).toBe(1);
    expect((approved / reviewed) * 100).toBeCloseTo(66.7, 0);
  });
});

describe('review: static HTML file exists', () => {
  it('should have index.html in the ui/static directory', () => {
    const htmlPath = path.join(
      process.cwd(),
      'src',
      'ui',
      'static',
      'index.html'
    );
    expect(fs.existsSync(htmlPath)).toBe(true);

    const content = fs.readFileSync(htmlPath, 'utf-8');
    // Check essential elements exist in the HTML
    expect(content).toContain('distill');
    expect(content).toContain('/api/items');
    expect(content).toContain('/api/score');
    expect(content).toContain('/api/stats');
    expect(content).toContain('ArrowRight');
    expect(content).toContain('ArrowLeft');
    expect(content).toContain('btn-approve');
    expect(content).toContain('btn-reject');
  });
});
