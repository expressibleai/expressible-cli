import fs from 'node:fs';
import path from 'node:path';
import { getModelDir, ensureDir } from '../utils/paths.js';
import { EMBEDDING_DIM } from './embeddings.js';
import { loadTf } from './tf.js';
import { fileIOHandler } from './model-io.js';
import { info, warn, success } from '../utils/display.js';

interface ClassifierMetadata {
  type: 'classifier';
  categories: string[];
  trainedAt: string;
  numSamples: number;
  accuracy: number;
  epochs: number;
}

export interface TrainResult {
  accuracy: number;
  valAccuracy: number;
  epochs: number;
  numSamples: number;
  categories: string[];
}

export async function trainClassifier(
  embeddings: number[][],
  labels: string[],
  taskDir: string
): Promise<TrainResult> {
  const tf = await loadTf();

  const categories = Array.from(new Set(labels)).sort();
  const numCategories = categories.length;

  // Check for underrepresented classes
  const classCounts = new Map<string, number>();
  for (const label of labels) {
    classCounts.set(label, (classCounts.get(label) ?? 0) + 1);
  }
  for (const [category, count] of classCounts) {
    if (count < 3) {
      warn(
        `Category "${category}" has only ${count} example(s). Consider adding at least 3 examples per category.`
      );
    }
  }

  // Convert labels to one-hot
  const labelIndices = labels.map((l) => categories.indexOf(l));
  const oneHot = labelIndices.map((idx) => {
    const arr = new Array(numCategories).fill(0) as number[];
    arr[idx] = 1;
    return arr;
  });

  // For small datasets (<30), use 90/10 split to keep more training data
  // For larger datasets, use standard 80/20
  const valFraction = embeddings.length < 30 ? 0.1 : 0.2;
  const numVal = Math.max(1, Math.floor(embeddings.length * valFraction));
  const numTrain = embeddings.length - numVal;

  // Shuffle indices
  const indices = Array.from({ length: embeddings.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const trainIndices = indices.slice(0, numTrain);
  const valIndices = indices.slice(numTrain);

  const trainX = tf.tensor2d(trainIndices.map((i) => embeddings[i]));
  const trainY = tf.tensor2d(trainIndices.map((i) => oneHot[i]));
  const valX = tf.tensor2d(valIndices.map((i) => embeddings[i]));
  const valY = tf.tensor2d(valIndices.map((i) => oneHot[i]));

  // Build model
  const model = tf.sequential();
  model.add(
    tf.layers.dense({
      inputShape: [EMBEDDING_DIM],
      units: 128,
      activation: 'relu',
    })
  );
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(
    tf.layers.dense({
      units: 64,
      activation: 'relu',
    })
  );
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(
    tf.layers.dense({
      units: numCategories,
      activation: 'softmax',
    })
  );

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  info(`Training classifier with ${numTrain} samples, validating on ${numVal}...`);

  // Train with early stopping logic
  let bestValLoss = Infinity;
  let patienceCounter = 0;
  const patience = 10;
  let bestEpoch = 0;
  const maxEpochs = 100;

  let finalAccuracy = 0;
  let finalValAccuracy = 0;
  let totalEpochs = 0;

  for (let epoch = 0; epoch < maxEpochs; epoch++) {
    const history = await model.fit(trainX, trainY, {
      epochs: 1,
      validationData: [valX, valY],
      verbose: 0,
    });

    const h = history.history;
    const valLoss = (h['val_loss']?.[0] ?? h['val_Loss']?.[0] ?? 0) as number;
    const valAcc = (h['val_acc']?.[0] ?? h['val_accuracy']?.[0] ?? 0) as number;
    const trainAcc = (h['acc']?.[0] ?? h['accuracy']?.[0] ?? 0) as number;

    finalAccuracy = trainAcc;
    finalValAccuracy = valAcc;
    totalEpochs = epoch + 1;

    if (valLoss < bestValLoss) {
      bestValLoss = valLoss;
      patienceCounter = 0;
      bestEpoch = epoch;
    } else {
      patienceCounter++;
      if (patienceCounter >= patience) {
        info(`Early stopping at epoch ${epoch + 1} (best at epoch ${bestEpoch + 1})`);
        break;
      }
    }
  }

  // Save model
  const modelDir = getModelDir(taskDir);
  ensureDir(modelDir);

  await model.save(fileIOHandler(modelDir));

  // Save metadata
  const metadata: ClassifierMetadata = {
    type: 'classifier',
    categories,
    trainedAt: new Date().toISOString(),
    numSamples: embeddings.length,
    accuracy: finalValAccuracy,
    epochs: totalEpochs,
  };
  fs.writeFileSync(
    path.join(modelDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2) + '\n',
    'utf-8'
  );

  // Clean up tensors
  trainX.dispose();
  trainY.dispose();
  valX.dispose();
  valY.dispose();
  model.dispose();

  return {
    accuracy: finalAccuracy,
    valAccuracy: finalValAccuracy,
    epochs: totalEpochs,
    numSamples: embeddings.length,
    categories,
  };
}

export interface PredictionResult {
  category: string;
  confidence: number;
  allScores: { category: string; confidence: number }[];
}

export async function predict(
  embedding: number[],
  taskDir: string
): Promise<PredictionResult> {
  const tf = await loadTf();

  const modelDir = getModelDir(taskDir);
  const metadataPath = path.join(modelDir, 'metadata.json');

  if (!fs.existsSync(metadataPath)) {
    throw new Error('No trained model found. Run "expressible distill train" first.');
  }

  const metadata: ClassifierMetadata = JSON.parse(
    fs.readFileSync(metadataPath, 'utf-8')
  );

  const model = await tf.loadLayersModel(fileIOHandler(modelDir));

  const inputTensor = tf.tensor2d([embedding]);
  const output = model.predict(inputTensor) as ReturnType<typeof tf.tensor>;
  const scores = await output.data();

  const allScores = metadata.categories.map((category, i) => ({
    category,
    confidence: scores[i],
  }));
  allScores.sort((a, b) => b.confidence - a.confidence);

  const best = allScores[0];

  inputTensor.dispose();
  output.dispose();
  model.dispose();

  return {
    category: best.category,
    confidence: best.confidence,
    allScores,
  };
}
