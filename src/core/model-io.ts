import fs from 'node:fs';
import path from 'node:path';

/**
 * Custom file system IO handler for TensorFlow.js model save/load.
 * Works with both @tensorflow/tfjs-node and pure @tensorflow/tfjs,
 * avoiding the file:// URL scheme which is only handled by tfjs-node.
 *
 * The returned object implements TF's IOHandler interface:
 *   save(modelArtifacts) → writes model.json + weights.bin to modelDir
 *   load()              → reads model.json + weights.bin from modelDir
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fileIOHandler(modelDir: string): any {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async save(modelArtifacts: any) {
      const weightsPath = path.join(modelDir, 'weights.bin');
      if (modelArtifacts.weightData) {
        const data = Array.isArray(modelArtifacts.weightData)
          ? Buffer.concat(modelArtifacts.weightData.map((b: ArrayBuffer) => Buffer.from(b)))
          : Buffer.from(modelArtifacts.weightData);
        fs.writeFileSync(weightsPath, data);
      }

      const modelJson: Record<string, unknown> = {
        modelTopology: modelArtifacts.modelTopology,
        format: modelArtifacts.format,
        generatedBy: modelArtifacts.generatedBy,
        convertedBy: modelArtifacts.convertedBy,
      };

      if (modelArtifacts.weightSpecs) {
        modelJson.weightsManifest = [
          {
            paths: ['weights.bin'],
            weights: modelArtifacts.weightSpecs,
          },
        ];
      }

      fs.writeFileSync(
        path.join(modelDir, 'model.json'),
        JSON.stringify(modelJson),
        'utf-8'
      );

      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: 'JSON' as const,
        },
      };
    },

    async load() {
      const modelJsonPath = path.join(modelDir, 'model.json');
      const modelJson = JSON.parse(fs.readFileSync(modelJsonPath, 'utf-8'));

      const weightSpecs: { name: string; shape: number[]; dtype: string }[] = [];
      const weightBuffers: Buffer[] = [];

      for (const group of modelJson.weightsManifest) {
        for (const weightPath of group.paths) {
          weightBuffers.push(fs.readFileSync(path.join(modelDir, weightPath)));
        }
        weightSpecs.push(...group.weights);
      }

      const totalLength = weightBuffers.reduce((sum, b) => sum + b.length, 0);
      const weightData = new ArrayBuffer(totalLength);
      const view = new Uint8Array(weightData);
      let offset = 0;
      for (const buf of weightBuffers) {
        view.set(buf, offset);
        offset += buf.length;
      }

      return {
        modelTopology: modelJson.modelTopology,
        weightSpecs,
        weightData,
        format: modelJson.format,
        generatedBy: modelJson.generatedBy,
        convertedBy: modelJson.convertedBy,
      };
    },
  };
}
