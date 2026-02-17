import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { findTaskDir } from '../utils/paths.js';
import { readConfig } from '../core/config.js';
import { embedText } from '../core/embeddings.js';
import { predict } from '../core/classifier.js';
import { retrievalPredict } from '../core/retrieval.js';
import { error } from '../utils/display.js';

interface RunResult {
  input: string;
  output: string;
  confidence: number;
}

async function runSingle(input: string, taskDir: string, taskType: string): Promise<RunResult> {
  const embedding = await embedText(input, taskDir);

  if (taskType === 'classify') {
    const result = await predict(embedding, taskDir);
    return {
      input,
      output: result.category,
      confidence: Math.round(result.confidence * 100) / 100,
    };
  } else {
    const result = retrievalPredict(embedding, taskDir);
    return {
      input,
      output: result.output,
      confidence: Math.round(result.confidence * 100) / 100,
    };
  }
}

export async function runCommand(inputArg?: string): Promise<void> {
  const taskDir = findTaskDir();
  const config = readConfig(taskDir);

  const inputs: string[] = [];

  if (inputArg) {
    // Check if it's a glob pattern or file
    const matches = await glob(inputArg);
    if (matches.length > 0) {
      for (const match of matches) {
        const content = fs.readFileSync(path.resolve(match), 'utf-8').trim();
        inputs.push(content);
      }
    } else if (fs.existsSync(inputArg)) {
      const content = fs.readFileSync(path.resolve(inputArg), 'utf-8').trim();
      inputs.push(content);
    } else {
      // Treat as raw text input
      inputs.push(inputArg);
    }
  } else {
    // Read from stdin
    const chunks: Buffer[] = [];
    const stdin = process.stdin;
    if (stdin.isTTY) {
      error('No input provided. Use: distill run <file> or echo "text" | distill run');
      process.exit(1);
    }

    await new Promise<void>((resolve) => {
      stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
      stdin.on('end', () => resolve());
    });
    const stdinText = Buffer.concat(chunks).toString('utf-8').trim();
    if (!stdinText) {
      error('No input received from stdin.');
      process.exit(1);
    }
    inputs.push(stdinText);
  }

  const results: RunResult[] = [];
  for (const input of inputs) {
    const result = await runSingle(input, taskDir, config.type);
    results.push(result);
  }

  if (results.length === 1) {
    console.log(JSON.stringify(results[0], null, 2));
  } else {
    console.log(JSON.stringify(results, null, 2));
  }
}
