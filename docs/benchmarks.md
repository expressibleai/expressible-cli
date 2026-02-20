# Benchmarks

Accuracy benchmarks for Distill, measured using a scripted test harness with held-out test data across multiple scenarios. Includes both synthetic test data and public ML datasets for independent verification.

## Results

### Classification — Synthetic Scenarios

| Scenario | Train | Test | Accuracy | Avg Confidence |
|---|---|---|---|---|
| News categorization | 50 | 25 | **96.0%** | 84.5% |
| Support ticket routing | 51 | 20 | **90.0%** | 92.9% |
| Content moderation | 50 | 20 | **90.0%** | 87.9% |
| Sentiment analysis | 50 | 20 | 55.0% | 58.0% |

### Classification — Public Datasets

| Dataset | Categories | Train | Test | Accuracy | Avg Confidence |
|---|---|---|---|---|---|
| [20 Newsgroups](http://qwone.com/~jason/20Newsgroups/) | 5 | 50 | 23 | **87.0%** | 79.0% |
| [AG News](https://huggingface.co/datasets/fancyzhx/ag_news) | 4 | 50 | 25 | **76.0%** | 76.4% |
| [SST-2](https://huggingface.co/datasets/stanfordnlp/sst2) | 2 | 50 | 25 | 56.0% | 55.8% |

### Classification Overall

| Group | Correct | Total | Accuracy |
|---|---|---|---|
| Synthetic (excl. sentiment) | 60 | 65 | **92.3%** |
| Public datasets (excl. SST-2) | 39 | 48 | **81.3%** |
| All classification | 124 | 158 | **78.5%** |

Classification works well for tasks with semantically distinct categories (support tickets, content types, news topics, newsgroup subjects). It struggles with sentiment and tone, where the underlying meaning of text is similar across categories and only the evaluative framing differs.

### Extraction and Transformation

| Scenario | Train | Test | Accuracy | Avg Confidence |
|---|---|---|---|---|
| Email field extraction | 20 | 10 | 0.0% | 39.4% |
| Complaint response generation | 20 | 10 | 10.0% | 40.2% |

Extract and transform tasks use a retrieval-based approach (nearest-neighbor lookup) that returns stored outputs from the closest training example. This cannot generalize to unseen inputs. These task types are experimental.

## Methodology

Each scenario uses:

- **Training set**: 50 labeled examples (20 for extract/transform) with balanced class distribution
- **Test set**: 20-25 held-out examples the model has never seen, including deliberate edge cases
- **Embeddings**: [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) sentence embeddings (384-dimensional)
- **Classification model**: Two-layer neural network (128 + 64 units, ReLU, dropout 0.2, softmax output) trained with early stopping
- **Scoring**: Exact label match for classification. For extraction, >50% of JSON fields must match. For transformation, confidence threshold of 0.5.

Training and test data are fully separated. No test input appears in the training set.

### Public dataset sources

The public dataset benchmarks use real data from established ML benchmarks. Samples are included in the repository for reproducibility.

- **AG News** — News articles classified into World, Sports, Business, Sci/Tech. Sourced from the [fancyzhx/ag_news](https://huggingface.co/datasets/fancyzhx/ag_news) dataset on HuggingFace. 50 training samples from the train split, 25 test samples from the test split.
- **SST-2** — Movie review sentences classified as positive or negative. Sourced from the [stanfordnlp/sst2](https://huggingface.co/datasets/stanfordnlp/sst2) dataset on HuggingFace (part of the GLUE benchmark). 50 training samples from the train split, 25 test samples from the validation split.
- **20 Newsgroups** — Newsgroup posts classified into 5 categories (science, sports, politics, computers, autos) selected from the full 20-category dataset. Sourced from the [SetFit/20_newsgroups](https://huggingface.co/datasets/SetFit/20_newsgroups) dataset on HuggingFace. Email headers stripped, text truncated to 500 characters.

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
- More training data generally improves accuracy — these benchmarks use modest dataset sizes (50 samples) to reflect realistic early usage
- Classification accuracy improves with the review-retrain loop, which is not captured in these one-shot benchmarks
- Sentiment/tone classification is a known weak spot — the embedding model captures semantic meaning, not evaluative framing
