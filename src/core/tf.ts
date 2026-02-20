import { warn } from '../utils/display.js';

type TF = typeof import('@tensorflow/tfjs-node');

let tfInstance: TF | null = null;

export async function loadTf(): Promise<TF> {
  if (tfInstance) return tfInstance;

  try {
    tfInstance = await import('@tensorflow/tfjs-node');
    return tfInstance;
  } catch {
    warn('Native TensorFlow bindings unavailable. Using pure JS fallback (slower).');
    try {
      tfInstance = await import('@tensorflow/tfjs') as unknown as TF;
      return tfInstance;
    } catch {
      throw new Error(
        'Could not load TensorFlow.js. Run "npm install" in the project directory, or run "expressible distill doctor" to diagnose.'
      );
    }
  }
}
