import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import inquirer from 'inquirer';
import { findTaskDir, getSamplesDir, ensureDir } from '../utils/paths.js';
import { getNextSampleId, saveSample, loadSamples } from '../core/data.js';
import { success, error, info } from '../utils/display.js';

interface AddOptions {
  input?: string;
  output?: string;
  dir?: string;
}

export async function addCommand(options: AddOptions): Promise<void> {
  const taskDir = findTaskDir();

  if (options.dir) {
    await bulkImport(taskDir, options.dir);
    return;
  }

  if (options.input && options.output) {
    await addFromFiles(taskDir, options.input, options.output);
    return;
  }

  await addInteractive(taskDir);
}

function readMultilineInput(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    const lines: string[] = [];
    rl.on('line', (line) => {
      if (line === '' && lines.length > 0) {
        rl.close();
        resolve(lines.join('\n'));
      } else if (line === '' && lines.length === 0) {
        rl.close();
        resolve('');
      } else {
        lines.push(line);
      }
    });

    rl.on('close', () => {
      resolve(lines.join('\n'));
    });
  });
}

async function addInteractive(taskDir: string): Promise<void> {
  while (true) {
    const samples = loadSamples(taskDir);
    info(`Current samples: ${samples.length}`);

    const input = (await readMultilineInput('? Paste input text (blank line to end, empty to quit):\n')).trim();

    if (!input) {
      break;
    }

    const { output: rawOutput } = await inquirer.prompt([
      { type: 'input', name: 'output', message: 'Label:' },
    ]);
    const output = rawOutput.trim();

    if (!output) {
      error('Output is required. Skipping this sample.');
      continue;
    }

    const id = getNextSampleId(taskDir);
    saveSample(taskDir, id, input, output, false);
    success(`Saved sample ${id}`);
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
