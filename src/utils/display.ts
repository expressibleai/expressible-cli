import chalk from 'chalk';

export function success(message: string): void {
  console.log(chalk.green('✓') + ' ' + message);
}

export function error(message: string): void {
  console.error(chalk.red('✗') + ' ' + message);
}

export function warn(message: string): void {
  console.log(chalk.yellow('⚠') + ' ' + message);
}

export function info(message: string): void {
  console.log(chalk.blue('ℹ') + ' ' + message);
}

export function heading(message: string): void {
  console.log('\n' + chalk.bold(message));
}

export function dim(message: string): void {
  console.log(chalk.dim(message));
}

export function table(rows: [string, string][]): void {
  const maxKeyLen = Math.max(...rows.map(([key]) => key.length));
  for (const [key, value] of rows) {
    console.log(`  ${chalk.dim(key.padEnd(maxKeyLen))}  ${value}`);
  }
}

export function progressBar(current: number, total: number, width: number = 30): string {
  const fraction = Math.min(current / total, 1);
  const filled = Math.round(fraction * width);
  const empty = width - filled;
  const bar = chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
  const pct = Math.round(fraction * 100);
  return `${bar} ${pct}% (${current}/${total})`;
}
