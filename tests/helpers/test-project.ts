import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { writeConfig, type DistillConfig, type TaskType } from '../../src/core/config.js';
import { saveSample } from '../../src/core/data.js';
import { ensureDir } from '../../src/utils/paths.js';

export interface TestProject {
  dir: string;
  cleanup: () => void;
}

export function createTestProject(
  taskType: TaskType,
  name: string = 'test-project'
): TestProject {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `distill-test-${name}-`));

  ensureDir(path.join(dir, 'samples'));
  ensureDir(path.join(dir, 'model'));
  ensureDir(path.join(dir, 'validation'));
  ensureDir(path.join(dir, '.distill'));

  const config: DistillConfig = {
    name,
    type: taskType,
    description: `Test ${taskType} project`,
    createdAt: new Date().toISOString(),
    version: '1.0.0',
  };

  writeConfig(dir, config);

  return {
    dir,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

export function addClassifySamples(
  dir: string,
  samples: { input: string; output: string }[]
): void {
  for (let i = 0; i < samples.length; i++) {
    const id = String(i + 1).padStart(3, '0');
    saveSample(dir, id, samples[i].input, samples[i].output, false);
  }
}

export function addExtractSamples(
  dir: string,
  samples: { input: string; output: string }[]
): void {
  for (let i = 0; i < samples.length; i++) {
    const id = String(i + 1).padStart(3, '0');
    saveSample(dir, id, samples[i].input, samples[i].output, true);
  }
}

export const CLASSIFY_SAMPLES = [
  { input: 'I love this product', output: 'positive' },
  { input: 'Amazing experience', output: 'positive' },
  { input: 'Best thing ever', output: 'positive' },
  { input: 'Wonderful and delightful', output: 'positive' },
  { input: 'Great quality', output: 'positive' },
  { input: 'Terrible product', output: 'negative' },
  { input: 'Worst purchase ever', output: 'negative' },
  { input: 'Completely broken', output: 'negative' },
  { input: 'Awful experience', output: 'negative' },
  { input: 'Total waste of money', output: 'negative' },
  { input: 'It works as described', output: 'neutral' },
  { input: 'Average quality nothing special', output: 'neutral' },
];

export const EXTRACT_SAMPLES = Array.from({ length: 20 }, (_, i) => ({
  input: `Customer order #${1000 + i}: bought ${i % 2 === 0 ? 'laptop' : 'phone'} on ${i % 3 === 0 ? 'Monday' : 'Friday'}`,
  output: JSON.stringify({
    orderId: 1000 + i,
    product: i % 2 === 0 ? 'laptop' : 'phone',
    day: i % 3 === 0 ? 'Monday' : 'Friday',
  }),
}));

export const TRANSFORM_SAMPLES = Array.from({ length: 20 }, (_, i) => ({
  input: `Dear Sir/Madam, I am writing regarding order #${1000 + i}. The item arrived damaged. Please advise.`,
  output: `Thank you for contacting us about order #${1000 + i}. We apologize for the damaged item. A replacement will be shipped within 2 business days.`,
}));
