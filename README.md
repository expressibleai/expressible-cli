# Expressible CLI

Open-source developer tools by [Expressible AI, Inc.](https://expressible.ai)

The Expressible CLI provides local-first tooling for AI workflows where data sovereignty matters. It is part of the [Expressible platform](https://gen.expressible.ai) for secure, end-to-end software delivery.

---

## Distill

Train small, task-specific ML models from input/output examples. Runs entirely on your machine. Your data never leaves your environment.

![Expressible Distill demo](demo.svg)

Classified locally. No API call. Model is ~230KB on disk.

No cloud. No API keys. No external calls. No ML expertise required.

---

### Get to this in 5 minutes

```bash
npm install -g expressible
```

**1. Create a project**

```bash
expressible distill init clause-detector
cd clause-detector
```

**2. Add labeled examples**

Provide contract clauses labeled by type — from your own review history, from past LLM outputs, or hand-labeled by your legal team:

```bash
# Import from a JSON file
expressible distill add --file ./labeled-clauses.json

# Bulk import from a directory of labeled pairs
expressible distill add --dir ./labeled-clauses/

# Or add one at a time
expressible distill add
# Paste: "For 24 months after closing, Seller shall not own or operate
#          any business competitive with the Business in the Territory."
# Label: non-compete
```

The JSON file should contain an array of `{ "input": "...", "output": "..." }` objects.

You need at least 10 labeled examples. 50+ gives strong results.

**3. Train**

```bash
expressible distill train
```

```
Training classify model "clause-detector"
ℹ 87 training samples loaded
ℹ Categories: non-compete, indemnification, limitation-of-liability,
              change-of-control, termination-for-convenience
ℹ Training classifier with 78 samples, validating on 9...
ℹ Early stopping at epoch 34

Training Complete
  Samples              87
  Validation accuracy  93.2%
  Time elapsed         2.8s

✓ Model saved to model/
```

**4. Run**

```bash
expressible distill run "Either party may terminate this Agreement at any time
  for any reason by providing 90 days written notice"
```

```json
{
  "output": "termination-for-convenience",
  "confidence": 0.94
}
```

That ran locally. No network call. The contract text never left your machine.

**5. Review and improve**

```bash
expressible distill review
```

Opens a local web UI where you review predictions, correct mistakes, and approve results. Then:

```bash
expressible distill retrain
# → Previous accuracy: 89% → New accuracy: 94% (improved by 5%)
```

**6. Export for production**

```bash
expressible distill export ./deploy/
# Generates standalone inference.js + model files
# No expressible CLI needed — just Node.js and the model
```

---

### What Stays on Your Machine

Everything.

- Training data never leaves your filesystem
- The embedding model runs locally — no API calls, ever
- Trained models are files you own and control
- The review UI runs on localhost
- Zero telemetry. Zero analytics. Zero phone-home.

---

### Use Cases

**Legal document review** — Classify contract clauses by type across thousands of agreements. Privileged documents stay within your perimeter.

**Log analysis and alerting** — Classify application logs as normal, warning, error, security event, or performance degradation. Thousands per hour, entirely local.

**Content moderation** — Classify user-generated content against your community guidelines. Consistent categories, high volume.

**Support ticket routing** — Route incoming tickets to the right team by category. Same classification task, repeated thousands of times.

---

### Benchmarks

With 50 labeled examples (~30 minutes of work), no API keys, and no ML expertise:

| Scenario | Accuracy | Data Source |
|---|---|---|
| Support ticket routing (4 categories) | 95.0% | Synthetic |
| Content moderation (3 categories) | 90.0% | Synthetic |
| News categorization (5 categories) | 88.0% | Synthetic |
| 20 Newsgroups (5 categories) | 80.0% | [Public dataset](https://huggingface.co/datasets/SetFit/20_newsgroups) |
| AG News (4 categories) | 64.0% | [Public dataset](https://huggingface.co/datasets/fancyzhx/ag_news) |

AG News improves to 80% with 100 training samples. More data helps — see [benchmarks](docs/benchmarks.md) for scaling details.

Public dataset results use real-world text from established ML benchmarks — 50 samples drawn from datasets containing 120,000+ entries. All samples and the test harness are included in the repo so you can reproduce these results:

```bash
npx tsx tests/harness/run.ts
```

Accuracy improves as you add more examples through the review-retrain loop. Full results, methodology, and known limitations: **[docs/benchmarks.md](docs/benchmarks.md)**

---

### Built for Environments Where Data Stays Internal

- Healthcare teams handling patient records
- Financial services processing sensitive transactions
- Government contractors with data residency requirements
- Legal teams working with privileged documents
- Any organization with data sovereignty obligations

---

### Task Type

Distill trains **classification** models: text in, one of N categories out.

| Type | Input → Output | Example |
|------|---------------|---------|
| **classify** | Text → one of N categories | Contract clause → `indemnification` |

### Commands

```
expressible distill init <name>     Create a new project
expressible distill add             Add training examples (interactive, file, or bulk)
expressible distill train           Train a model from your samples
expressible distill run <input>     Run inference on text or files
expressible distill review          Open web UI to review and correct predictions
expressible distill retrain         Retrain using review feedback
expressible distill stats           Show project statistics
expressible distill export <dir>    Export model for standalone use
expressible distill doctor          Check system requirements and project health
expressible distill setup           Pre-download embedding model for offline use
```

### What You Need

- Node.js 18+
- ~200MB disk space (embedding model + trained model)
- No Python, no GPU, no Docker

---

### FAQ

**Is this a replacement for LLMs?**
No. This replaces the *repetitive, pattern-based* subset of LLM calls — the ones where the same prompt structure processes different data every time. For tasks that require reasoning, creativity, or open-ended generation, you still want an LLM.

**How many examples do I need?**
10 minimum. In practice, 50–100 examples with good coverage of your categories will give you strong results.

**How accurate is it?**
For well-defined classification tasks with clear categories and 50+ examples, 85–95% accuracy is typical. The review → retrain loop lets you improve iteratively.

**Does it work with non-English text?**
The underlying embedding model supports 100+ languages but is strongest in English. Performance varies by language. Test with your data.

**Can I use this in CI/CD?**
Yes. `expressible distill run` accepts file paths, globs, and piped stdin. Outputs JSON to stdout.

**Where does the language understanding come from?**
Distill uses a pre-trained sentence embedding model ([all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)) that runs locally. It converts text into numerical vectors that capture meaning. A small neural network trained on your examples learns to map those vectors to your labels. The embedding model downloads once (~80MB) and is cached. Everything after that is offline.

---

### Project Structure

```
my-task/
  distill.config.json        # Task configuration
  samples/                   # Training data (input/output pairs)
  model/                     # Trained model files
  validation/                # Review results
  .distill/                  # Embedding cache
```

---

### Expressible Platform

The CLI is the open-source, local-first layer of the Expressible platform. For teams that need governance, traceability, and managed deployment across AI-generated workloads, see [expressible.ai](https://expressible.ai).

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### License

Apache 2.0 — See [LICENSE](LICENSE)

Copyright 2026 Expressible AI, Inc.
