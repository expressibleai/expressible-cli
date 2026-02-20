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

  if (result.valAccuracy < 0.6) {
    warn(
      `Model accuracy is low (${(result.valAccuracy * 100).toFixed(0)}%). Consider adding more diverse training examples.`
    );
  }

  success('Model saved to model/');
}
