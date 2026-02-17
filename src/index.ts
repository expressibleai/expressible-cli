#!/usr/bin/env node

import { Command } from 'commander';
import { error } from './utils/display.js';

const program = new Command();

program
  .name('distill')
  .description('Train small, local ML models from input/output example pairs')
  .version('0.1.0');

program
  .command('init <task-name>')
  .description('Create a new distill project')
  .action(async (taskName: string) => {
    try {
      const { initCommand } = await import('./commands/init.js');
      await initCommand(taskName);
    } catch (err) {
      handleError(err);
    }
  });

program
  .command('add')
  .description('Add training examples')
  .option('-i, --input <file>', 'Input file path')
  .option('-o, --output <file>', 'Output file path')
  .option('-d, --dir <directory>', 'Bulk import from directory')
  .action(async (options: { input?: string; output?: string; dir?: string }) => {
    try {
      const { addCommand } = await import('./commands/add.js');
      await addCommand(options);
    } catch (err) {
      handleError(err);
    }
  });

program
  .command('train')
  .description('Train a model from your samples')
  .action(async () => {
    try {
      const { trainCommand } = await import('./commands/train.js');
      await trainCommand();
    } catch (err) {
      handleError(err);
    }
  });

program
  .command('run [input]')
  .description('Run inference on input text or files')
  .action(async (input?: string) => {
    try {
      const { runCommand } = await import('./commands/run.js');
      await runCommand(input);
    } catch (err) {
      handleError(err);
    }
  });

program
  .command('review')
  .description('Open the review UI to score model predictions')
  .action(async () => {
    try {
      const { reviewCommand } = await import('./commands/review.js');
      await reviewCommand();
    } catch (err) {
      handleError(err);
    }
  });

program
  .command('retrain')
  .description('Retrain the model using review feedback')
  .action(async () => {
    try {
      const { retrainCommand } = await import('./commands/retrain.js');
      await retrainCommand();
    } catch (err) {
      handleError(err);
    }
  });

program
  .command('stats')
  .description('Show project statistics')
  .action(async () => {
    try {
      const { statsCommand } = await import('./commands/stats.js');
      await statsCommand();
    } catch (err) {
      handleError(err);
    }
  });

program
  .command('export <output-dir>')
  .description('Export model for standalone use')
  .action(async (outputDir: string) => {
    try {
      const { exportCommand } = await import('./commands/export.js');
      await exportCommand(outputDir);
    } catch (err) {
      handleError(err);
    }
  });

function handleError(err: unknown): void {
  if (err instanceof Error) {
    error(err.message);
  } else {
    error(String(err));
  }
  process.exit(1);
}

program.parse();
