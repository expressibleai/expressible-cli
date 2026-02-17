import fs from 'node:fs';
import path from 'node:path';
import inquirer from 'inquirer';
import { findTaskDir, getSamplesDir, ensureDir } from '../utils/paths.js';
import { readConfig } from '../core/config.js';
import { getNextSampleId, saveSample, loadSamples } from '../core/data.js';
import { success, error, info } from '../utils/display.js';

interface AddOptions {
  input?: string;
  output?: string;
  dir?: string;
}

export async function addCommand(options: AddOptions): Promise<void> {
  const taskDir = findTaskDir();
  const config = readConfig(taskDir);

  if (options.dir) {
    await bulkImport(taskDir, options.dir);
    return;
  }

  if (options.input && options.output) {
    await addFromFiles(taskDir, options.input, options.output);
    return;
  }

  await addInteractive(taskDir, config.type);
}

async function addInteractive(taskDir: string, taskType: string): Promise<void> {
  let addMore = true;

  while (addMore) {
    const samples = loadSamples(taskDir);
    info(`Current samples: ${samples.length}`);

    const inputPrompt = taskType === 'classify'
      ? 'Paste the input text (the text to classify):'
      : 'Paste the input text:';

    const outputPrompt = taskType === 'classify'
      ? 'What category/label should this be classified as?'
      : 'Paste the expected output:';

    const answers = await inquirer.prompt([
      {
        type: 'editor',
        name: 'input',
        message: inputPrompt,
      },
      {
        type: taskType === 'classify' ? 'input' : 'editor',
        name: 'output',
        message: outputPrompt,
      },
    ]);

    const input = answers.input.trim();
    const output = answers.output.trim();

    if (!input || !output) {
      error('Both input and output are required.');
      continue;
    }

    const id = getNextSampleId(taskDir);
    const isJson = taskType === 'extract';
    saveSample(taskDir, id, input, output, isJson);
    success(`Saved sample ${id}`);

    const continueAnswer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: 'Add another sample?',
        default: true,
      },
    ]);

    addMore = continueAnswer.continue;
  }
}

async function addFromFiles(
  taskDir: string,
  inputPath: string,
  outputPath: string
): Promise<void> {
  const resolvedInput = path.resolve(inputPath);
  const resolvedOutput = path.resolve(outputPath);

  if (!fs.existsSync(resolvedInput)) {
    error(`Input file not found: ${resolvedInput}`);
    process.exit(1);
  }
  if (!fs.existsSync(resolvedOutput)) {
    error(`Output file not found: ${resolvedOutput}`);
    process.exit(1);
  }

  const input = fs.readFileSync(resolvedInput, 'utf-8').trim();
  const output = fs.readFileSync(resolvedOutput, 'utf-8').trim();

  const id = getNextSampleId(taskDir);
  const isJson = resolvedOutput.endsWith('.json');
  saveSample(taskDir, id, input, output, isJson);
  success(`Saved sample ${id} from files`);
}

async function bulkImport(taskDir: string, dirPath: string): Promise<void> {
  const resolvedDir = path.resolve(dirPath);

  if (!fs.existsSync(resolvedDir)) {
    error(`Directory not found: ${resolvedDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(resolvedDir);
  const inputFiles = files.filter((f) => f.includes('.input.')).sort();

  if (inputFiles.length === 0) {
    error('No files matching *.input.* found in the directory.');
    info('Expected file naming: 001.input.txt / 001.output.txt');
    process.exit(1);
  }

  let imported = 0;

  for (const inputFile of inputFiles) {
    const baseName = inputFile.split('.input.')[0];
    const outputFile = files.find((f) => f.startsWith(baseName + '.output.'));

    if (!outputFile) {
      info(`Skipping ${inputFile} — no matching output file found.`);
      continue;
    }

    const input = fs.readFileSync(path.join(resolvedDir, inputFile), 'utf-8').trim();
    const output = fs.readFileSync(path.join(resolvedDir, outputFile), 'utf-8').trim();

    const id = getNextSampleId(taskDir);
    const isJson = outputFile.endsWith('.json');
    saveSample(taskDir, id, input, output, isJson);
    imported++;
  }

  success(`Imported ${imported} sample pair(s)`);
}
