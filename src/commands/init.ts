import fs from 'node:fs';
import path from 'node:path';
import inquirer from 'inquirer';
import { getTaskDir, getSamplesDir, getModelDir, getValidationDir, getInternalDir, ensureDir } from '../utils/paths.js';
import { writeConfig, type TaskType, type DistillConfig } from '../core/config.js';
import { success, error, info } from '../utils/display.js';

export async function initCommand(taskName: string): Promise<void> {
  const taskDir = getTaskDir(taskName);

  if (fs.existsSync(taskDir) && fs.readdirSync(taskDir).length > 0) {
    error(`Directory "${taskName}" already exists and is not empty.`);
    process.exit(1);
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'What type of task is this?',
      choices: [
        { name: 'classify — input text → one of N categories', value: 'classify' },
        { name: 'extract  — input text → structured data (JSON)', value: 'extract' },
        { name: 'transform — input text → output text', value: 'transform' },
      ],
    },
    {
      type: 'input',
      name: 'description',
      message: 'Brief description of this task (optional):',
      default: '',
    },
  ]);

  // Create directory structure
  ensureDir(taskDir);
  ensureDir(getSamplesDir(taskDir));
  ensureDir(getModelDir(taskDir));
  ensureDir(getValidationDir(taskDir));
  ensureDir(getInternalDir(taskDir));

  const config: DistillConfig = {
    name: taskName,
    type: answers.type as TaskType,
    description: answers.description,
    createdAt: new Date().toISOString(),
    version: '1.0.0',
  };

  writeConfig(taskDir, config);

  success(`Created distill project "${taskName}" (${answers.type})`);
  info(`Add training examples with: cd ${taskName} && distill add`);
}
