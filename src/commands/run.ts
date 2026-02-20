import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { findTaskDir } from '../utils/paths.js';
import { embedText } from '../core/embeddings.js';
import { predict } from '../core/classifier.js';
import { error } from '../utils/display.js';

interface RunResult {
  input: string;
  output: string;
  confidence: number;
}

async function runSingle(input: string, taskDir: string): Promise<RunResult> {
  const embedding = await embedText(input, taskDir);
  const result = await predict(embedding, taskDir);
  return {
    input,
    output: result.category,
    confidence: Math.round(result.confidence * 100) / 100,
  };
}

export async function runCommand(inputArg?: string): Promise<void> {
  const taskDir = findTaskDir();

  const inputs: string[] = [];

  if (inputArg) {
    // Check if it's a file path first, then try glob patterns, otherwise treat as text
    if (fs.existsSync(inputArg)) {
      const stat = fs.statSync(inputArg);
      if (stat.isFile()) {
        const content = fs.readFileSync(path.resolve(inputArg), 'utf-8').trim();
        inputs.push(content);
      } else if (stat.isDirectory()) {
        error(`"${inputArg}" is a directory. Provide a file path or text input.`);
        process.exit(1);
      }
    } else if (/[*?{}\[\]]/.test(inputArg)) {
      // Only try glob expansion if the input contains glob metacharacters
      const matches = await glob(inputArg);
      if (matches.length > 0) {
        for (const match of matches) {
          const content = fs.readFileSync(path.resolve(match), 'utf-8').trim();
          inputs.push(content);
        }
      } else {
        error(`Glob pattern "${inputArg}" matched no files.`);
        process.exit(1);
      }
    } else {
      // Treat as raw text input
      inputs.push(inputArg);
    }
  } else {
    // Read from stdin
    const chunks: Buffer[] = [];
    const stdin = process.stdin;
    if (stdin.isTTY) {
      error('No input provided. Use: expressible distill run <file> or echo "text" | expressible distill run');
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
    const result = await runSingle(input, taskDir);
    results.push(result);
  }

  if (results.length === 1) {
    console.log(JSON.stringify(results[0], null, 2));
  } else {
    console.log(JSON.stringify(results, null, 2));
  }
}
