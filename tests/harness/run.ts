#!/usr/bin/env npx tsx
/**
 * Test harness for distill — measures accuracy across multiple scenarios
 * using real embeddings and held-out test data.
 *
 * Usage: npx tsx tests/harness/run.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { embedTexts, embedText } from '../../src/core/embeddings.js';
import { trainClassifier, predict } from '../../src/core/classifier.js';
import { saveSample } from '../../src/core/data.js';

interface Sample {
  input: string;
  output: string;
}

interface ScenarioConfig {
  name: string;
  type: 'classify';
  dir: string;
}

interface ScenarioResult {
  name: string;
  type: string;
  trainCount: number;
  testCount: number;
  correct: number;
  total: number;
  accuracy: number;
  avgConfidence: number;
  failures: { input: string; expected: string; predicted: string; confidence: number }[];
}

const FIXTURES_DIR = path.join(import.meta.dirname, 'fixtures');

const SCENARIOS: ScenarioConfig[] = [
  // Synthetic scenarios
  { name: 'support-tickets', type: 'classify', dir: 'support-tickets' },
  { name: 'sentiment', type: 'classify', dir: 'sentiment' },
  { name: 'content-moderation', type: 'classify', dir: 'content-moderation' },
  { name: 'news-categorization', type: 'classify', dir: 'news-categorization' },
  // Public datasets
  { name: 'ag-news', type: 'classify', dir: 'ag-news' },
  { name: 'sst2-sentiment', type: 'classify', dir: 'sst2-sentiment' },
  { name: '20newsgroups', type: 'classify', dir: '20newsgroups' },
];

function createTempProject(name: string, type: string): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `harness-${name}-`));
  const config = { name, type, createdAt: new Date().toISOString() };
  fs.writeFileSync(path.join(tmpDir, 'distill.config.json'), JSON.stringify(config, null, 2));
  fs.mkdirSync(path.join(tmpDir, 'samples'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'model'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, '.distill'), { recursive: true });
  return tmpDir;
}

function writeTrainingSamples(taskDir: string, samples: Sample[]): void {
  for (let i = 0; i < samples.length; i++) {
    const id = String(i + 1).padStart(3, '0');
    saveSample(taskDir, id, samples[i].input, samples[i].output, false);
  }
}

async function runClassifyScenario(
  config: ScenarioConfig,
  trainData: Sample[],
  testData: Sample[]
): Promise<ScenarioResult> {
  const taskDir = createTempProject(config.name, config.type);

  try {
    writeTrainingSamples(taskDir, trainData);

    // Embed training data
    const trainTexts = trainData.map((s) => s.input);
    const trainLabels = trainData.map((s) => s.output);
    const trainEmbeddings = await embedTexts(trainTexts, taskDir);

    // Train classifier
    await trainClassifier(trainEmbeddings, trainLabels, taskDir);

    // Test
    let correct = 0;
    let totalConfidence = 0;
    const failures: ScenarioResult['failures'] = [];

    for (const test of testData) {
      const embedding = await embedText(test.input, taskDir);
      const result = await predict(embedding, taskDir);

      totalConfidence += result.confidence;

      if (result.category === test.output) {
        correct++;
      } else {
        failures.push({
          input: test.input.slice(0, 80),
          expected: test.output,
          predicted: result.category,
          confidence: Math.round(result.confidence * 1000) / 1000,
        });
      }
    }

    return {
      name: config.name,
      type: config.type,
      trainCount: trainData.length,
      testCount: testData.length,
      correct,
      total: testData.length,
      accuracy: correct / testData.length,
      avgConfidence: totalConfidence / testData.length,
      failures,
    };
  } finally {
    fs.rmSync(taskDir, { recursive: true, force: true });
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('  Distill Test Harness — Accuracy Benchmarks');
  console.log('='.repeat(70));
  console.log();

  const results: ScenarioResult[] = [];

  for (const scenario of SCENARIOS) {
    const fixtureDir = path.join(FIXTURES_DIR, scenario.dir);
    const trainPath = path.join(fixtureDir, 'train.json');
    const testPath = path.join(fixtureDir, 'test.json');

    if (!fs.existsSync(trainPath) || !fs.existsSync(testPath)) {
      console.log(`  SKIP  ${scenario.name} — missing fixture files`);
      continue;
    }

    const trainData: Sample[] = JSON.parse(fs.readFileSync(trainPath, 'utf-8'));
    const testData: Sample[] = JSON.parse(fs.readFileSync(testPath, 'utf-8'));

    console.log(`  RUN   ${scenario.name} (${scenario.type}) — ${trainData.length} train, ${testData.length} test`);

    const result = await runClassifyScenario(scenario, trainData, testData);
    results.push(result);

    const pct = (result.accuracy * 100).toFixed(1);
    const conf = (result.avgConfidence * 100).toFixed(1);
    const status = result.accuracy >= 0.8 ? 'PASS' : result.accuracy >= 0.6 ? 'WARN' : 'FAIL';
    console.log(`  ${status}  ${scenario.name}: ${pct}% accuracy, ${conf}% avg confidence (${result.correct}/${result.total})`);

    if (result.failures.length > 0 && result.failures.length <= 5) {
      for (const f of result.failures) {
        console.log(`        ✗ "${f.input}" → expected "${f.expected}", got "${f.predicted}" (${f.confidence})`);
      }
    } else if (result.failures.length > 5) {
      for (const f of result.failures.slice(0, 3)) {
        console.log(`        ✗ "${f.input}" → expected "${f.expected}", got "${f.predicted}" (${f.confidence})`);
      }
      console.log(`        ... and ${result.failures.length - 3} more failures`);
    }
    console.log();
  }

  // Summary table
  console.log('='.repeat(70));
  console.log('  SUMMARY');
  console.log('='.repeat(70));
  console.log();
  console.log(
    '  ' +
    'Scenario'.padEnd(25) +
    'Type'.padEnd(12) +
    'Train'.padEnd(8) +
    'Test'.padEnd(8) +
    'Accuracy'.padEnd(12) +
    'Avg Conf'
  );
  console.log('  ' + '-'.repeat(65));

  for (const r of results) {
    const pct = (r.accuracy * 100).toFixed(1) + '%';
    const conf = (r.avgConfidence * 100).toFixed(1) + '%';
    console.log(
      '  ' +
      r.name.padEnd(25) +
      r.type.padEnd(12) +
      String(r.trainCount).padEnd(8) +
      String(r.testCount).padEnd(8) +
      pct.padEnd(12) +
      conf
    );
  }

  console.log();

  // Overall stats
  const totalCorrect = results.reduce((sum, r) => sum + r.correct, 0);
  const totalTests = results.reduce((sum, r) => sum + r.total, 0);
  const overallAcc = ((totalCorrect / totalTests) * 100).toFixed(1);
  console.log(`  Overall: ${overallAcc}% (${totalCorrect}/${totalTests})`);

  console.log();

  // Exit code based on accuracy
  const classifyAvg = results.length > 0
    ? results.reduce((sum, r) => sum + r.accuracy, 0) / results.length
    : 0;

  if (classifyAvg < 0.7) {
    console.log('  ✗ Accuracy below 70% threshold');
    process.exit(1);
  } else {
    console.log('  ✓ Accuracy meets threshold');
  }
}

main().catch((err) => {
  console.error('Harness failed:', err);
  process.exit(1);
});
