import fs from 'node:fs';
import { getConfigPath } from '../utils/paths.js';

export type TaskType = 'classify';

export interface DistillConfig {
  name: string;
  type: TaskType;
  description: string;
  createdAt: string;
  version: string;
}

export function readConfig(taskDir: string): DistillConfig {
  const configPath = getConfigPath(taskDir);
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `No distill.config.json found in ${taskDir}. Are you in a distill project directory?`
    );
  }
  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw) as DistillConfig;
}

export function writeConfig(taskDir: string, config: DistillConfig): void {
  const configPath = getConfigPath(taskDir);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}
