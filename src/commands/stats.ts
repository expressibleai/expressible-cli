import fs from 'node:fs';
import { findTaskDir, getModelDir, getModelMetadataPath } from '../utils/paths.js';
import { readConfig } from '../core/config.js';
import { loadSamples, loadValidationResults } from '../core/data.js';
import { heading, table, warn, info } from '../utils/display.js';
import { getDirectorySize, formatBytes } from '../utils/fs.js';

export async function statsCommand(): Promise<void> {
  const taskDir = findTaskDir();
  const config = readConfig(taskDir);
  const samples = loadSamples(taskDir);
  const validation = loadValidationResults(taskDir);

  heading(`Distill Project: ${config.name}`);

  const rows: [string, string][] = [
    ['Task type', config.type],
    ['Training samples', String(samples.length)],
  ];

  // Model info
  const metadataPath = getModelMetadataPath(taskDir);
  if (fs.existsSync(metadataPath)) {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    const trainedAt = new Date(metadata.trainedAt).toLocaleString();
    rows.push(['Last trained', trainedAt]);

    if (metadata.accuracy !== undefined) {
      rows.push(['Model accuracy', `${(metadata.accuracy * 100).toFixed(1)}%`]);
    }

    if (metadata.categories) {
      rows.push(['Categories', metadata.categories.join(', ')]);
    }

    const modelSize = getDirectorySize(getModelDir(taskDir));
    rows.push(['Model size', formatBytes(modelSize)]);
  } else {
    rows.push(['Model', 'Not trained yet']);
  }

  // Validation info
  if (validation.items.length > 0) {
    const reviewed = validation.items.filter((i) => i.reviewedAt).length;
    const approved = validation.items.filter((i) => i.reviewedAt && i.approved === true).length;
    const approvalRate = reviewed > 0 ? ((approved / reviewed) * 100).toFixed(1) : 'N/A';

    rows.push(['Reviewed items', String(reviewed)]);
    rows.push(['Approval rate', `${approvalRate}%`]);
  } else {
    rows.push(['Reviewed items', '0']);
  }

  if (config.description) {
    rows.push(['Description', config.description]);
  }

  table(rows);
  console.log();
}
