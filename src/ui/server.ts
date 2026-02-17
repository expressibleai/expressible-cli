import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { saveValidationResults } from '../core/data.js';
import { success, info, error } from '../utils/display.js';
import type { ValidationResults, ValidationResult } from '../core/data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startReviewServer(
  taskDir: string,
  results: ValidationResults
): Promise<void> {
  const app = express();
  app.use(express.json());

  // Serve static files
  const staticDir = path.join(__dirname, 'static');
  app.use(express.static(staticDir));

  // API: get all items
  app.get('/api/items', (_req, res) => {
    res.json(results.items);
  });

  // API: score an item
  app.post('/api/score', (req, res) => {
    const { id, approved, correctedOutput } = req.body as {
      id: string;
      approved: boolean;
      correctedOutput?: string;
    };

    const item = results.items.find((i) => i.id === id);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    item.approved = approved;
    item.reviewedAt = new Date().toISOString();
    if (correctedOutput !== undefined) {
      item.correctedOutput = correctedOutput;
    }

    saveValidationResults(taskDir, results);
    res.json({ ok: true });
  });

  // API: get stats
  app.get('/api/stats', (_req, res) => {
    const total = results.items.length;
    const reviewed = results.items.filter((i) => i.reviewedAt).length;
    const approved = results.items.filter((i) => i.approved === true).length;
    const rejected = results.items.filter(
      (i) => i.reviewedAt && i.approved === false
    ).length;
    const approvalRate = reviewed > 0 ? (approved / reviewed) * 100 : 0;

    res.json({
      total,
      reviewed,
      approved,
      rejected,
      approvalRate: Math.round(approvalRate * 10) / 10,
      remaining: total - reviewed,
    });
  });

  // API: shutdown
  app.post('/api/shutdown', (_req, res) => {
    res.json({ ok: true });
    info('Review session ended.');
    setTimeout(() => process.exit(0), 500);
  });

  const defaultPort = 3847;
  const server = createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        // Try next port
        server.listen(defaultPort + 1, () => resolve());
      } else {
        reject(err);
      }
    });
    server.listen(defaultPort, () => resolve());
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : defaultPort;
  const url = `http://localhost:${port}`;

  success(`Review server running at ${url}`);
  info('Press Ctrl+C to stop the server.');

  // Try to open browser
  try {
    const openModule = await import('open');
    await openModule.default(url);
  } catch {
    info(`Open ${url} in your browser to start reviewing.`);
  }

  // Handle graceful shutdown
  const shutdown = (): void => {
    info('\nShutting down review server...');
    server.close(() => {
      success('Server stopped. Review results saved.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
