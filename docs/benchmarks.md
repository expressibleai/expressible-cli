# Benchmarks

Accuracy benchmarks for Distill, measured using a scripted test harness with held-out test data across multiple real-world scenarios.

## Results

### Classification

| Scenario | Train | Test | Accuracy | Avg Confidence |
|---|---|---|---|---|
| Content moderation | 50 | 20 | **95.0%** | 90.9% |
| Support ticket routing | 51 | 20 | **90.0%** | 95.0% |
| News categorization | 50 | 25 | **84.0%** | 76.3% |
| Sentiment analysis | 50 | 20 | **65.0%** | 68.1% |
| **Overall** | | **85** | **83.5%** | |

Three of four classification scenarios exceed 80% accuracy with only 50 training samples. Sentiment analysis scores lower because positive/negative/neutral categories overlap semantically more than the others.

### Extraction and Transformation

| Scenario | Train | Test | Accuracy | Avg Confidence |
|---|---|---|---|---|
| Email field extraction | 20 | 10 | 0.0% | 39.4% |
| Complaint response generation | 20 | 10 | 10.0% | 40.2% |
| **Overall** | | **20** | **5.0%** | |

Extract and transform tasks use a retrieval-based approach (nearest-neighbor lookup) that returns stored outputs from the closest training example. This works when test inputs closely match training data but cannot generalize to unseen inputs. These task types are experimental.

## Methodology

Each scenario uses:

- **Training set**: 50 labeled examples (20 for extract/transform) with balanced class distribution
- **Test set**: 20-25 held-out examples the model has never seen, including deliberate edge cases
- **Embeddings**: [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) sentence embeddings (384-dimensional)
- **Classification model**: Two-layer neural network (128 + 64 units, ReLU, dropout 0.2, softmax output) trained with early stopping
- **Scoring**: Exact label match for classification. For extraction, >50% of JSON fields must match. For transformation, confidence threshold of 0.5.

Training and test data are fully separated. No test input appears in the training set.

## Scenarios

### Support ticket routing
Classify customer support messages into: billing, technical, account, shipping. Test set includes ambiguous tickets that straddle categories (e.g., shipping surcharges appearing on invoices).

### Sentiment analysis
Classify product reviews as positive, negative, or neutral. Test set includes sarcasm, backhanded compliments, and mixed reviews that lean one direction.

### Content moderation
Classify user-generated content as safe, offensive, or spam. Test set includes aggressive-but-safe disagreements, frustrated venting about companies, and borderline self-promotion.

### News categorization
Classify news headlines into: politics, sports, technology, entertainment, business. Test set includes cross-category edge cases like esports (sports vs technology), tech company IPOs (technology vs business), and political documentaries (politics vs entertainment).

### Email field extraction
Extract sender, subject, date, and intent from raw email text as structured JSON. Test set includes forwarded emails, missing headers, and multi-level reply chains.

### Complaint response generation
Generate professional, empathetic responses to customer complaints. Test set uses entirely different complaint scenarios from training.

## Run It Yourself

The test harness and all fixture data are included in the repository.

```bash
npx tsx tests/harness/run.ts
```

This will:
1. Load training and test data from `tests/harness/fixtures/`
2. Create temporary projects for each scenario
3. Embed training data, train models, and run predictions on held-out test inputs
4. Print per-scenario results with failure details and a summary table

Fixture data is in `tests/harness/fixtures/<scenario>/train.json` and `test.json`. Each file contains an array of `{ "input": "...", "output": "..." }` objects.

To add your own scenario, create a new directory under `tests/harness/fixtures/` with `train.json` and `test.json`, then add the scenario to the `SCENARIOS` array in `tests/harness/run.ts`.

## Notes

- Results vary slightly between runs due to random weight initialization and train/validation splits
- More training data generally improves accuracy — these benchmarks use modest dataset sizes to reflect realistic early usage
- Classification accuracy improves significantly with the review-retrain loop, which is not captured in these one-shot benchmarks
