import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  loadSamples,
  getNextSampleId,
  saveSample,
  getUniqueOutputCategories,
  loadValidationResults,
  saveValidationResults,
} from '../src/core/data.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'distill-test-'));
}

describe('data module', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    fs.mkdirSync(path.join(tempDir, 'samples'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'validation'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('loadSamples', () => {
    it('should return empty array when no samples exist', () => {
      const samples = loadSamples(tempDir);
      expect(samples).toEqual([]);
    });

    it('should load sample pairs', () => {
      fs.writeFileSync(path.join(tempDir, 'samples', '001.input.txt'), 'hello');
      fs.writeFileSync(path.join(tempDir, 'samples', '001.output.txt'), 'greeting');
      fs.writeFileSync(path.join(tempDir, 'samples', '002.input.txt'), 'bye');
      fs.writeFileSync(path.join(tempDir, 'samples', '002.output.txt'), 'farewell');

      const samples = loadSamples(tempDir);
      expect(samples).toHaveLength(2);
      expect(samples[0]).toEqual({ id: '001', input: 'hello', output: 'greeting' });
      expect(samples[1]).toEqual({ id: '002', input: 'bye', output: 'farewell' });
    });

    it('should skip inputs without matching outputs', () => {
      fs.writeFileSync(path.join(tempDir, 'samples', '001.input.txt'), 'hello');
      // No output file for 001

      const samples = loadSamples(tempDir);
      expect(samples).toHaveLength(0);
    });
  });

  describe('getNextSampleId', () => {
    it('should return 001 for empty samples dir', () => {
      expect(getNextSampleId(tempDir)).toBe('001');
    });

    it('should return next sequential ID', () => {
      fs.writeFileSync(path.join(tempDir, 'samples', '001.input.txt'), '');
      fs.writeFileSync(path.join(tempDir, 'samples', '003.input.txt'), '');

      expect(getNextSampleId(tempDir)).toBe('004');
    });
  });

  describe('saveSample', () => {
    it('should save txt sample pair', () => {
      saveSample(tempDir, '001', 'input text', 'output text', false);

      expect(fs.readFileSync(path.join(tempDir, 'samples', '001.input.txt'), 'utf-8')).toBe('input text');
      expect(fs.readFileSync(path.join(tempDir, 'samples', '001.output.txt'), 'utf-8')).toBe('output text');
    });

    it('should save json sample pair', () => {
      saveSample(tempDir, '001', '{"key": "value"}', '{"result": true}', true);

      expect(fs.existsSync(path.join(tempDir, 'samples', '001.input.json'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'samples', '001.output.json'))).toBe(true);
    });
  });

  describe('getUniqueOutputCategories', () => {
    it('should return sorted unique categories', () => {
      const samples = [
        { id: '1', input: 'a', output: 'cat' },
        { id: '2', input: 'b', output: 'dog' },
        { id: '3', input: 'c', output: 'cat' },
        { id: '4', input: 'd', output: 'bird' },
      ];
      expect(getUniqueOutputCategories(samples)).toEqual(['bird', 'cat', 'dog']);
    });
  });

  describe('validation results', () => {
    it('should save and load validation results', () => {
      const results = {
        items: [
          {
            id: '001',
            input: 'test',
            predictedOutput: 'result',
            approved: true,
            reviewedAt: '2024-01-01',
          },
        ],
      };

      saveValidationResults(tempDir, results);
      const loaded = loadValidationResults(tempDir);
      expect(loaded.items).toHaveLength(1);
      expect(loaded.items[0].approved).toBe(true);
    });

    it('should return empty results when file does not exist', () => {
      const results = loadValidationResults(tempDir);
      expect(results.items).toEqual([]);
    });
  });
});
