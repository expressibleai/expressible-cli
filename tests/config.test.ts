import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { readConfig, writeConfig, type DistillConfig } from '../src/core/config.js';

describe('config module', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'distill-config-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should write and read config', () => {
    const config: DistillConfig = {
      name: 'test-task',
      type: 'classify',
      description: 'A test task',
      createdAt: '2024-01-01T00:00:00.000Z',
      version: '1.0.0',
    };

    writeConfig(tempDir, config);
    const loaded = readConfig(tempDir);

    expect(loaded.name).toBe('test-task');
    expect(loaded.type).toBe('classify');
    expect(loaded.description).toBe('A test task');
  });

  it('should throw when config does not exist', () => {
    expect(() => readConfig(tempDir)).toThrow('No distill.config.json found');
  });
});
