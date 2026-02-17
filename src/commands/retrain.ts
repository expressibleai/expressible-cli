import fs from 'node:fs';
import path from 'node:path';
import { findTaskDir, getModelDir, getModelMetadataPath, ensureDir } from '../utils/paths.js';
import { readConfig } from '../core/config.js';
import { loadSamples, loadValidationResults, getUniqueOutputCategories } from '../core/data.js';
import { embedTexts } from '../core/embeddings.js';
import { trainClassifier } from '../core/classifier.js';
import { saveRetrievalModel, evaluateRetrievalAccuracy } from '../core/retrieval.js';
import { success, error, warn, info, heading, table } from '../utils/display.js';
import type { SamplePair } from '../core/data.js';

export async function retrainCommand(): Promise<void> {
  const taskDir = findTaskDir();
  const config = readConfig(taskDir);

  // Load previous accuracy
  const metadataPath = getModelMetadataPath(taskDir);
  let previousAccuracy: number | null = null;
  if (fs.existsSync(metadataPath)) {
    const prevMeta = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    previousAccuracy = prevMeta.accuracy ?? null;
  }

  // Archive current model
  const modelDir = getModelDir(taskDir);
  if (fs.existsSync(metadataPath)) {
    const archiveDir = path.join(modelDir, 'archive', new Date().toISOString().replace(/[:.]/g, '-'));
    ensureDir(archiveDir);
    const modelFiles = fs.readdirSync(modelDir).filter((f) => !f.startsWith('archive'));
    for (const file of modelFiles) {
      const src = path.join(modelDir, file);
      if (fs.statSync(src).isFile()) {
        fs.copyFileSync(src, path.join(archiveDir, file));
      }
    }
    info('Previous model archived.');
  }

  // Build training set from samples + validation results
  const originalSamples = loadSamples(taskDir);
  const validation = loadValidationResults(taskDir);

  const trainingSamples: SamplePair[] = [...originalSamples];

  // Add validated items
  let addedFromReview = 0;
  let excludedFromReview = 0;

  for (const item of validation.items) {
    if (!item.reviewedAt) continue;

    if (item.approved) {
      // Thumbs up: add prediction as training data (if not already in samples)
      const exists = trainingSamples.some(
        (s) => s.input.trim() === item.input.trim() && s.output.trim() === item.predictedOutput.trim()
      );
      if (!exists) {
        trainingSamples.push({
          id: `review-${item.id}`,
          input: item.input,
          output: item.predictedOutput,
        });
        addedFromReview++;
      }
    } else if (item.correctedOutput) {
      // Thumbs down with correction: add corrected version
      const exists = trainingSamples.some(
        (s) => s.input.trim() === item.input.trim() && s.output.trim() === item.correctedOutput!.trim()
      );
      if (!exists) {
        trainingSamples.push({
          id: `corrected-${item.id}`,
          input: item.input,
          output: item.correctedOutput,
        });
        addedFromReview++;
      }
    } else {
      // Thumbs down without correction: exclude
      excludedFromReview++;
    }
  }

  info(`Training set: ${originalSamples.length} original + ${addedFromReview} from review`);
  if (excludedFromReview > 0) {
    info(`${excludedFromReview} rejected items excluded (no correction provided)`);
  }

  const minSamples = config.type === 'classify' ? 10 : 20;
  if (trainingSamples.length < minSamples) {
    error(
      `Not enough training samples (${trainingSamples.length}). ${config.type} tasks require at least ${minSamples}.`
    );
    process.exit(1);
  }

  heading(`Retraining ${config.type} model "${config.name}"`);

  const startTime = Date.now();

  const inputs = trainingSamples.map((s) => s.input);
  const embeddings = await embedTexts(inputs, taskDir);

  let newAccuracy: number;

  if (config.type === 'classify') {
    const labels = trainingSamples.map((s) => s.output);
    const result = await trainClassifier(embeddings, labels, taskDir);
    newAccuracy = result.valAccuracy;
  } else {
    saveRetrievalModel(embeddings, trainingSamples, config.type, taskDir);
    newAccuracy = evaluateRetrievalAccuracy(embeddings, trainingSamples);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  heading('Retraining Complete');

  const rows: [string, string][] = [
    ['Training samples', String(trainingSamples.length)],
    ['Time elapsed', `${elapsed}s`],
  ];

  if (previousAccuracy !== null) {
    const prevPct = (previousAccuracy * 100).toFixed(1);
    const newPct = (newAccuracy * 100).toFixed(1);
    const diff = ((newAccuracy - previousAccuracy) * 100).toFixed(1);
    const direction = newAccuracy > previousAccuracy ? 'improved' : newAccuracy < previousAccuracy ? 'decreased' : 'unchanged';
    rows.push(['Previous accuracy', `${prevPct}%`]);
    rows.push(['New accuracy', `${newPct}%`]);
    rows.push(['Change', `${direction} by ${Math.abs(parseFloat(diff))}%`]);
  } else {
    rows.push(['Accuracy', `${(newAccuracy * 100).toFixed(1)}%`]);
  }

  table(rows);

  if (newAccuracy < 0.6) {
    warn(
      `Model accuracy is low (${(newAccuracy * 100).toFixed(0)}%). Consider adding more diverse training examples.`
    );
  }

  success('New model saved to model/');
}
