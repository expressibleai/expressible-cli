import { findTaskDir } from '../utils/paths.js';
import { loadSamples, loadValidationResults, saveValidationResults } from '../core/data.js';
import { embedText } from '../core/embeddings.js';
import { predict } from '../core/classifier.js';
import { success, error, info, heading } from '../utils/display.js';
import type { ValidationResult, ValidationResults } from '../core/data.js';

export async function reviewCommand(): Promise<void> {
  const taskDir = findTaskDir();
  const samples = loadSamples(taskDir);

  if (samples.length === 0) {
    error('No samples found. Add training data first with: expressible distill add');
    process.exit(1);
  }

  // Generate predictions for all samples
  info('Generating predictions for review...');

  const existingResults = loadValidationResults(taskDir);
  const existingIds = new Set(existingResults.items.map((i) => i.id));

  const newItems: ValidationResult[] = [];

  for (const sample of samples) {
    if (existingIds.has(sample.id)) continue;

    const embedding = await embedText(sample.input, taskDir);
    let predictedOutput: string;

    try {
      const result = await predict(embedding, taskDir);
      predictedOutput = result.category;
    } catch {
      predictedOutput = '(no model trained — showing expected output)';
    }

    newItems.push({
      id: sample.id,
      input: sample.input,
      predictedOutput,
      approved: false,
    });
  }

  const allItems = [...existingResults.items, ...newItems];
  const results: ValidationResults = { items: allItems };
  saveValidationResults(taskDir, results);

  // Start Express server
  const { startReviewServer } = await import('../ui/server.js');
  await startReviewServer(taskDir, results);
}
