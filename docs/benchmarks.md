# Benchmarks

## What This Means for You

Label 50 examples. Train a model. Get 76–96% accuracy on text classification — with no API keys, no cloud, and no ML expertise.

These benchmarks measure what happens when you give Distill 50 labeled examples and test it on text it has never seen. That's roughly 30 minutes of labeling work. The public dataset results use real-world text from datasets containing 120,000+ entries — we only used 50 samples from each. Anyone can reproduce these numbers by cloning the repo and running the test harness.

Distill works best for **topic and domain classification** — deciding *what kind of thing* a piece of text is. It struggles with sentiment and tone, where the meaning is similar but the evaluation differs.

## Results

### Classification — Synthetic Scenarios

| Scenario | Train | Test | Accuracy | Avg Confidence |
|---|---|---|---|---|
| News categorization | 50 | 25 | **96.0%** | 84.5% |
| Support ticket routing | 51 | 20 | **90.0%** | 92.9% |
| Content moderation | 50 | 20 | **90.0%** | 87.9% |
| Sentiment analysis | 50 | 20 | 55.0% | 58.0% |

### Classification — Public Datasets

These use real text from established ML benchmarks. Samples are included in the repository.

| Dataset | Full Size | Train Used | Test | Accuracy | Avg Confidence |
|---|---|---|---|---|---|
| [20 Newsgroups](http://qwone.com/~jason/20Newsgroups/) (5 categories) | ~18,800 | 50 | 23 | **87.0%** | 79.0% |
| [AG News](https://huggingface.co/datasets/fancyzhx/ag_news) (4 categories) | 127,600 | 50 | 25 | **76.0%** | 76.4% |
| [SST-2](https://huggingface.co/datasets/stanfordnlp/sst2) (2 categories) | 68,221 | 50 | 25 | 56.0% | 55.8% |

### Classification Overall

| Group | Correct | Total | Accuracy |
|---|---|---|---|
| Synthetic (excl. sentiment) | 60 | 65 | **92.3%** |
| Public datasets (excl. SST-2) | 39 | 48 | **81.3%** |
| All classification | 124 | 158 | **78.5%** |

### What works and what doesn't

**Works well (76–96%):** Tasks where categories are semantically distinct — the text is *about* different things. Support tickets about billing vs shipping. News about sports vs politics. Forum posts about cars vs space exploration. The embedding model captures topic differences effectively, and a small neural network learns the boundaries with minimal data.

**Doesn't work well (~55%):** Sentiment and tone classification. "This camera takes amazing photos" and "This camera takes terrible photos" are semantically almost identical — same topic, same structure. The embedding vectors land close together regardless of the evaluation. Both SST-2 (public dataset, 56%) and our synthetic sentiment scenario (55%) confirm this is a fundamental property of the approach, not a data issue.

## Methodology

Each scenario uses:

- **Training set**: 50 labeled examples with balanced class distribution
- **Test set**: 20–25 held-out examples the model has never seen, including deliberate edge cases
- **Embeddings**: [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) sentence embeddings (384-dimensional)
- **Classification model**: Two-layer neural network (128 + 64 units, ReLU, dropout 0.2, softmax output) trained with early stopping
- **Scoring**: Exact label match

Training and test data are fully separated. No test input appears in the training set.

### Public dataset sources

- **AG News** — Real news articles classified into World, Sports, Business, Sci/Tech. 127,600 articles from 2,000+ news sources. We used 50 training samples from the train split, 25 test samples from the test split. Source: [fancyzhx/ag_news](https://huggingface.co/datasets/fancyzhx/ag_news) on HuggingFace.
- **SST-2** — Real movie review sentences classified as positive or negative. 68,221 sentences from Rotten Tomatoes, annotated by Stanford researchers. We used 50 training samples from the train split, 25 test samples from the validation split. Source: [stanfordnlp/sst2](https://huggingface.co/datasets/stanfordnlp/sst2) on HuggingFace (part of the GLUE benchmark).
- **20 Newsgroups** — Real Usenet forum posts from 1993. ~18,800 posts across 20 newsgroups. We selected 5 categories (sci.space, rec.sport.baseball, talk.politics.mideast, comp.graphics, rec.autos), stripped email headers, and truncated to 500 characters. Source: [SetFit/20_newsgroups](https://huggingface.co/datasets/SetFit/20_newsgroups) on HuggingFace.

## Scenarios

### Support ticket routing
Classify customer support messages into: billing, technical, account, shipping. Test set includes ambiguous tickets that straddle categories (e.g., shipping surcharges appearing on invoices).

### Sentiment analysis
Classify product reviews as positive, negative, or neutral. Test set includes sarcasm, backhanded compliments, and mixed reviews that lean one direction.

### Content moderation
Classify user-generated content as safe, offensive, or spam. Test set includes aggressive-but-safe disagreements, frustrated venting about companies, and borderline self-promotion.

### News categorization
Classify news headlines into: politics, sports, technology, entertainment, business. Test set includes cross-category edge cases like esports (sports vs technology), tech company IPOs (technology vs business), and political documentaries (politics vs entertainment).

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
- Accuracy improves as you add more examples through the review-retrain loop — these benchmarks capture one-shot accuracy only
- You need at least 10 examples to start. 50+ gives the results shown here
- Sentiment/tone classification is a known limitation — the embedding model captures semantic meaning, not evaluative framing
