import { findTaskDir } from '../utils/paths.js';
import { readConfig } from '../core/config.js';
import { loadSamples, getUniqueOutputCategories } from '../core/data.js';
import { embedTexts } from '../core/embeddings.js';
import { trainClassifier } from '../core/classifier.js';
import { success, error, warn, info, heading, table } from '../utils/display.js';

export async function trainCommand(): Promise<void> {
  const taskDir = findTaskDir();
  const config = readConfig(taskDir);
  const samples = loadSamples(taskDir);

  // Check minimum samples
  if (samples.length < 10) {
    error(
      `Not enough training samples. You have ${samples.length}, but at least 10 are required.`
    );
    info(`Add more samples with: expressible distill add`);
    process.exit(1);
  }

  heading(`Training model "${config.name}"`);
  info(`${samples.length} training samples loaded`);

  const startTime = Date.now();

  // Embed all inputs
  info('Generating embeddings for training data...');
  const inputs = samples.map((s) => s.input);
  const embeddings = await embedTexts(inputs, taskDir);
  info(`Embedded ${embeddings.length} samples`);

  const categories = getUniqueOutputCategories(samples);
  info(`Categories found: ${categories.join(', ')}`);

  // Warn about categories with few samples before training
  const categoryCounts = new Map<string, number>();
  for (const s of samples) {
    categoryCounts.set(s.output, (categoryCounts.get(s.output) || 0) + 1);
  }
  for (const [cat, count] of categoryCounts) {
    if (count < 5) {
      warn(`Category "${cat}" has only ${count} sample(s). Aim for at least 10 per category.`);
    }
  }

  const labels = samples.map((s) => s.output);
  const result = await trainClassifier(embeddings, labels, taskDir);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  heading('Training Complete');
  table([
    ['Samples', String(result.numSamples)],
    ['Categories', result.categories.join(', ')],
    ['Training accuracy', `${(result.accuracy * 100).toFixed(1)}%`],
    ['Validation accuracy', `${(result.valAccuracy * 100).toFixed(1)}%`],
    ['Epochs', String(result.epochs)],
    ['Time elapsed', `${elapsed}s`],
  ]);

  // Contextual post-training warnings
  const valFraction = result.numSamples < 30 ? 0.1 : 0.2;
  const valSamples = Math.max(1, Math.floor(result.numSamples * valFraction));
  if (valSamples < 5) {
    warn(
      `Validation set is very small (${valSamples} sample(s)). Accuracy estimate may be unreliable. Add more training data.`
    );
  } else if (result.accuracy > 0.9 && result.valAccuracy < 0.5) {
    warn(
      `High training accuracy (${(result.accuracy * 100).toFixed(0)}%) but low validation accuracy (${(result.valAccuracy * 100).toFixed(0)}%) suggests overfitting. Add more samples, especially for underrepresented categories.`
    );
  } else if (result.valAccuracy < 0.6) {
    warn(
      `Validation accuracy is low (${(result.valAccuracy * 100).toFixed(0)}%). Consider adding more diverse training examples.`
    );
  }

  success('Model saved to model/');
}
