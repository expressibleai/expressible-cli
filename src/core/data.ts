import fs from 'node:fs';
import path from 'node:path';
import { getSamplesDir, getValidationResultsPath } from '../utils/paths.js';

export interface SamplePair {
  id: string;
  input: string;
  output: string;
}

export interface ValidationResult {
  id: string;
  input: string;
  predictedOutput: string;
  approved: boolean;
  correctedOutput?: string;
  reviewedAt?: string;
}

export interface ValidationResults {
  items: ValidationResult[];
}

export function loadSamples(taskDir: string): SamplePair[] {
  const samplesDir = getSamplesDir(taskDir);
  if (!fs.existsSync(samplesDir)) {
    return [];
  }

  const files = fs.readdirSync(samplesDir);
  const inputFiles = files
    .filter((f) => f.includes('.input.'))
    .sort();

  const samples: SamplePair[] = [];

  for (const inputFile of inputFiles) {
    const id = inputFile.split('.input.')[0];
    const outputFile = files.find((f) => f.startsWith(id + '.output.'));

    if (!outputFile) {
      continue;
    }

    const input = fs.readFileSync(path.join(samplesDir, inputFile), 'utf-8').trim();
    const output = fs.readFileSync(path.join(samplesDir, outputFile), 'utf-8').trim();

    samples.push({ id, input, output });
  }

  return samples;
}

export function getNextSampleId(taskDir: string): string {
  const samplesDir = getSamplesDir(taskDir);
  if (!fs.existsSync(samplesDir)) {
    return '001';
  }

  const files = fs.readdirSync(samplesDir);
  const ids = files
    .filter((f) => f.includes('.input.'))
    .map((f) => parseInt(f.split('.input.')[0], 10))
    .filter((n) => !isNaN(n));

  if (ids.length === 0) return '001';

  const max = Math.max(...ids);
  return String(max + 1).padStart(3, '0');
}

export function saveSample(
  taskDir: string,
  id: string,
  input: string,
  output: string,
  isJson: boolean = false
): void {
  const samplesDir = getSamplesDir(taskDir);
  fs.mkdirSync(samplesDir, { recursive: true });

  const ext = isJson ? 'json' : 'txt';
  fs.writeFileSync(path.join(samplesDir, `${id}.input.${ext}`), input, 'utf-8');
  fs.writeFileSync(path.join(samplesDir, `${id}.output.${ext}`), output, 'utf-8');
}

export function loadValidationResults(taskDir: string): ValidationResults {
  const resultsPath = getValidationResultsPath(taskDir);
  if (!fs.existsSync(resultsPath)) {
    return { items: [] };
  }
  const raw = fs.readFileSync(resultsPath, 'utf-8');
  return JSON.parse(raw) as ValidationResults;
}

export function saveValidationResults(taskDir: string, results: ValidationResults): void {
  const resultsPath = getValidationResultsPath(taskDir);
  const dir = path.dirname(resultsPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2) + '\n', 'utf-8');
}

export function getUniqueOutputCategories(samples: SamplePair[]): string[] {
  const categories = new Set(samples.map((s) => s.output));
  return Array.from(categories).sort();
}
