# Contributing to Expressible CLI

Thanks for your interest in contributing.

## Getting Started

```bash
git clone https://github.com/expressible-ai/expressible-cli.git
cd expressible-cli
npm install
npm run build
npm test
```

Requires Node.js 18+.

## Making Changes

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `npm run build` and `npm test` to verify nothing is broken
4. Submit a pull request

## What We're Looking For

- Bug fixes with a clear description of the problem
- Test improvements and new benchmark scenarios
- Documentation fixes

For larger changes or new features, open an issue first to discuss the approach.

## Code Style

- TypeScript, ES modules
- Run `npm run build` to check for type errors before submitting

## Tests

```bash
npm test                        # Unit tests
npx tsx tests/harness/run.ts    # Benchmark harness
```

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.
